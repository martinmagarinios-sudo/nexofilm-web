const { createClient } = require('@supabase/supabase-js');
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

const localEnv = loadEnv('.env.local');
const url = localEnv.VITE_SUPABASE_URL || 'https://dmloyybnmqmnjufvmedp.supabase.co';
const key = localEnv.VITE_SUPABASE_KEY || 'sb_publishable_0Ur2zsqwWb3YG2Q4tTVtqg_sO5XB7FN';

console.log('Connecting to:', url);
const supabase = createClient(url, key);

async function run() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, contact_name, title, access_token')
      .limit(10);

    if (error) {
      console.log('Query Error:', error);
    } else {
      console.log('Projects retrieved:', data);
    }
  } catch (err) {
    console.log('Error executing query:', err.message);
  }
}

run();
