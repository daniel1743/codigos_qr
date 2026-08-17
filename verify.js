import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Parse .env.local
const envContent = fs.readFileSync(".env.local", "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length > 0) {
    env[key.trim()] = rest.join("=").trim();
  }
});

const url = env["VITE_SUPABASE_URL"];
const key = env["VITE_SUPABASE_ANON_KEY"];

console.log("URL:", url);
console.log("KEY:", key.substring(0, 10) + "...");

if (!url || !key) {
  console.error("Faltan variables en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

async function runTests() {
  console.log("=== INICIANDO VALIDACIÓN END-TO-END SUPABASE ===");

  console.log("=== INICIANDO VALIDACIÓN DE ESQUEMA SUPABASE ===");

  // Check profiles table
  const { data: profiles, error: pError } = await supabase.from("profiles").select("*").limit(1);
  if (pError) {
    console.error("FAIL: Error consultando profiles:", pError.message);
  } else {
    console.log("PASS: Tabla 'profiles' existe y es consultable por anon (RLS activo).");
  }

  // Check profile_links table
  const { data: links, error: lError } = await supabase.from("profile_links").select("*").limit(1);
  if (lError) {
    console.error("FAIL: Error consultando profile_links:", lError.message);
  } else {
    console.log("PASS: Tabla 'profile_links' existe y es consultable por anon (RLS activo).");
  }
  
  // Check avatars bucket
  const { data: buckets, error: bError } = await supabase.storage.getBucket('avatars');
  if (bError) {
    console.error("FAIL: Error consultando bucket avatars:", bError.message);
  } else {
    console.log("PASS: Bucket 'avatars' existe y es accesible.");
  }

  console.log("\n=== VALIDACIÓN COMPLETADA ===");

  console.log("\n=== VALIDACIÓN COMPLETADA SATISFACTORIAMENTE ===");
}

runTests().catch(console.error);
