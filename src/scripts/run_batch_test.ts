import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getStructuralFingerprint, calculateDiversityScore } from '../lib/template-factory/diversity';
import type { TemplateConfig } from '../lib/template-factory/config';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase.from('template_bank').select('config_json').eq('is_public', true);
  if (error) throw error;
  
  const configs = data.map(r => r.config_json as TemplateConfig).filter(Boolean);
  
  const scores = [];
  // Calculate score for each template against the rest
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const batch = [...configs.slice(0, i), ...configs.slice(i + 1)];
    const result = calculateDiversityScore(config, batch);
    scores.push(result);
  }

  const structuralUniquenessAvg = scores.reduce((a,b) => a + b.structuralUniqueness, 0) / scores.length;
  const identityDiversityAvg = scores.reduce((a,b) => a + b.identityDiversity, 0) / scores.length;
  const scoreAvg = scores.reduce((a,b) => a + b.diversityScore, 0) / scores.length;
  
  console.log("Global Average Diversity Score:", scoreAvg.toFixed(2));
  console.log("Global Average Structural Uniqueness:", structuralUniquenessAvg.toFixed(2));
  console.log("Global Average Identity Diversity:", identityDiversityAvg.toFixed(2));

  const diagnostics = {};
  for (const s of scores) {
    diagnostics[s.diagnostico] = (diagnostics[s.diagnostico] || 0) + 1;
  }
  console.log("Diagnosticos:", diagnostics);
}

run();
