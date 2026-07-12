import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

for (const envFile of ['.env', '.env.local']) {
  try {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // Optional environment file.
  }
}

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');

const directory = join(process.cwd(), 'public', 'images');
const files = readdirSync(directory).filter(file => /\.(jpe?g|png|webp)$/i.test(file));
const storage = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage.from('game-images');

let uploaded = 0;
let skipped = 0;

for (const file of files) {
  const extension = extname(file).toLowerCase();
  const contentType = extension === '.png'
    ? 'image/png'
    : extension === '.webp'
      ? 'image/webp'
      : 'image/jpeg';
  const { error } = await storage.upload(file, readFileSync(join(directory, file)), {
    contentType,
    cacheControl: '3600',
    upsert: false,
  });

  if (error?.message?.toLowerCase().includes('already exists')) {
    skipped += 1;
    continue;
  }
  if (error) throw new Error(`${file}: ${error.message}`);
  uploaded += 1;
}

console.log(JSON.stringify({ found: files.length, uploaded, skipped }));

