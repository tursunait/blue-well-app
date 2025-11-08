import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getQueryEmbedding, cosineSimilarity } from "@/ai/embeddings";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const dietPrefs = searchParams.getAll("dietPrefs");
    const avoid = searchParams.getAll("avoid");
    const priceMax = searchParams.get("priceMax") ? parseFloat(searchParams.get("priceMax")!) : undefined;
    const proteinMin = searchParams.get("proteinMin") ? parseFloat(searchParams.get("proteinMin")!) : undefined;
    const campusLoc = searchParams.get("campusLoc") || undefined;
    
    // Build base query
    const where: any = {};
    
    if (campusLoc) {
      where.vendor = {
        campusLoc: {
          contains: campusLoc,
          mode: "insensitive",
        },
      };
    }
    
    if (priceMax) {
      where.priceUSD = { lte: priceMax };
    }
    
    if (proteinMin) {
      where.proteinG = { gte: proteinMin };
    }
    
    // Get all matching items
    let items = await prisma.menuItem.findMany({
      where,
      include: {
        vendor: true,
      },
      take: 100, // Get more than needed for ranking
    });
    
    // Filter by diet preferences and avoid list
    if (dietPrefs.length > 0 || avoid.length > 0) {
      items = items.filter((item) => {
        // Check diet preferences (tags must include at least one)
        if (dietPrefs.length > 0) {
          const hasDietPref = dietPrefs.some((pref) =>
            item.tags.some((tag) => tag.toLowerCase().includes(pref.toLowerCase()))
          );
          if (!hasDietPref) return false;
        }
        
        // Check avoid list (name and tags must not contain any)
        if (avoid.length > 0) {
          const nameLower = item.name.toLowerCase();
          const tagsLower = item.tags.map((t) => t.toLowerCase()).join(" ");
          const hasAvoided = avoid.some((a) =>
            nameLower.includes(a.toLowerCase()) || tagsLower.includes(a.toLowerCase())
          );
          if (hasAvoided) return false;
        }
        
        return true;
      });
    }
    
    // Rank items
    const ranked = await Promise.all(
      items.map(async (item) => {
        let score = 0;
        
        // Diet compliance (already filtered, but boost score)
        if (dietPrefs.length > 0) {
          const matchingPrefs = dietPrefs.filter((pref) =>
            item.tags.some((tag) => tag.toLowerCase().includes(pref.toLowerCase()))
          );
          score += matchingPrefs.length * 10;
        }
        
        // Semantic similarity (if query and embedding exist)
        if (q && item.embedding) {
          try {
            const queryEmbedding = await getQueryEmbedding(q);
            const itemEmbedding = new Float32Array(item.embedding.buffer);
            const similarity = cosineSimilarity(queryEmbedding, itemEmbedding);
            score += similarity * 50;
          } catch (error) {
            console.error("Error calculating similarity:", error);
          }
        }
        
        // Protein boost (if proteinMin specified)
        if (proteinMin && item.proteinG) {
          score += Math.min(item.proteinG / proteinMin, 2) * 5;
        }
        
        // Price preference (lower is better, but not heavily weighted)
        if (item.priceUSD) {
          score += (10 - Math.min(item.priceUSD / 2, 10)) * 0.5;
        }
        
        return { item, score };
      })
    );
    
    // Sort by score and take top 10
    ranked.sort((a, b) => b.score - a.score);
    const topItems = ranked.slice(0, 10).map(({ item }) => ({
      id: item.id,
      name: item.name,
      vendor: item.vendor.name,
      campusLoc: item.vendor.campusLoc,
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      priceUSD: item.priceUSD,
      tags: item.tags,
      description: item.description,
    }));
    
    return NextResponse.json(topItems);
  } catch (error) {
    console.error("Error searching menu:", error);
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

