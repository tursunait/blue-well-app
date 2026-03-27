/**
 * Idempotent CSV loader for Duke Rec schedule
 * Loads from data/duke_rec_schedule.csv and persists to FitnessClass table
 * Skips rows already present (idempotent)
 */

import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { loadFitnessClassesFromCSV, type FitnessClassCSV } from "@/lib/csv-loader";

/**
 * Import Duke Rec classes from CSV file to database
 * Idempotent: skips classes that already exist (by title + startTime + source)
 */
export async function importDukeRecCSV(): Promise<{
  created: number;
  updated: number;
  skipped: number;
}> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    // Load classes from CSV
    const csvClasses = await loadFitnessClassesFromCSV();
    
    if (csvClasses.length === 0) {
      console.warn("[dukeRecCSV] No classes found in CSV file");
      return { created: 0, updated: 0, skipped: 0 };
    }

    console.log(`[dukeRecCSV] Loaded ${csvClasses.length} classes from CSV`);

    for (const csvClass of csvClasses) {
      try {
        // Parse date and time
        let startTime: Date | null = null;
        let endTime: Date | null = null;

        if (csvClass.date && csvClass.startTime && !csvClass.allDay) {
          // Parse date (YYYY-MM-DD or similar)
          const dateStr = csvClass.date.trim();
          const timeStr = csvClass.startTime.trim();
          
          // Parse time (e.g., "5:00 PM" or "17:00")
          const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]) || 0;
            const minute = parseInt(timeMatch[2]) || 0;
            const ampm = timeMatch[3].toUpperCase();
            
            if (ampm === "PM" && hour !== 12) {
              hour += 12;
            } else if (ampm === "AM" && hour === 12) {
              hour = 0;
            }
            
            // Combine date and time
            const dateTimeStr = `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
            startTime = new Date(dateTimeStr);
            
            // Default end time: 1 hour after start
            endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
          } else {
            // Try ISO format or other formats
            const combined = `${dateStr} ${timeStr}`;
            startTime = new Date(combined);
            if (isNaN(startTime.getTime())) {
              console.warn(`[dukeRecCSV] Could not parse date/time: ${dateStr} ${timeStr}`);
              skipped++;
              continue;
            }
            endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
          }
        } else {
          // Skip all-day events or missing time
          skipped++;
          continue;
        }

        if (!startTime || isNaN(startTime.getTime())) {
          console.warn(`[dukeRecCSV] Invalid start time for class: ${csvClass.title}`);
          skipped++;
          continue;
        }

        // Check if class already exists (idempotent check)
        const existing = await prisma.fitnessClass.findFirst({
          where: {
            title: csvClass.title,
            startTime: startTime,
            source: "DUKE_REC",
          },
        });

        if (existing) {
          // Update existing (idempotent: update if changed)
          await prisma.fitnessClass.update({
            where: { id: existing.id },
            data: {
              endTime: endTime,
              location: csvClass.location || null,
              updatedAt: new Date(),
            },
          });
          updated++;
        } else {
          // Create new
          await prisma.fitnessClass.create({
            data: {
              title: csvClass.title,
              startTime: startTime,
              endTime: endTime,
              location: csvClass.location || null,
              intensity: inferIntensityFromTitle(csvClass.title),
              source: "DUKE_REC",
            },
          });
          created++;
        }
      } catch (error) {
        console.error(`[dukeRecCSV] Error processing class ${csvClass.title}:`, error);
        skipped++;
      }
    }

    console.log(`[dukeRecCSV] Import complete: ${created} created, ${updated} updated, ${skipped} skipped`);
    return { created, updated, skipped };
  } catch (error) {
    console.error("[dukeRecCSV] Error importing CSV:", error);
    throw error;
  }
}

/**
 * Infer intensity from class title
 */
function inferIntensityFromTitle(title: string): "low" | "med" | "high" | undefined {
  const titleLower = title.toLowerCase();
  if (titleLower.includes("yoga") || titleLower.includes("stretch") || titleLower.includes("meditation")) {
    return "low";
  }
  if (titleLower.includes("hiit") || titleLower.includes("cardio") || titleLower.includes("intense")) {
    return "high";
  }
  return "med";
}

