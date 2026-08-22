const fs = require("fs");
const p = require("path");

const pats = {
  EMAIL: /[\w.+-]+@[\w-]+\.[\w.]+/g,
  UNSPLASH: /unsplash|images\.unsplash/g,
  VERCEL: /vercel\.app/g,
  SUPABASE_URL: /supabase\.co|https:\/\/[a-z0-9]+\.supabase/g,
  LOCALHOST: /localhost:5173|localhost:3000/g,
  SERVICE_ROLE: /SERVICE_ROLE_KEY|service_role/g,
  VITE_: /VITE_[A-Z_]+/g,
  ADMIN_EMAIL: /admin/i,
};

function walk(d) {
  if (!fs.existsSync(d)) return;
  for (const f of fs.readdirSync(d)) {
    const fp = p.join(d, f);
    const s = fs.statSync(fp);
    if (s.isDirectory()) walk(fp);
    else if (/\.(ts|tsx|sql|env|example)$/.test(f)) {
      const c = fs.readFileSync(fp, "utf8");
      const lines = c.split("\n");
      for (let i = 0; i < lines.length; i++) {
        for (const [n, re] of Object.entries(pats)) {
          re.lastIndex = 0;
          const m = lines[i].match(re);
          if (m) {
            console.log(n.padEnd(14), fp + ":" + (i + 1) + ": " + lines[i].trim().slice(0, 160));
          }
        }
      }
    }
  }
}

walk("src");
walk("supabase");
