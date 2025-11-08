import cron from "node-cron";
import { importDukeDining } from "@/etl/dukeDining";
import { syncDukeRec } from "@/etl/dukeRec";
import { embedMenuItems } from "@/ai/embeddings";

// Feature flag for local dev
const ENABLE_CRON = process.env.ENABLE_CRON !== "false";

if (ENABLE_CRON) {
  // Nightly 03:00: Import Duke Dining and embed missing items
  cron.schedule("0 3 * * *", async () => {
    console.log("Running nightly Duke Dining import...");
    try {
      const result = await importDukeDining();
      console.log("Duke Dining import completed:", result);
      
      // Embed any new items
      if (result.itemsInserted > 0) {
        await embedMenuItems();
      }
    } catch (error) {
      console.error("Error in nightly Duke Dining import:", error);
    }
  });
  
  // Every 6 hours: Sync Duke Rec classes
  cron.schedule("0 */6 * * *", async () => {
    console.log("Syncing Duke Rec classes...");
    try {
      const result = await syncDukeRec();
      console.log("Duke Rec sync completed:", result);
    } catch (error) {
      console.error("Error syncing Duke Rec:", error);
    }
  });
  
  // Weekly Sunday 03:00: Full embeddings rebuild
  cron.schedule("0 3 * * 0", async () => {
    console.log("Running weekly embeddings rebuild...");
    try {
      const embedded = await embedMenuItems();
      console.log(`Embeddings rebuild completed: ${embedded} items embedded`);
    } catch (error) {
      console.error("Error in weekly embeddings rebuild:", error);
    }
  });
  
  console.log("Cron jobs initialized");
} else {
  console.log("Cron jobs disabled (ENABLE_CRON=false)");
}

