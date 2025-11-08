import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-dev";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, itemsJson, totalKcal, totalMacros, source } = body;

    const mealLog = await prisma.mealLog.create({
      data: {
        userId: userId,
        imageUrl,
        itemsJson,
        totalKcal,
        totalMacros,
        source: source || "manual",
      },
    });

    return NextResponse.json(mealLog);
  } catch (error) {
    console.error("Error creating meal log:", error);
    return NextResponse.json({ error: "Failed to create meal log" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meals = await prisma.mealLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json(meals);
  } catch (error) {
    console.error("Error fetching meal logs:", error);
    return NextResponse.json({ error: "Failed to fetch meals" }, { status: 500 });
  }
}

