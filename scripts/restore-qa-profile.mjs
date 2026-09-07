import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const QA_PROFILE_ID = "ff0cd302-07a4-4106-9a13-a14f9ded2f4b";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function restore() {
  const { error } = await supabase.from('profiles').update({
    template_config: {
      "editorConfig": {
         "someAdvancedKey": "advancedValue"
      }
    }
  }).eq('id', QA_PROFILE_ID);

  if (error) {
    console.error("Failed to restore:", error);
    process.exit(1);
  }
  console.log("QA Baseline Restored Successfully.");
}

restore();
