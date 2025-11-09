import { NextRequest, NextResponse } from "next/server";
import { importDukeRecCSV } from "@/etl/dukeRecCSV";

/**
 * Admin API endpoint to import Duke Rec classes from CSV
 * Idempotent: skips classes that already exist
 */
export async function POST(request: NextRequest) {
  // Check admin token (same as other admin endpoints)
  const adminToken = request.headers.get("ADMIN_TOKEN");
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!expectedToken || adminToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importDukeRecCSV();
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Import complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
    });
  } catch (error) {
    console.error("Error importing Rec CSV:", error);
    return NextResponse.json(
      {
        error: "Failed to import Rec CSV",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

