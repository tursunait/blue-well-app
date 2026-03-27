import fs from "fs";
import path from "path";

export interface FitnessClassCSV {
  date: string;
  startTime: string | null;
  allDay: boolean;
  title: string;
  location: string;
}

/**
 * Load fitness classes from CSV file
 * Falls back to database if CSV not available
 */
export async function loadFitnessClassesFromCSV(): Promise<FitnessClassCSV[]> {
  const possiblePaths = [
    path.join(process.cwd(), "..", "..", "data", "duke_rec_schedule.csv"), // From apps/web to root
    path.join(process.cwd(), "data", "duke_rec_schedule.csv"), // If running from root
    path.join(process.cwd(), "..", "data", "duke_rec_schedule.csv"), // If running from apps
  ];

  let csvPath: string | null = null;

  for (const possiblePath of possiblePaths) {
    const resolvedPath = path.isAbsolute(possiblePath)
      ? possiblePath
      : path.resolve(possiblePath);

    if (fs.existsSync(resolvedPath)) {
      csvPath = resolvedPath;
      break;
    }
  }

  if (!csvPath) {
    console.warn("duke_rec_schedule.csv not found, returning empty array");
    return [];
  }

  try {
    const csvText = fs.readFileSync(csvPath, "utf-8");
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return [];
    }

    // Parse header
    const headers = lines[0].split(",").map((h) => h.trim());
    const dateIdx = headers.indexOf("Date");
    const startTimeIdx = headers.indexOf("StartTime");
    const allDayIdx = headers.indexOf("AllDay");
    const titleIdx = headers.indexOf("Title");
    const locationIdx = headers.indexOf("Location");

    if (
      dateIdx === -1 ||
      startTimeIdx === -1 ||
      allDayIdx === -1 ||
      titleIdx === -1 ||
      locationIdx === -1
    ) {
      console.warn("CSV headers not found, returning empty array");
      return [];
    }

    // Parse rows
    const classes: FitnessClassCSV[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted fields)
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Last value

      if (values.length > Math.max(dateIdx, startTimeIdx, allDayIdx, titleIdx, locationIdx)) {
        const date = values[dateIdx] || "";
        const startTime = values[startTimeIdx] || null;
        const allDay = values[allDayIdx]?.toLowerCase() === "true";
        const title = values[titleIdx] || "";
        const location = values[locationIdx] || "";

        if (title) {
          classes.push({
            date,
            startTime,
            allDay,
            title,
            location,
          });
        }
      }
    }

    return classes;
  } catch (error) {
    console.error("Error loading CSV:", error);
    return [];
  }
}

/**
 * Filter classes by date and time preferences
 */
export function filterClassesByPreferences(
  classes: FitnessClassCSV[],
  preferredTimes?: string[],
  targetDate?: Date
): FitnessClassCSV[] {
  let filtered = [...classes];

  // Filter by date if targetDate provided
  if (targetDate) {
    const targetDateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD
    // Also try without timezone conversion in case dates are stored differently
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const altDateStr = `${year}-${month}-${day}`;
    
    filtered = filtered.filter((cls) => {
      // Handle both YYYY-MM-DD and other formats
      const clsDate = cls.date.trim();
      return clsDate === targetDateStr || clsDate === altDateStr || clsDate.startsWith(targetDateStr);
    });
  }

  // Filter by preferred times
  if (preferredTimes && preferredTimes.length > 0) {
    filtered = filtered.filter((cls) => {
      if (cls.allDay || !cls.startTime) return false;

      const timeStr = cls.startTime.trim().toLowerCase();
      
      // Parse time with regex to handle "5:00 PM" format
      const timeMatch = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (!timeMatch) return false;
      
      let hour = parseInt(timeMatch[1]) || 0;
      const ampm = timeMatch[3].toLowerCase();
      
      // Convert to 24-hour format
      if (ampm === "pm" && hour !== 12) {
        hour += 12;
      } else if (ampm === "am" && hour === 12) {
        hour = 0;
      }

      // Map preferred times to hours
      const timeMatches = preferredTimes.some((pref) => {
        const prefLower = pref.toLowerCase();
        if (prefLower.includes("morning")) {
          return hour >= 6 && hour < 12;
        }
        if (prefLower.includes("afternoon")) {
          return hour >= 12 && hour < 17;
        }
        if (prefLower.includes("evening") || prefLower.includes("night")) {
          return hour >= 17 && hour < 22;
        }
        return false;
      });

      return timeMatches;
    });
  }

  return filtered;
}

/**
 * Infer intensity from class title
 */
export function inferIntensityFromTitle(title: string): "low" | "med" | "high" {
  const lower = title.toLowerCase();
  if (
    lower.includes("yoga") ||
    lower.includes("stretch") ||
    lower.includes("recovery") ||
    lower.includes("pilates") ||
    lower.includes("meditation")
  ) {
    return "low";
  }
  if (
    lower.includes("hiit") ||
    lower.includes("cardio") ||
    lower.includes("cycle") ||
    lower.includes("spin") ||
    lower.includes("bootcamp")
  ) {
    return "high";
  }
  return "med";
}

