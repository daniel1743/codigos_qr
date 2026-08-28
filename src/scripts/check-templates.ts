import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';

const envPath = '.env.local';
const envs = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
for (const line of envs) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function run() {
  const { data, error } = await admin.from('template_bank').select('config_json').eq('publication_status', 'PUBLIC').limit(10);
  if (error) {
    console.error(error);
    return;
  }
  console.log(JSON.stringify(data?.map(d => {
    const cfg = d.config_json as any;
    return { 
      profileRadius: cfg?.appearance?.profileRadius, 
      bgStart: cfg?.appearance?.bgStart, 
      banner: cfg?.appearance?.banner,
      paletteId: cfg?.paletteId, identity: cfg?.identity
    };
  }), null, 2));
}

run().catch(console.error);
