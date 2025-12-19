import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
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
        console.warn("[log/photo] Failed to get dev user:", error);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    
    if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
    const body = await request.json();
    const { image, imageUrl } = body; // base64 image or URL
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Use OpenAI Vision to analyze image
    const imageData = image || imageUrl;
    if (!imageData) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }
    
    // Use retry wrapper for OpenAI Vision API calls
    const visionResponse = await withRetry(
      () =>
        openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food image and return a JSON object with: name (string), calories (number), proteinG (number), carbsG (number), fatG (number). Be as accurate as possible. If uncertain, provide estimates and mark as estimate: true.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageData.startsWith("data:") ? imageData : `data:image/jpeg;base64,${imageData}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
          max_tokens: 500,
        }),
      { retries: 2, baseMs: 500 }
    );
    
    const analysis = JSON.parse(visionResponse.choices[0].message.content || "{}");
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
        { error: "Could not identify food from image" },
        { status: 400 }
      );
    }
    
    // Try to match with menu items using semantic similarity (fuzzy matching with strict threshold)
    let matchedItemId: string | null = null;
    let matchedItem: any = null;
    let finalRestaurant: string | undefined = undefined;
    
    try {
      const queryEmbedding = await getQueryEmbedding(name);
      const menuItems = await prisma.menuItem.findMany({
        where: {
          embedding: { not: null },
        },
        include: { vendor: true }, // Include vendor for restaurant name
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
      
      // Strict threshold: only use DB nutrition if similarity > 0.7 (high confidence)
      // Below threshold, fall back to manual confirmation (no hallucinations)
      if (bestMatch && bestMatch.similarity > 0.7) {
        matchedItem = bestMatch.item;
        matchedItemId = matchedItem.id;
        finalRestaurant = matchedItem.vendor.name; // EXACT restaurant name from database
      }
    } catch (error) {
      console.error("Error matching with menu items:", error);
    }
    
    // Use DB nutrition if matched with high confidence, otherwise use AI estimates
    // If similarity < 0.7, return AI estimate and let user confirm (no auto-mapping)
    const finalCalories = matchedItem?.calories || calories;
    const finalProtein = matchedItem?.proteinG || proteinG;
    const finalCarbs = matchedItem?.carbsG || carbsG;
    const finalFat = matchedItem?.fatG || fatG;
    const finalName = matchedItem?.name || name;
    
    // Create food log with restaurant if matched
    const foodLog = await prisma.foodLog.create({
      data: {
        userId: user.id,
        itemName: finalName,
        restaurant: finalRestaurant || null, // EXACT restaurant name if matched
        menuItemId: matchedItemId || null, // Link to MenuItem if matched
        calories: finalCalories,
        proteinG: finalProtein,
        carbsG: finalCarbs,
        fatG: finalFat,
        notes: !matchedItem && estimate ? "AI estimate - please confirm" : null,
        source: matchedItem ? "MENU_PICK" : "PHOTO_AI",
        ts: new Date(),
      },
    });
    
    return NextResponse.json({
      id: foodLog.id,
      name: finalName,
      restaurant: finalRestaurant, // EXACT restaurant name if matched
      menuItemId: matchedItemId, // MenuItem ID if matched
      calories: finalCalories,
      proteinG: finalProtein,
      carbsG: finalCarbs,
      fatG: finalFat,
      matched: !!matchedItem,
      estimate: !matchedItem && estimate,
      requiresConfirmation: !matchedItem, // If not matched, requires user confirmation
    });
  } catch (error: any) {
    console.error("Error processing photo:", error);
    const is429 = error?.status === 429 || error?.code === "insufficient_quota";
    const errorMessage = is429
      ? "OpenAI quota exceeded. Please try again later."
      : error instanceof Error
      ? error.message
      : "Failed to process photo";
    
    return NextResponse.json(
      { error: "Failed to process photo", details: errorMessage },
      { status: is429 ? 429 : 500 }
    );
  }
}

