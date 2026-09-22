/** Brace/paren balance diagnosis for the PAGES_7B QA script. */
const fs = require("fs");

const lines = fs.readFileSync("scratch/qa-p7b-generator.cjs", "utf8").split("\n");
let depth = 0;
const report = [];

lines.forEach((line, index) => {
  let inString = null;
  let inTemplate = false;
  let inRegex = false;
  let previous = "";
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inString) {
      if (char === "\\") i += 1;
      else if (char === inString) inString = null;
      continue;
    }
    if (inTemplate) {
      if (char === "\\") i += 1;
      else if (char === "`") inTemplate = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }
    if (char === "`") {
      inTemplate = true;
      continue;
    }
    if (char === "/" && line[i + 1] === "/" && !inRegex) break;
    if (char === "/" && previous !== "*" && line[i + 1] !== "*" && /[=(,:[\s]/.test(previous)) {
      // naive regex start detection
      inRegex = true;
      continue;
    }
    if (inRegex) {
      if (char === "\\") i += 1;
      else if (char === "/") inRegex = false;
      continue;
    }
    if (char === "{" || char === "(" || char === "[") depth += 1;
    if (char === "}" || char === ")" || char === "]") depth -= 1;
    previous = char;
  }
  if (
    line.includes("function") ||
    line.includes("=>") ||
    line.includes("for (") ||
    line.includes("if (")
  ) {
    report.push(`${index + 1}\t${depth}\t${line.trim().slice(0, 70)}`);
  }
});

console.log(`final depth: ${depth}`);
console.log("line\tdepth-at-EOL\tcode");
console.log(report.join("\n"));
