import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import pRetry from "p-retry";

let cachedClient: OpenAI | null = null;

function getOpenAIClient() {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured. Embedding calls require a valid key.");
  }
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

const EMBEDDINGS_MODEL = process.env.PLANNER_EMBEDDINGS_MODEL || "text-embedding-3-small";
const BATCH_SIZE = 100; // OpenAI allows up to 2048 items per batch, but we'll use smaller batches

/**
 * Create or update embeddings for menu items
 * @param itemIds Optional array of item IDs to embed. If not provided, embeds all items without embeddings.
 * @returns Number of items embedded
 */
export async function embedMenuItems(itemIds?: string[]): Promise<number> {
  // Find items that need embeddings
  const where = itemIds
    ? { id: { in: itemIds } }
    : { embedding: null };

  const items = await prisma.menuItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      tags: true,
    },
  });

  if (items.length === 0) {
    return 0;
  }

  let embedded = 0;

  // Process in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // Create text representations for embedding
    const texts = batch.map((item) => {
      const parts = [item.name];
      if (item.description) parts.push(item.description);
      // Parse tags from JSON string (SQLite stores as string)
      if (item.tags) {
        try {
          const tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags;
          if (Array.isArray(tags) && tags.length > 0) {
            parts.push(tags.join(", "));
          }
        } catch (e) {
          // If parsing fails, skip tags
        }
      }
      return parts.join(". ");
    });

    try {
      // Get embeddings with retry
      const response = await pRetry(
        async () => {
          return await getOpenAIClient().embeddings.create({
            model: EMBEDDINGS_MODEL,
            input: texts,
          });
        },
        {
          retries: 3,
          onFailedAttempt: (error) => {
            console.warn(`Embedding attempt ${error.attemptNumber} failed:`, (error as any).message || error);
          },
        }
      );

      // Store embeddings
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = response.data[j].embedding;
        const embeddingBytes = Buffer.from(new Float32Array(embedding).buffer);

        await prisma.menuItem.update({
          where: { id: item.id },
          data: { embedding: embeddingBytes },
        });

        embedded++;
      }
    } catch (error) {
      console.error(`Failed to embed batch starting at index ${i}:`, error);
      throw error;
    }
  }

  return embedded;
}

/**
 * Get embedding for a search query
 */
export async function getQueryEmbedding(query: string): Promise<Float32Array> {
  const response = await getOpenAIClient().embeddings.create({
    model: EMBEDDINGS_MODEL,
    input: query,
  });

  return new Float32Array(response.data[0].embedding);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
