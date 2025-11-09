import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import fetch from "node-fetch";
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
  name: ["item", "menu item", "food", "dish", "product", "item name"],
  description: ["description", "notes", "category"],
  calories: ["calories", "kcal"],
  proteinG: ["protein", "protein(g)", "protein g", "protein (g)"],
  carbsG: ["carbs", "carbohydrates", "carbs(g)", "carbs g", "total carbs", "total carbs (g)"],
  fatG: ["fat", "fat(g)", "fat g", "total fat", "total fat (g)"],
  priceUSD: ["price", "price($)", "price $", "cost"],
  tags: ["tags", "diet", "attributes", "notes", "allergens"],
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
 * Parse CSV string into rows
 */
function parseCSV(csvText: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) return rows; // Need at least header + one data row
  
  // Parse header row
  const headerLine = lines[0];
  const headerValues = parseCSVLine(headerLine);
  const headers: Record<string, number> = {}; // Map field name to column index
  
  for (let i = 0; i < headerValues.length; i++) {
    const field = normalizeHeader(headerValues[i]);
    if (field) {
      headers[field] = i;
    }
  }
  
  // Also find Category column index (common in Duke Dining CSV)
  let categoryIndex = -1;
  for (let i = 0; i < headerValues.length; i++) {
    if (headerValues[i].toLowerCase().includes("category")) {
      categoryIndex = i;
      break;
    }
  }
  
  // Validate required fields
  if (headers.vendor === undefined || headers.name === undefined) {
    console.warn("CSV missing required fields (vendor, name), skipping");
    return rows;
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length === 0) continue;
    
    const vendor = (values[headers.vendor] || "").trim();
    const name = (values[headers.name] || "").trim();
    
    if (!vendor || !name) continue;
    
    const parsed: ParsedRow = {
      vendor,
      name,
    };
    
    if (headers.campusLoc !== undefined) {
      parsed.campusLoc = (values[headers.campusLoc] || "").trim() || undefined;
    }
    
    // Use description field if available, otherwise use Category
    if (headers.description !== undefined) {
      parsed.description = (values[headers.description] || "").trim() || undefined;
    }
    
    // If no description but Category exists, use Category
    if (!parsed.description && categoryIndex >= 0 && values[categoryIndex]) {
      parsed.description = (values[categoryIndex] || "").trim() || undefined;
    }
    
    if (headers.calories !== undefined) {
      parsed.calories = parseNumber(values[headers.calories]);
    }
    
    if (headers.proteinG !== undefined) {
      parsed.proteinG = parseNumber(values[headers.proteinG]);
    }
    
    if (headers.carbsG !== undefined) {
      parsed.carbsG = parseNumber(values[headers.carbsG]);
    }
    
    if (headers.fatG !== undefined) {
      parsed.fatG = parseNumber(values[headers.fatG]);
    }
    
    if (headers.priceUSD !== undefined) {
      parsed.priceUSD = parseNumber(values[headers.priceUSD]);
    }
    
    if (headers.tags !== undefined) {
      parsed.tags = parseTags(values[headers.tags]);
    }
    
    if (headers.updatedAt !== undefined) {
      const dateStr = (values[headers.updatedAt] || "").trim();
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          parsed.updatedAt = date;
        }
      }
    }
    
    rows.push(parsed);
  }
  
  return rows;
}

/**
 * Parse a CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  // Add last field
  values.push(current);
  
  return values;
}

/**
 * Import Duke Dining CSV file
 */
export async function importDukeDiningExcel(
  // File is at root level: data/Data.csv
  // Try multiple possible locations
  file?: string
): Promise<{
  vendorsUpserted: number;
  itemsInserted: number;
  itemsUpdated: number;
  embedded: number;
  skipped: number;
}> {
  // Resolve file path - download from GitHub if not provided
  let tempFile: string | null = null;
  
  if (!file) {
    // Try local paths first
    const possiblePaths = [
      path.join(process.cwd(), "..", "..", "data", "Data.csv"), // From apps/web to root
      path.join(process.cwd(), "data", "Data.csv"), // If running from root
      path.join(process.cwd(), "..", "data", "Data.csv"), // If running from apps
    ];
    
    for (const possiblePath of possiblePaths) {
      try {
        // Resolve to absolute path
        const resolvedPath = path.isAbsolute(possiblePath) 
          ? possiblePath 
          : path.resolve(possiblePath);
        
        if (fs.existsSync(resolvedPath)) {
          file = resolvedPath;
          console.log(`Found local file at: ${file}`);
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    // If not found locally, download from GitHub
    if (!file) {
      const githubUrl = "https://raw.githubusercontent.com/tursunait/blue-well-app/main/data/Data.csv";
      console.log(`Local file not found, downloading from GitHub: ${githubUrl}`);
      
      try {
        console.log(`Attempting to download from GitHub: ${githubUrl}`);
        const response = await fetch(githubUrl);
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`Failed to download from GitHub: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`);
        }
        
        const contentType = response.headers.get("content-type");
        console.log(`Response content-type: ${contentType}`);
        
        const arrayBuffer = await response.arrayBuffer();
        console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error("Downloaded file is empty");
        }
        
        const buffer = Buffer.from(arrayBuffer);
        
        // Save to temporary file
        tempFile = path.join(os.tmpdir(), `duke-dining-${Date.now()}.csv`);
        fs.writeFileSync(tempFile, buffer);
        file = tempFile;
        
        console.log(`Downloaded file to temporary location: ${tempFile} (${buffer.length} bytes)`);
        
        // Verify file exists and is readable
        if (!fs.existsSync(tempFile)) {
          throw new Error(`Temporary file was not created: ${tempFile}`);
        }
        
        const stats = fs.statSync(tempFile);
        console.log(`Temporary file size: ${stats.size} bytes`);
        
      } catch (error) {
        console.error("GitHub download error:", error);
        throw new Error(
          `Cannot find Data.csv locally and failed to download from GitHub: ${error instanceof Error ? error.message : String(error)}. ` +
          `Please ensure the file exists locally or check your internet connection.`
        );
      }
    }
  }
  
  let vendorsUpserted = 0;
  let itemsInserted = 0;
  let itemsUpdated = 0;
  let skipped = 0;
  const itemIdsToEmbed: string[] = [];
  
  // Verify file exists before reading and resolve to absolute path
  if (!file) {
    throw new Error("File path is not set");
  }
  
  // Resolve to absolute path
  const absolutePath = path.isAbsolute(file) ? file : path.resolve(file);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File does not exist: ${absolutePath}`);
  }
  
  // Check file permissions
  try {
    fs.accessSync(absolutePath, fs.constants.R_OK);
  } catch (error) {
    throw new Error(`File is not readable: ${absolutePath}. ${error instanceof Error ? error.message : String(error)}`);
  }
  
  const stats = fs.statSync(absolutePath);
  if (stats.size === 0) {
    throw new Error(`File is empty: ${absolutePath}`);
  }
  
  console.log(`Reading CSV file: ${absolutePath} (${stats.size} bytes)`);
  
  // Read CSV file
  let csvText: string;
  try {
    csvText = fs.readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to read CSV file ${absolutePath}: ${error instanceof Error ? error.message : String(error)}. ` +
      `Please ensure the file is a valid CSV file.`
    );
  }
  
  if (!csvText || csvText.trim().length === 0) {
    throw new Error(`CSV file is empty: ${absolutePath}`);
  }
  
  console.log(`Parsing CSV file (${csvText.split(/\r?\n/).length} lines)`);
  
  // Parse CSV
  const allRows = parseCSV(csvText);
  
  if (allRows.length === 0) {
    throw new Error(`CSV file has no valid data rows: ${absolutePath}`);
  }
  
  console.log(`Parsed ${allRows.length} rows from CSV`);
  
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
    // Find or create vendor (name is not unique, so we search first)
    let vendor = await prisma.menuVendor.findFirst({
      where: {
        name: vendorName,
        source: "DUKE_DINING",
      },
    });

    if (!vendor) {
      vendor = await prisma.menuVendor.create({
        data: {
        name: vendorName,
        source: "DUKE_DINING",
        campusLoc: rows[0]?.campusLoc,
      },
    });
      vendorsUpserted++;
    } else {
      // Update if needed
      vendor = await prisma.menuVendor.update({
        where: { id: vendor.id },
        data: {
          source: "DUKE_DINING",
          campusLoc: rows[0]?.campusLoc || vendor.campusLoc,
        },
      });
    vendorsUpserted++;
    }
    
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
              tags: row.tags && row.tags.length > 0 ? JSON.stringify(row.tags) : null,
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
              tags: row.tags && row.tags.length > 0 ? JSON.stringify(row.tags) : null,
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
  
  // Generate embeddings for new/updated items (optional - skip if OpenAI quota exceeded)
  let embedded = 0;
  if (itemIdsToEmbed.length > 0 && process.env.OPENAI_API_KEY) {
    try {
    embedded = await embedMenuItems(itemIdsToEmbed);
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.code === "insufficient_quota";
      if (is429) {
        console.warn(`[import] Skipping embeddings due to OpenAI quota. ${itemIdsToEmbed.length} items imported without embeddings.`);
      } else {
        console.warn(`[import] Failed to generate embeddings:`, error.message);
      }
      // Continue without embeddings - items are still imported
    }
  }
  
  // Clean up temporary file if we downloaded it from GitHub
  if (tempFile && fs.existsSync(tempFile)) {
    try {
      fs.unlinkSync(tempFile);
      console.log(`Cleaned up temporary file: ${tempFile}`);
    } catch (error) {
      console.warn(`Failed to clean up temporary file ${tempFile}:`, error);
    }
  }
  
  return {
    vendorsUpserted,
    itemsInserted,
    itemsUpdated,
    embedded,
    skipped,
  };
}

