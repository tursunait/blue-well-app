# Import Duke Dining Data

## Quick Import

The Duke Dining data file exists at `data/Data.csv`. To import it:

### Option 1: Using curl (Recommended)

```bash
# Get your ADMIN_TOKEN from .env.local
ADMIN_TOKEN=$(grep "^ADMIN_TOKEN" apps/web/.env.local | cut -d'=' -f2)

# Import the data
curl -X POST http://localhost:3002/api/admin/duke-dining/import \
  -H "ADMIN_TOKEN: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rebuildEmbeddings": true}'
```

### Option 2: Using a script

I'll create a helper script for you.

## What Gets Imported

- **Vendors**: Dining locations (Wilson, Brodie, etc.)
- **Menu Items**: Food items with nutrition data
- **Embeddings**: AI embeddings for semantic search

## Verification

After importing, check:
1. Menu items are available in the database
2. Plan generation works (no "No dining items available" error)

## Troubleshooting

### Error: "Unauthorized"
- Make sure `ADMIN_TOKEN` is set in `apps/web/.env.local`
- Restart the dev server after updating `.env.local`
- Use the exact token value (no quotes)

### Error: "File not found"
- Ensure `data/Data.csv` exists at the project root
- Check file permissions

### Error: "Import failed"
- Check server logs for details
- Verify database connection
- Ensure Prisma client is generated

