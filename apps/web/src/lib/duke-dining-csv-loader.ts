import fs from "fs";
import path from "path";

export interface DukeDiningItem {
  location: string; // Restaurant name
  mealType: string; // Breakfast, Lunch, Dinner, etc.
  category: string;
  itemName: string;
  servingSize: string;
  calories: number;
  proteinG: number;
  totalFatG: number;
  saturatedFatG: number;
  cholesterolMg: number;
  sodiumMg: number;
  totalCarbsG: number;
  dietaryFiberG: number;
  totalSugarsG: number;
  allergens: string;
}

let cachedItems: DukeDiningItem[] | null = null;

/**
 * Load Duke Dining menu items from CSV file
 */
export async function loadDukeDiningItemsFromCSV(): Promise<DukeDiningItem[]> {
  if (cachedItems) {
    return cachedItems;
  }

  try {
    const csvPath = path.join(process.cwd(), "data", "Data.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      console.warn("[duke-dining-csv] CSV file is empty or has no data rows");
      return [];
    }

    // Parse header
    const headers = lines[0].split(",").map((h) => h.trim());
    const items: DukeDiningItem[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quoted fields (CSV parsing)
      const values: string[] = [];
      let currentValue = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Add last value

      if (values.length < headers.length) {
        continue; // Skip malformed rows
      }

      try {
        const item: DukeDiningItem = {
          location: values[0] || "",
          mealType: values[1] || "",
          category: values[2] || "",
          itemName: values[3] || "",
          servingSize: values[4] || "",
          calories: parseFloat(values[5]) || 0,
          totalFatG: parseFloat(values[6]) || 0,
          saturatedFatG: parseFloat(values[7]) || 0,
          cholesterolMg: parseFloat(values[8]) || 0,
          sodiumMg: parseFloat(values[9]) || 0,
          totalCarbsG: parseFloat(values[10]) || 0,
          dietaryFiberG: parseFloat(values[11]) || 0,
          totalSugarsG: parseFloat(values[12]) || 0,
          proteinG: parseFloat(values[13]) || 0,
          allergens: values[14] || "",
        };

        // Only add items with valid data
        if (item.itemName && item.calories > 0) {
          items.push(item);
        }
      } catch (error) {
        console.warn(`[duke-dining-csv] Error parsing row ${i}:`, error);
        continue;
      }
    }

    console.log(`[duke-dining-csv] Loaded ${items.length} items from CSV`);
    cachedItems = items;
    return items;
  } catch (error) {
    console.error("[duke-dining-csv] Error loading CSV:", error);
    return [];
  }
}

/**
 * Filter items by meal type (Breakfast, Lunch, Dinner)
 */
export function filterItemsByMealType(
  items: DukeDiningItem[],
  mealType: "Breakfast" | "Lunch" | "Dinner"
): DukeDiningItem[] {
  return items.filter((item) => {
    const itemMealType = item.mealType.trim();
    return itemMealType.toLowerCase() === mealType.toLowerCase();
  });
}

/**
 * Filter items by diet preferences (allergens, dietary restrictions)
 */
export function filterItemsByDietPrefs(
  items: DukeDiningItem[],
  dietPrefs: string[]
): DukeDiningItem[] {
  if (!dietPrefs || dietPrefs.length === 0) {
    return items;
  }

  return items.filter((item) => {
    const allergens = item.allergens.toLowerCase();
    const itemName = item.itemName.toLowerCase();
    const category = item.category.toLowerCase();

    // Check if item matches any diet preference
    return dietPrefs.every((pref) => {
      const prefLower = pref.toLowerCase();

      // Vegan: no animal products
      if (prefLower.includes("vegan")) {
        return (
          !allergens.includes("milk") &&
          !allergens.includes("dairy") &&
          !allergens.includes("egg") &&
          !allergens.includes("chicken") &&
          !allergens.includes("beef") &&
          !allergens.includes("turkey") &&
          !itemName.includes("chicken") &&
          !itemName.includes("beef") &&
          !itemName.includes("turkey") &&
          !itemName.includes("meat")
        );
      }

      // Vegetarian: no meat
      if (prefLower.includes("vegetarian")) {
        return (
          !allergens.includes("chicken") &&
          !allergens.includes("beef") &&
          !allergens.includes("turkey") &&
          !itemName.includes("chicken") &&
          !itemName.includes("beef") &&
          !itemName.includes("turkey") &&
          !itemName.includes("meat")
        );
      }

      // Gluten-free
      if (prefLower.includes("gluten")) {
        return !allergens.includes("gluten") && !allergens.includes("wheat");
      }

      // Dairy-free
      if (prefLower.includes("dairy")) {
        return !allergens.includes("milk") && !allergens.includes("dairy");
      }

      // If preference doesn't match known restrictions, include item
      return true;
    });
  });
}

/**
 * Search items by query (item name, category, location)
 */
export function searchItemsByQuery(
  items: DukeDiningItem[],
  query: string
): DukeDiningItem[] {
  if (!query) {
    return items;
  }

  const queryLower = query.toLowerCase();
  return items.filter((item) => {
    return (
      item.itemName.toLowerCase().includes(queryLower) ||
      item.category.toLowerCase().includes(queryLower) ||
      item.location.toLowerCase().includes(queryLower)
    );
  });
}

/**
 * Filter items by minimum protein
 */
export function filterItemsByProtein(
  items: DukeDiningItem[],
  proteinMin: number
): DukeDiningItem[] {
  if (!proteinMin) {
    return items;
  }
  return items.filter((item) => item.proteinG >= proteinMin);
}

