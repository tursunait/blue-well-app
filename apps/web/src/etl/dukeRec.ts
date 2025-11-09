import { prisma } from "@/lib/prisma";
import ical from "ical";

interface FitnessClassInput {
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  intensity?: "low" | "med" | "high";
  url?: string;
}

/**
 * Scrape Duke Rec MyRec portal for fitness classes
 * This attempts to fetch classes from the public calendar view
 */
async function scrapeMyRecClasses(
  from: Date,
  to: Date
): Promise<FitnessClassInput[]> {
  const classes: FitnessClassInput[] = [];
  
  try {
    // Try to find iCal feed first (if available)
    // Common iCal feed patterns for recreation centers:
    const possibleFeedUrls = [
      process.env.DUKE_REC_FEED_URL,
      "https://myrec.recreation.duke.edu/calendar/feed",
      "https://myrec.recreation.duke.edu/ical",
      "https://recreation.duke.edu/calendar/feed",
    ].filter(Boolean) as string[];

    for (const feedUrl of possibleFeedUrls) {
      try {
        const icalClasses = await parseICalFeed(feedUrl);
        classes.push(...icalClasses);
        console.log(`Successfully fetched ${icalClasses.length} classes from iCal feed: ${feedUrl}`);
        break; // Use first successful feed
      } catch (error) {
        console.log(`Failed to fetch from ${feedUrl}, trying next...`);
        continue;
      }
    }

    // If no iCal feed works, try web scraping
    if (classes.length === 0) {
      console.log("No iCal feed available, attempting web scraping...");
      const scrapedClasses = await scrapeMyRecWebsite(from, to);
      classes.push(...scrapedClasses);
    }
  } catch (error) {
    console.error("Error scraping MyRec classes:", error);
    throw error;
  }

  return classes;
}

/**
 * Scrape MyRec website for fitness classes
 * Note: This is a basic implementation. The actual website structure may require adjustments.
 */
async function scrapeMyRecWebsite(
  from: Date,
  to: Date
): Promise<FitnessClassInput[]> {
  const classes: FitnessClassInput[] = [];
  
  try {
    // MyRec portal URL - we'll need to access the public calendar or API
    const baseUrl = "https://myrec.recreation.duke.edu";
    
    // Try to fetch from public calendar endpoints
    // Common patterns: /api/classes, /calendar/classes, /programs/fitness
    const possibleEndpoints = [
      "/api/classes",
      "/calendar/classes",
      "/programs/fitness/classes",
      "/group-fitness/schedule",
    ];

    for (const endpoint of possibleEndpoints) {
      try {
        const url = `${baseUrl}${endpoint}`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; BlueWell/1.0)",
            "Accept": "application/json",
          },
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          
          if (contentType?.includes("application/json")) {
            const data = await response.json();
            // Parse JSON response (structure may vary)
            const parsed = parseMyRecJSON(data, from, to);
            if (parsed.length > 0) {
              classes.push(...parsed);
              console.log(`Successfully fetched ${parsed.length} classes from ${url}`);
              break;
            }
          } else if (contentType?.includes("text/calendar") || contentType?.includes("text/plain")) {
            // It's an iCal feed
            const text = await response.text();
            const data = ical.parseICS(text);
            const parsed = parseICalData(data);
            if (parsed.length > 0) {
              classes.push(...parsed);
              console.log(`Successfully parsed ${parsed.length} classes from iCal at ${url}`);
              break;
            }
          }
        }
      } catch (error) {
        console.log(`Failed to fetch from ${endpoint}:`, error);
        continue;
      }
    }

    // If no API endpoints work, log a warning
    if (classes.length === 0) {
      console.warn(
        "Could not fetch classes from MyRec. " +
        "Please check if DUKE_REC_FEED_URL is set in .env.local, " +
        "or if the MyRec portal provides a public calendar feed."
      );
    }
  } catch (error) {
    console.error("Error scraping MyRec website:", error);
  }

  return classes;
}

/**
 * Parse iCal data structure
 */
function parseICalData(data: any): FitnessClassInput[] {
  const classes: FitnessClassInput[] = [];
  
  for (const key in data) {
    const event = data[key];
    if (event.type === "VEVENT" && event.start && event.end) {
      classes.push({
        title: event.summary || "Untitled Class",
        startTime: event.start as Date,
        endTime: event.end as Date,
        location: event.location,
        url: event.url,
        intensity: inferIntensity(event.summary || ""),
      });
    }
  }
  
  return classes;
}

/**
 * Parse MyRec JSON response (structure may vary)
 */
function parseMyRecJSON(data: any, from: Date, to: Date): FitnessClassInput[] {
  const classes: FitnessClassInput[] = [];
  
  // Handle different possible JSON structures
  const items = Array.isArray(data) ? data : 
                data.classes ? data.classes :
                data.events ? data.events :
                data.items ? data.items : [];
  
  for (const item of items) {
    try {
      const startTime = new Date(item.start || item.startTime || item.start_date);
      const endTime = new Date(item.end || item.endTime || item.end_date || 
                               new Date(startTime.getTime() + 60 * 60 * 1000)); // Default 1 hour
      
      // Filter by date range
      if (startTime >= from && startTime <= to) {
        classes.push({
          title: item.title || item.name || item.class_name || "Untitled Class",
          startTime,
          endTime,
          location: item.location || item.venue || item.facility,
          url: item.url || item.link || item.registration_url,
          intensity: inferIntensity(item.title || item.name || item.class_name || ""),
        });
      }
    } catch (error) {
      console.warn("Error parsing class item:", item, error);
      continue;
    }
  }
  
  return classes;
}

/**
 * Parse iCal feed and extract fitness classes
 */
async function parseICalFeed(url: string): Promise<FitnessClassInput[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BlueWell/1.0)",
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch iCal feed: ${response.status} ${response.statusText}`);
  }
  
  const text = await response.text() as string;
  const data = ical.parseICS(text);
  
  return parseICalData(data);
}

/**
 * Infer intensity from class title
 */
function inferIntensity(title: string): "low" | "med" | "high" | undefined {
  const lower = title.toLowerCase();
  if (lower.includes("yoga") || lower.includes("stretch") || lower.includes("meditation")) {
    return "low";
  }
  if (lower.includes("hiit") || lower.includes("intense") || lower.includes("cardio")) {
    return "high";
  }
  return "med";
}

/**
 * Sync Duke Rec classes from feed or website
 */
export async function syncDukeRec(
  from: Date = new Date(),
  to: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  try {
    // Try to fetch classes from iCal feed or website scraping
    const classes = await scrapeMyRecClasses(from, to);
    
    // Filter classes in the time range (already filtered in scrapeMyRecClasses, but double-check)
    const filteredClasses = classes.filter(
      (cls) => cls.startTime >= from && cls.startTime <= to
    );
    
    console.log(`Found ${filteredClasses.length} classes to sync`);
    
    for (const cls of filteredClasses) {
      // Dedupe by title + startTime + source
      const existing = await prisma.fitnessClass.findFirst({
        where: {
          title: cls.title,
          startTime: cls.startTime,
          source: "DUKE_REC",
        },
      });
      
      if (existing) {
        // Update existing
        await prisma.fitnessClass.update({
          where: { id: existing.id },
          data: {
            endTime: cls.endTime,
            location: cls.location,
            intensity: cls.intensity,
            url: cls.url,
            updatedAt: new Date(),
          },
        });
        updated++;
      } else {
        // Create new
        await prisma.fitnessClass.create({
          data: {
            title: cls.title,
            startTime: cls.startTime,
            endTime: cls.endTime,
            location: cls.location,
            intensity: cls.intensity,
            url: cls.url,
            source: "DUKE_REC",
          },
        });
        created++;
      }
    }
    
    console.log(`Sync complete: ${created} created, ${updated} updated, ${skipped} skipped`);
  } catch (error) {
    console.error("Error syncing Duke Rec classes:", error);
    // Don't throw - allow the app to continue even if sync fails
    console.warn("Continuing without Duke Rec classes. Check DUKE_REC_FEED_URL or website access.");
  }
  
  return { created, updated, skipped };
}

