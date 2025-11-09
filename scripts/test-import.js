#!/usr/bin/env node

// Quick test script to import Duke Dining data
const https = require('http');
const fs = require('fs');
const path = require('path');

// Read ADMIN_TOKEN from .env.local
const envFile = path.join(__dirname, '../apps/web/.env.local');
const envContent = fs.readFileSync(envFile, 'utf8');
const adminTokenMatch = envContent.match(/^ADMIN_TOKEN=(.+)$/m);
const adminToken = adminTokenMatch ? adminTokenMatch[1].trim() : null;

if (!adminToken) {
  console.error('❌ ADMIN_TOKEN not found in .env.local');
  process.exit(1);
}

console.log('🔑 Using ADMIN_TOKEN from .env.local');
console.log('📁 Checking for data file...');

const dataFile = path.join(__dirname, '../data/Data.csv');
if (!fs.existsSync(dataFile)) {
  console.error(`❌ Data file not found: ${dataFile}`);
  process.exit(1);
}

console.log(`✅ Found data file: ${dataFile}`);

// Try different ports
const ports = [3002, 3001, 3000];
let port = null;

for (const p of ports) {
  try {
    const testReq = https.get(`http://localhost:${p}`, { timeout: 1000 }, (res) => {
      port = p;
      console.log(`✅ Server found on port ${p}`);
      makeImportRequest(p);
    });
    testReq.on('error', () => {
      // Try next port
    });
    testReq.on('timeout', () => {
      testReq.destroy();
    });
    break;
  } catch (e) {
    // Continue
  }
}

if (!port) {
  console.error('❌ Could not find running server. Please start the dev server first.');
  process.exit(1);
}

function makeImportRequest(port) {
  console.log(`\n📤 Importing Duke Dining data...`);
  
  const postData = JSON.stringify({ rebuildEmbeddings: true });
  
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/api/admin/duke-dining/import',
    method: 'POST',
    headers: {
      'ADMIN_TOKEN': adminToken,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`\n📥 Response (${res.statusCode}):`);
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log(data);
      }
      
      if (res.statusCode === 200) {
        console.log('\n✅ Import successful!');
      } else {
        console.log(`\n❌ Import failed with status ${res.statusCode}`);
        process.exit(1);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`\n❌ Request error: ${e.message}`);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}

