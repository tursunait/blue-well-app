import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUserId, getDevUser } from "@/lib/auth-dev";
import { getAvailableFitnessClasses, getUserFitnessPreferences } from "@/ai/fallback-plan-ai";

export async function GET(request: NextRequest) {
  // Get user ID - works in both dev and prod mode
  const session = await getServerSession(authOptions);
  let userId = await getUserId(session);
  
  // Fallback: if no user ID and in dev mode, try to get dev user
  if (!userId) {
    try {
      userId = await getDevUser();
    } catch (error) {
      console.error("Error getting dev user:", error);
    }
  }
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Get user's fitness preferences
    const fitnessPrefs = await getUserFitnessPreferences(userId);
    const preferredTimes = fitnessPrefs.preferredTimes || [];
    const sportsClasses = fitnessPrefs.sportsClasses || [];
    
    console.log("[nearest-class] Getting classes with preferences:", { preferredTimes, sportsClasses });
    
    // Get available classes filtered by preferences
    const classes = await getAvailableFitnessClasses(preferredTimes, sportsClasses);
    console.log(`[nearest-class] Found ${classes.length} classes`);
    
    if (classes.length === 0) {
      return NextResponse.json({ class: null });
    }
    
    // Find the nearest class (closest to current time, prioritizing matching preferences)
    const now = new Date();
    
    // First, try to find classes that match preferences and are in the future
    const matchingClasses = classes.filter((cls: any) => {
      const clsStart = new Date(cls.startTime);
      return cls.matchesPreference && clsStart > now;
    });
    
    let nearestClass = null;
    
    if (matchingClasses.length > 0) {
      // Sort by start time (nearest first)
      matchingClasses.sort((a: any, b: any) => {
        const timeA = new Date(a.startTime).getTime();
        const timeB = new Date(b.startTime).getTime();
        return timeA - timeB;
      });
      nearestClass = matchingClasses[0];
    } else {
      // If no matching classes, find nearest future class
      const futureClasses = classes.filter((cls: any) => {
        const clsStart = new Date(cls.startTime);
        return clsStart > now;
      });
      
      if (futureClasses.length > 0) {
        futureClasses.sort((a: any, b: any) => {
          const timeA = new Date(a.startTime).getTime();
          const timeB = new Date(b.startTime).getTime();
          return timeA - timeB;
        });
        nearestClass = futureClasses[0];
      } else {
        // If no future classes, use the most recent past class
        const pastClasses = classes.filter((cls: any) => {
          const clsStart = new Date(cls.startTime);
          return clsStart <= now;
        });
        
        if (pastClasses.length > 0) {
          pastClasses.sort((a: any, b: any) => {
            const timeA = new Date(a.startTime).getTime();
            const timeB = new Date(b.startTime).getTime();
            return timeB - timeA; // Most recent first
          });
          nearestClass = pastClasses[0];
        }
      }
    }
    
    if (!nearestClass) {
      return NextResponse.json({ class: null });
    }
    
    // Format time for display
    const classStart = new Date(nearestClass.startTime);
    const timeStr = classStart.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    
    console.log(`[nearest-class] Returning nearest class: ${nearestClass.title} at ${timeStr}`);
    
    return NextResponse.json({
      class: {
        title: nearestClass.title,
        time: timeStr,
        startTime: nearestClass.startTime,
        endTime: nearestClass.endTime,
        location: nearestClass.location,
        intensity: nearestClass.intensity,
        source: nearestClass.source,
      },
    });
  } catch (error) {
    console.error("Error fetching nearest class:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearest class", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

