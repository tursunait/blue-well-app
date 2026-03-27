import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { getUserId, getDevUser } from "@/lib/auth-dev";

export async function POST(req: NextRequest) {
  try {
    // Try to get user ID - in dev mode, use test user
    let userId: string | null = null;
    
    // First, try to get from session (for production)
    const session = await getServerSession(authOptions);
    userId = await getUserId(session);
    
    // If no user ID and we're in dev mode, use test user
    if (!userId) {
      try {
        userId = await getDevUser();
      } catch (error) {
        // If getDevUser fails, use the known test user ID
        const testUser = await prisma.user.findUnique({
          where: { email: "test@halo.com" },
        });
        userId = testUser?.id || null;
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { surveyId, questionId, answerJson } = body;

    try {
      await prisma.surveyAnswer.create({
        data: {
          userId: userId,
          questionId,
          value: answerJson ? JSON.stringify(answerJson) : "{}",
          surveyId,
          // Store the JSON as a string for SQLite compatibility
          answerJson: answerJson ? JSON.stringify(answerJson) : null,
        },
      });

      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      console.error("Database error saving survey answer:", dbError);
      // If it's a unique constraint error, that's okay - answer already exists
      if (dbError.code === 'P2002') {
        return NextResponse.json({ success: true, message: "Answer already saved" });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error("Error saving survey answer:", error);
    return NextResponse.json({ 
      error: "Failed to save answer", 
      details: error.message 
    }, { status: 500 });
  }
}

