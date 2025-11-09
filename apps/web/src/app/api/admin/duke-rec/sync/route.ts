import { NextRequest, NextResponse } from "next/server";
import { syncDukeRec } from "@/etl/dukeRec";

/**
 * Admin endpoint to manually sync Duke Rec classes
 * Requires ADMIN_TOKEN header
 */
export async function POST(request: NextRequest) {
  const adminToken = request.headers.get("ADMIN_TOKEN");
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const daysAhead = body.daysAhead || 7;
    
    const from = new Date();
    const to = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    const result = await syncDukeRec(from, to);

    return NextResponse.json({
      success: true,
      ...result,
      dateRange: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error syncing Duke Rec classes:", error);
    return NextResponse.json(
      { 
        error: "Failed to sync Duke Rec classes", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

