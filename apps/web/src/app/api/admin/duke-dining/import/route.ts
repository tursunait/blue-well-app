import { NextRequest, NextResponse } from "next/server";
import { importDukeDining } from "@/etl/dukeDining";

export async function POST(request: NextRequest) {
  // Check admin token
  const adminToken = request.headers.get("ADMIN_TOKEN");
  const expectedToken = process.env.ADMIN_TOKEN;
  
  if (!expectedToken || adminToken !== expectedToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json().catch(() => ({}));
    const rebuildEmbeddings = body.rebuildEmbeddings === true;
    
    const result = await importDukeDining();
    
    // If rebuildEmbeddings is true, regenerate all embeddings
    if (rebuildEmbeddings) {
      // This would require updating embedMenuItems to handle all items
      // For now, we'll just embed the new/updated items
    }
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error importing Duke Dining data:", error);
    return NextResponse.json(
      { error: "Import failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

