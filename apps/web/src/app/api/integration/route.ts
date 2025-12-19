import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-dev";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await prisma.integration.findUnique({
      where: { userId: userId },
    });

    return NextResponse.json(integration || {});
  } catch (error) {
    console.error("Error fetching integration:", error);
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const integration = await prisma.integration.update({
      where: { userId: userId },
      data: body,
    });

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Error updating integration:", error);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}

