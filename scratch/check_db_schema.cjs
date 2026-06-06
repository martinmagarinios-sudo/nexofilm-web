const https = require('https');
const fs = require('fs');
const path = require('path');

// Basic env parser helper
function loadEnv(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return {};
  const content = fs.readFileSync(fullPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      env[match[1]] = value;
    }
  });
  return env;
}

const productionEnv = loadEnv('.env.production.local');
const localEnv = loadEnv('.env.local');

const url1 = productionEnv.VITE_SUPABASE_URL || 'https://bprjsdkhvqobrommxfnk.supabase.co';
const key1 = productionEnv.VITE_SUPABASE_KEY || 'sb_publishable_0Ur2zsqwWb3YG2Q4tTVtqg_sO5XB7FN';

const url2 = localEnv.VITE_SUPABASE_URL || 'https://dmloyybnmqmnjufvmedp.supabase.co';
const key2 = localEnv.VITE_SUPABASE_KEY || 'sb_publishable_0Ur2zsqwWb3YG2Q4tTVtqg_sO5XB7FN';

function fetchSchema(url, key, label) {
  return new Promise((resolve) => {
    console.log(`Checking schema for ${label} (${url})...`);
    
    // Parse hostname and path
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.log(`Failed to get schema for ${label}: ${res.statusCode} ${res.statusMessage}`);
          resolve();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          console.log(`\n=== Tables in ${label} ===`);
          const definitions = parsed.definitions || {};
          for (const tableName of Object.keys(definitions)) {
            console.log(`Table: ${tableName}`);
            const columns = definitions[tableName].properties || {};
            console.log('Columns:', Object.keys(columns).join(', '));
            console.log('---');
          }
        } catch (err) {
          console.log(`Error parsing JSON schema for ${label}: ${err.message}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`Error checking schema for ${label}: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function run() {
  await fetchSchema(url1, key1, 'Production / .env.production.local');
  await fetchSchema(url2, key2, 'Local / .env.local');
}

run();
