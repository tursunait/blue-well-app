import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from")
      ? new Date(searchParams.get("from")!)
      : new Date();
    const to = searchParams.get("to")
      ? new Date(searchParams.get("to")!)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
    const intensity = searchParams.get("intensity") || undefined;
    
    const where: any = {
      startTime: {
        gte: from,
        lte: to,
      },
    };
    
    if (intensity) {
      where.intensity = intensity;
    }
    
    const classes = await prisma.fitnessClass.findMany({
      where,
      orderBy: {
        startTime: "asc",
      },
      take: 50,
    });
    
    return NextResponse.json(
      classes.map((cls) => ({
        id: cls.id,
        title: cls.title,
        startTime: cls.startTime.toISOString(),
        endTime: cls.endTime.toISOString(),
        location: cls.location,
        intensity: cls.intensity,
        url: cls.url,
      }))
    );
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

