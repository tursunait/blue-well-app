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
 * Parse iCal feed and extract fitness classes
 */
async function parseICalFeed(url: string): Promise<FitnessClassInput[]> {
  const response = await fetch(url);
  const text = await response.text() as string;
  const data = ical.parseICS(text);
  
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
        // Infer intensity from title (simple heuristic)
        intensity: inferIntensity(event.summary || ""),
      });
    }
  }
  
  return classes;
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
 * Sync Duke Rec classes from feed
 */
export async function syncDukeRec(
  from: Date = new Date(),
  to: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
): Promise<{ created: number; updated: number; skipped: number }> {
  const feedUrl = process.env.DUKE_REC_FEED_URL;
  
  if (!feedUrl) {
    console.warn("DUKE_REC_FEED_URL not set, skipping sync");
    return { created: 0, updated: 0, skipped: 0 };
  }
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  try {
    const classes = await parseICalFeed(feedUrl);
    
    // Filter classes in the time range
    const filteredClasses = classes.filter(
      (cls) => cls.startTime >= from && cls.startTime <= to
    );
    
    for (const cls of filteredClasses) {
      // Dedupe by title + startTime
      const existing = await prisma.fitnessClass.findFirst({
        where: {
          title: cls.title,
          startTime: cls.startTime,
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
  } catch (error) {
    console.error("Error syncing Duke Rec classes:", error);
    throw error;
  }
  
  return { created, updated, skipped };
}

