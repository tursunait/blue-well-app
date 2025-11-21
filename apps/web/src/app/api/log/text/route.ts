import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { getQueryEmbedding, cosineSimilarity } from "@/ai/embeddings";
import { withRetry } from "@/lib/ai";
import { getUserId, getDevUser } from "@/lib/auth-dev";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    let userId: string | null = null;
    
    userId = await getUserId(session);
    
    if (!userId) {
      // In dev mode, try to get/create a dev user
      try {
        userId = await getDevUser();
      } catch (error) {
        console.warn("[log/text] Failed to get dev user:", error);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { foodDescription } = body;
    
    if (!foodDescription || typeof foodDescription !== "string") {
      return NextResponse.json({ error: "Missing food description" }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Use OpenAI to estimate nutrition from text description
    const prompt = `Estimate the nutrition information for this food: "${foodDescription}". Return a JSON object with: name (string), calories (number), proteinG (number), carbsG (number), fatG (number). Be as accurate as possible. If uncertain, provide reasonable estimates.`;
    
    const textResponse = await withRetry(
      () =>
        openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      { retries: 2, baseMs: 500 }
    );
    
    const analysis = JSON.parse(textResponse.choices[0].message.content || "{}");
    const {
      name,
      calories,
      proteinG,
      carbsG,
      fatG,
      estimate = true,
    } = analysis;
    
    if (!name || !calories) {
      return NextResponse.json(
        { error: "Could not estimate nutrition from description" },
        { status: 400 }
      );
    }
    
    // Try to match with menu items using semantic similarity
    let matchedItemId: string | null = null;
    let matchedItem: any = null;
    let finalRestaurant: string | undefined = undefined;
    
    try {
      const queryEmbedding = await getQueryEmbedding(name);
      const menuItems = await prisma.menuItem.findMany({
        where: {
          embedding: { not: null },
        },
        include: { vendor: true },
        take: 50,
      });
      
      let bestMatch: { item: any; similarity: number } | null = null;
      
      for (const item of menuItems) {
        if (item.embedding) {
          const itemEmbedding = new Float32Array(item.embedding.buffer);
          const similarity = cosineSimilarity(queryEmbedding, itemEmbedding);
          
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { item, similarity };
          }
        }
      }
      
      // Strict threshold: only use DB nutrition if similarity > 0.7
      if (bestMatch && bestMatch.similarity > 0.7) {
        matchedItem = bestMatch.item;
        matchedItemId = matchedItem.id;
        finalRestaurant = matchedItem.vendor.name;
      }
    } catch (error) {
      console.error("Error matching with menu items:", error);
    }
    
    // Use DB nutrition if matched, otherwise use AI estimates
    const finalCalories = matchedItem?.calories || calories;
    const finalProtein = matchedItem?.proteinG || proteinG;
    const finalCarbs = matchedItem?.carbsG || carbsG;
    const finalFat = matchedItem?.fatG || fatG;
    const finalName = matchedItem?.name || name;
    
    // Create food log
    const foodLog = await prisma.foodLog.create({
      data: {
        userId: user.id,
        itemName: finalName,
        restaurant: finalRestaurant || null,
        menuItemId: matchedItemId || null,
        calories: finalCalories,
        proteinG: finalProtein,
        carbsG: finalCarbs,
        fatG: finalFat,
        notes: !matchedItem && estimate ? "AI estimate from text - please confirm" : null,
        source: matchedItem ? "MENU_PICK" : "TEXT_AI",
        ts: new Date(),
      },
    });
    
    return NextResponse.json({
      id: foodLog.id,
      name: finalName,
      restaurant: finalRestaurant,
      menuItemId: matchedItemId,
      calories: finalCalories,
      proteinG: finalProtein,
      carbsG: finalCarbs,
      fatG: finalFat,
      matched: !!matchedItem,
      estimate: !matchedItem && estimate,
      requiresConfirmation: !matchedItem,
    });
  } catch (error: any) {
    console.error("Error processing text description:", error);
    const is429 = error?.status === 429 || error?.code === "insufficient_quota";
    const errorMessage = is429
      ? "OpenAI quota exceeded. Please try again later."
      : error instanceof Error
      ? error.message
      : "Failed to process text description";
    
    return NextResponse.json(
      { error: "Failed to process text description", details: errorMessage },
      { status: is429 ? 429 : 500 }
    );
  }
}

