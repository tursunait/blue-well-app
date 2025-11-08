import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { getQueryEmbedding, cosineSimilarity } from "@/ai/embeddings";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { image, imageUrl } = body; // base64 image or URL
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Use OpenAI Vision to analyze image
    const imageData = image || imageUrl;
    if (!imageData) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }
    
    const visionResponse = await openai.chat.completions.create({
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
    });
    
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
    
    // Try to match with menu items using semantic similarity
    let matchedItemId: string | null = null;
    let matchedItem: any = null;
    
    try {
      const queryEmbedding = await getQueryEmbedding(name);
      const menuItems = await prisma.menuItem.findMany({
        where: {
          embedding: { not: null },
        },
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
      
      // If similarity is high enough (>0.7), use DB nutrition
      if (bestMatch && bestMatch.similarity > 0.7) {
        matchedItem = bestMatch.item;
        matchedItemId = matchedItem.id;
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
        calories: finalCalories,
        proteinG: finalProtein,
        carbsG: finalCarbs,
        fatG: finalFat,
        notes: estimate ? "AI estimate" : null,
        source: "PHOTO_AI",
        ts: new Date(),
      },
    });
    
    return NextResponse.json({
      id: foodLog.id,
      name: finalName,
      calories: finalCalories,
      proteinG: finalProtein,
      carbsG: finalCarbs,
      fatG: finalFat,
      matched: !!matchedItem,
      estimate: !matchedItem && estimate,
    });
  } catch (error) {
    console.error("Error processing photo:", error);
    return NextResponse.json(
      { error: "Failed to process photo", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

