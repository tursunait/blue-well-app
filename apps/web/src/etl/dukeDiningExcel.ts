import * as XLSX from "xlsx";
import * as path from "path";
import { prisma } from "@/lib/prisma";
import { embedMenuItems } from "@/ai/embeddings";

interface ParsedRow {
  vendor: string;
  campusLoc?: string;
  name: string;
  description?: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  priceUSD?: number;
  tags?: string[];
  updatedAt?: Date;
}

// Header synonyms mapping (case and space insensitive)
const HEADER_SYNONYMS: Record<string, string[]> = {
  vendor: ["vendor", "restaurant", "dining hall", "location", "venue"],
  campusLoc: ["campus location", "venue", "court", "location"],
  name: ["item", "menu item", "food", "dish", "product"],
  description: ["description", "notes"],
  calories: ["calories", "kcal"],
  proteinG: ["protein", "protein(g)", "protein g"],
  carbsG: ["carbs", "carbohydrates", "carbs(g)", "carbs g"],
  fatG: ["fat", "fat(g)", "fat g"],
  priceUSD: ["price", "price($)", "price $", "cost"],
  tags: ["tags", "diet", "attributes", "notes"],
  updatedAt: ["updated", "last updated"],
};

/**
 * Normalize header name to field name
 */
function normalizeHeader(header: string): string | null {
  const normalized = header.toLowerCase().trim().replace(/\s+/g, " ");
  
  for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
    if (synonyms.some((syn) => normalized.includes(syn.toLowerCase()))) {
      return field;
    }
  }
  
  return null;
}

/**
 * Parse number from string (handles "450 kcal" → 450, "30g" → 30, "$8.99" → 8.99)
 */
function parseNumber(value: any): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  
  // Remove currency symbols, units, and extract number
  const cleaned = value
    .replace(/[$€£¥]/g, "")
    .replace(/kcal|cal|g|kg|lb|lbs|oz/gi, "")
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse tags from string or array
 */
function parseTags(value: any): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Normalize item name for deduplication
 */
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Parse a sheet into rows
 */
function parseSheet(sheet: XLSX.WorkSheet): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const data = XLSX.utils.sheet_to_json(sheet, { raw: false });
  
  if (data.length === 0) return rows;
  
  // Find header row (first row with non-empty values)
  const firstRow = data[0] as Record<string, any>;
  const headers: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(firstRow)) {
    const field = normalizeHeader(key);
    if (field) {
      headers[field] = key;
    }
  }
  
  // Validate required fields
  if (!headers.vendor || !headers.name) {
    console.warn("Sheet missing required fields (vendor, name), skipping");
    return rows;
  }
  
  // Parse rows
  for (const row of data as Record<string, any>[]) {
    const vendor = String(row[headers.vendor] || "").trim();
    const name = String(row[headers.name] || "").trim();
    
    if (!vendor || !name) continue;
    
    const parsed: ParsedRow = {
      vendor,
      name,
    };
    
    if (headers.campusLoc) {
      parsed.campusLoc = String(row[headers.campusLoc] || "").trim() || undefined;
    }
    
    if (headers.description) {
      parsed.description = String(row[headers.description] || "").trim() || undefined;
    }
    
    if (headers.calories) {
      parsed.calories = parseNumber(row[headers.calories]);
    }
    
    if (headers.proteinG) {
      parsed.proteinG = parseNumber(row[headers.proteinG]);
    }
    
    if (headers.carbsG) {
      parsed.carbsG = parseNumber(row[headers.carbsG]);
    }
    
    if (headers.fatG) {
      parsed.fatG = parseNumber(row[headers.fatG]);
    }
    
    if (headers.priceUSD) {
      parsed.priceUSD = parseNumber(row[headers.priceUSD]);
    }
    
    if (headers.tags) {
      parsed.tags = parseTags(row[headers.tags]);
    }
    
    if (headers.updatedAt) {
      const date = XLSX.SSF.parse_date_code(row[headers.updatedAt]);
      if (date) {
        parsed.updatedAt = new Date(date);
      }
    }
    
    rows.push(parsed);
  }
  
  return rows;
}

/**
 * Import Duke Dining Excel file
 */
export async function importDukeDiningExcel(
  file = path.join(process.cwd(), "data", "Data.xlsx")
): Promise<{
  vendorsUpserted: number;
  itemsInserted: number;
  itemsUpdated: number;
  embedded: number;
  skipped: number;
}> {
  let vendorsUpserted = 0;
  let itemsInserted = 0;
  let itemsUpdated = 0;
  let skipped = 0;
  const itemIdsToEmbed: string[] = [];
  
  // Read workbook
  const workbook = XLSX.readFile(file);
  const allRows: ParsedRow[] = [];
  
  // Parse all sheets
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = parseSheet(sheet);
    allRows.push(...rows);
  }
  
  // Group by vendor
  const vendorMap = new Map<string, ParsedRow[]>();
  for (const row of allRows) {
    if (!vendorMap.has(row.vendor)) {
      vendorMap.set(row.vendor, []);
    }
    vendorMap.get(row.vendor)!.push(row);
  }
  
  // Upsert vendors and items
  for (const [vendorName, rows] of vendorMap.entries()) {
    // Upsert vendor
    const vendor = await prisma.menuVendor.upsert({
      where: { name: vendorName },
      update: {
        source: "DUKE_DINING",
        campusLoc: rows[0]?.campusLoc,
      },
      create: {
        name: vendorName,
        source: "DUKE_DINING",
        campusLoc: rows[0]?.campusLoc,
      },
    });
    
    vendorsUpserted++;
    
    // Upsert items
    for (const row of rows) {
      const normalized = normalizeItemName(row.name);
      
      try {
        const existing = await prisma.menuItem.findUnique({
          where: {
            vendorId_normalized: {
              vendorId: vendor.id,
              normalized,
            },
          },
        });
        
        if (existing) {
          // Update existing
          await prisma.menuItem.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              description: row.description,
              calories: row.calories,
              proteinG: row.proteinG,
              carbsG: row.carbsG,
              fatG: row.fatG,
              priceUSD: row.priceUSD,
              tags: row.tags || [],
              updatedAt: row.updatedAt || new Date(),
              // Clear embedding if nutrition changed (will be regenerated)
              embedding: existing.embedding && (
                existing.calories !== row.calories ||
                existing.proteinG !== row.proteinG ||
                existing.name !== row.name
              ) ? null : existing.embedding,
            },
          });
          
          itemsUpdated++;
          if (!existing.embedding) {
            itemIdsToEmbed.push(existing.id);
          }
        } else {
          // Create new
          const newItem = await prisma.menuItem.create({
            data: {
              vendorId: vendor.id,
              name: row.name,
              normalized,
              description: row.description,
              calories: row.calories,
              proteinG: row.proteinG,
              carbsG: row.carbsG,
              fatG: row.fatG,
              priceUSD: row.priceUSD,
              tags: row.tags || [],
              updatedAt: row.updatedAt || new Date(),
            },
          });
          
          itemsInserted++;
          itemIdsToEmbed.push(newItem.id);
        }
      } catch (error) {
        console.error(`Error upserting item ${row.name}:`, error);
        skipped++;
      }
    }
  }
  
  // Generate embeddings for new/updated items
  let embedded = 0;
  if (itemIdsToEmbed.length > 0) {
    embedded = await embedMenuItems(itemIdsToEmbed);
  }
  
  return {
    vendorsUpserted,
    itemsInserted,
    itemsUpdated,
    embedded,
    skipped,
  };
}

