-- AlterTable: Add restaurant and menuItemId fields to FoodLog
-- Migration: add_restaurant_to_foodlog

-- Add restaurant column
ALTER TABLE "FoodLog" ADD COLUMN "restaurant" TEXT;

-- Add menuItemId column
ALTER TABLE "FoodLog" ADD COLUMN "menuItemId" TEXT;

-- Create index on restaurant and itemName for faster lookups
CREATE INDEX "FoodLog_restaurant_itemName_idx" ON "FoodLog"("restaurant", "itemName");
