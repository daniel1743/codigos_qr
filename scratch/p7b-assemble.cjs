/** Concatenate the PAGES_7B QA parts into the final runner. */
const fs = require("fs");
const path = require("path");

const partsDir = "scratch/p7b-parts";
const target = "scratch/qa-p7b-generator.cjs";
const parts = ["01.cjs", "02.cjs", "03.cjs", "04.cjs", "05.cjs", "06.cjs", "07.cjs", "08.cjs"];
const chunks = parts.map((name) => fs.readFileSync(path.join(partsDir, name), "utf8").trimEnd());
fs.writeFileSync(target, chunks.join("\n\n") + "\n");

const source = fs.readFileSync(target, "utf8");
const indented = source.split("\n").filter((line) => /^\s+(async )?function /.test(line)).length;
console.log(
  `wrote ${target} (${fs.statSync(target).size} bytes) from ${parts.length} parts; indented function declarations (must be 0): ${indented}`,
);
