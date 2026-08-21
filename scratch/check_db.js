import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from("encrypted_documents").select("*").limit(1);
  if (error) {
    console.log("Error:", error.message);
    if (error.message.includes("does not exist")) {
      console.log("Table does not exist");
    }
  } else {
    console.log("Table exists! Data:", data);
  }
}

check();
