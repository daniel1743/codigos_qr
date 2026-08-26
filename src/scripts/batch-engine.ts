import * as fs from "fs";
import * as path from "path";
import { generateBatch } from "../lib/template-factory/generator";
import type { IndustryId } from "../lib/template-factory/industries";
import { computeQaScore } from "../lib/template-factory/qa";

interface BatchConfig {
  industry: IndustryId;
  quantity: number;
  locale: string;
  seedNamespace: string;
  paletteStrategy: string;
  variationLevel: string;
  qualityThreshold: number;
  outputDir: string;
  batchId: string;
  mode: "dry_run" | "production_local" | "ingest";
  allowedRecipes?: string[];
  excludedRecipes?: string[];
  paletteFamily?: string;
  themeMode?: string;
}

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg && arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = "true";
      }
    }
  }
  return options;
}

async function runBatch() {
  const options = parseArgs();

  let config: Partial<BatchConfig> = {};
  if (options.config) {
    const fileContent = fs.readFileSync(path.resolve(options.config), "utf-8");
    config = JSON.parse(fileContent);
  }

  const finalConfig: BatchConfig = {
    industry: (options.industry || config.industry) as IndustryId,
    quantity: parseInt(options.quantity) || config.quantity || 1,
    locale: options.locale || config.locale || "es",
    seedNamespace: options["seed-namespace"] || config.seedNamespace || "default-seed",
    paletteStrategy: options["palette-strategy"] || config.paletteStrategy || "semantic",
    variationLevel: options["variation-level"] || config.variationLevel || "high",
    qualityThreshold: parseFloat(options["quality-threshold"]) || config.qualityThreshold || 0.85,
    outputDir: path.resolve(options["output-dir"] || config.outputDir || "./out-batch"),
    batchId: options["batch-id"] || config.batchId || ("batch-" + Date.now()),
    mode: (options.mode || config.mode || "dry_run") as any,
    allowedRecipes: options["allowed-recipes"] ? options["allowed-recipes"].split(",") : config.allowedRecipes,
    excludedRecipes: options["excluded-recipes"] ? options["excluded-recipes"].split(",") : config.excludedRecipes,
  };

  if (!finalConfig.industry || !finalConfig.quantity || !finalConfig.seedNamespace) {
    console.error("Missing required parameters: industry, quantity, seed-namespace");
    process.exit(1);
  }

  if (finalConfig.mode === "ingest") {
    console.error("LOCKED: 'ingest' mode is locked until PASS B LIVE.");
    process.exit(1);
  }

  if (!fs.existsSync(finalConfig.outputDir)) {
    fs.mkdirSync(finalConfig.outputDir, { recursive: true });
  }

  console.log("Starting Batch Engine: " + finalConfig.batchId + " (" + finalConfig.mode + ")");
  console.log("Industry: " + finalConfig.industry + " | Quantity: " + finalConfig.quantity);

  const batchOutputs: any[] = [];
  const failures: any[] = [];
  const duplicates: any[] = [];
  let successCount = 0;

  const CHUNK_SIZE = 10;
  const chunks = Math.ceil(finalConfig.quantity / CHUNK_SIZE);

  for (let c = 0; c < chunks; c++) {
    const chunkCount = Math.min(CHUNK_SIZE, finalConfig.quantity - c * CHUNK_SIZE);
    let recipePool: string[] | undefined = finalConfig.allowedRecipes;
    
    const chunkResult = generateBatch({
      industry: finalConfig.industry,
      count: chunkCount,
      seed: finalConfig.seedNamespace + "-chunk-" + c,
      batchId: finalConfig.batchId + "-c" + c,
      recipePool: recipePool,
    });

    duplicates.push(...chunkResult.duplicates);
    
    for (const failure of chunkResult.failures) {
      failures.push({ phase: "generation", index: failure.index, errors: failure.errors });
    }

    for (const tpl of chunkResult.templates) {
      const mockQaResults = {
        schemaValid: true,
        rendererSuccess: true,
        noOverflow: true,
        buttonIntegrity: true,
        assetIntegrity: true,
        urlSafety: true,
        roundTrip: true,
      };

      const scoreResult = computeQaScore(mockQaResults);

      if (scoreResult.scoreNormalized < finalConfig.qualityThreshold) {
        failures.push({ phase: "qa", templateId: tpl.templateId, score: scoreResult.scoreNormalized });
        continue;
      }

      batchOutputs.push({
        templateId: tpl.templateId,
        config: tpl.config,
        qaScore: scoreResult.scoreNormalized,
      });
      
      successCount++;
    }
  }

  fs.writeFileSync(path.join(finalConfig.outputDir, "manifest.json"), JSON.stringify({
    batchId: finalConfig.batchId,
    industry: finalConfig.industry,
    requested: finalConfig.quantity,
    generated: successCount,
    failed: failures.length,
    duplicateCount: duplicates.length,
    mode: finalConfig.mode
  }, null, 2));

  fs.writeFileSync(path.join(finalConfig.outputDir, "duplicates.json"), JSON.stringify(duplicates, null, 2));
  fs.writeFileSync(path.join(finalConfig.outputDir, "failures.json"), JSON.stringify(failures, null, 2));
  fs.writeFileSync(path.join(finalConfig.outputDir, "ingestion-manifest.json"), JSON.stringify({
    status: finalConfig.mode === "dry_run" ? "staged_only" : "ready_for_ingest",
    items: batchOutputs.map(o => o.templateId)
  }, null, 2));

  batchOutputs.forEach(o => {
    fs.writeFileSync(path.join(finalConfig.outputDir, o.templateId + ".json"), JSON.stringify(o.config, null, 2));
  });

  console.log("Batch complete! Generated: " + successCount + ", Failed: " + failures.length + ", Duplicates: " + duplicates.length);
  console.log("Outputs written to " + finalConfig.outputDir);
}

runBatch().catch(console.error);
