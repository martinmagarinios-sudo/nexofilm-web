const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const localEnv = loadEnv('.env.local');
const url = localEnv.VITE_SUPABASE_URL || 'https://dmloyybnmqmnjufvmedp.supabase.co';
const key = localEnv.VITE_SUPABASE_KEY || 'sb_publishable_0Ur2zsqwWb3YG2Q4tTVtqg_sO5XB7FN';

const token = 'bb673759-29f5-40d1-8d5f-9005a9cf4698';

// Set the header to bypass RLS for this client
const supabase = createClient(url, key, {
  global: {
    headers: {
      'x-client-token': token
    }
  }
});

async function run() {
  console.log(`Checking token ${token} in database ${url} with x-client-token header...`);
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, contact_name, title, access_token, status')
      .eq('access_token', token)
      .maybeSingle();

    if (error) {
      console.log('Query Error:', error);
    } else {
      console.log('Project details:', data);
    }
  } catch (err) {
    console.log('Error executing query:', err.message);
  }
}

run();
