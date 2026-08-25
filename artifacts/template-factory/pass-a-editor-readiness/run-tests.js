// PASS A - Template Factory Round-Trip Testing
// Playwright test suite for validating TemplateConfig serialization/deserialization

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const FIXTURES = require('./test-fixtures.js');
const RESULTS_DIR = path.join(__dirname, 'results');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const TEST_URL = 'http://localhost:5173/template-builder';

async function runTests() {
  console.log('🚀 PASS A: Editor Capability Audit - Round-Trip Tests');
  console.log('═══════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const results = {
    timestamp: new Date().toISOString(),
    testUrl: TEST_URL,
    fixtures: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  try {
    console.log(`📡 Navegando a: ${TEST_URL}\n`);
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });

    // Wait for iframe to load
    console.log('⏳ Esperando carga del editor...');
    const frame = page.frameLocator('iframe[title="Template Builder"]');
    await frame.locator('#render-canvas').waitFor({ timeout: 10000 });
    console.log('✅ Editor cargado\n');

    // Run tests for each fixture
    for (const [fixtureName, fixtureConfig] of Object.entries(FIXTURES)) {
      results.summary.total++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧪 TEST: ${fixtureName}`);
      console.log(`${'='.repeat(60)}`);

      const testResult = await testFixture(page, frame, fixtureName, fixtureConfig);
      results.fixtures[fixtureName] = testResult;

      if (testResult.passed) {
        results.summary.passed++;
        console.log(`✅ ${fixtureName}: PASS`);
      } else {
        results.summary.failed++;
        console.log(`❌ ${fixtureName}: FAIL`);
        console.log(`   Razón: ${testResult.failureReason}`);
      }
    }

    // Test validation function
    console.log(`\n${'='.repeat(60)}`);
    console.log('🧪 TEST: Config Validation Function');
    console.log(`${'='.repeat(60)}`);
    const validationTest = await testValidation(page, frame);
    results.validationTest = validationTest;
    console.log(validationTest.passed ? '✅ Validation: PASS' : '❌ Validation: FAIL');

    // Test normalization function
    console.log(`\n${'='.repeat(60)}`);
    console.log('🧪 TEST: Config Normalization Function');
    console.log(`${'='.repeat(60)}`);
    const normalizationTest = await testNormalization(page, frame);
    results.normalizationTest = normalizationTest;
    console.log(normalizationTest.passed ? '✅ Normalization: PASS' : '❌ Normalization: FAIL');

  } catch (error) {
    console.error('❌ Error fatal en suite de pruebas:', error);
    results.fatalError = error.message;
  } finally {
    await browser.close();
  }

  // Write results to file
  const resultsPath = path.join(RESULTS_DIR, 'round-trip-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📊 Resultados guardados en: ${resultsPath}`);

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESUMEN DE RESULTADOS');
  console.log('═'.repeat(60));
  console.log(`Total de pruebas: ${results.summary.total}`);
  console.log(`✅ Pasadas: ${results.summary.passed}`);
  console.log(`❌ Fallidas: ${results.summary.failed}`);
  console.log(`📈 Tasa de éxito: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  console.log('═'.repeat(60) + '\n');

  return results;
}

async function testFixture(page, frame, fixtureName, fixtureConfig) {
  const result = {
    fixtureName,
    buttonCount: fixtureConfig.links.length,
    passed: false,
    failureReason: null,
    steps: {},
    screenshots: {}
  };

  try {
    // Step 1: Load fixture config
    console.log('  📥 Step 1: Cargando fixture config...');
    await frame.evaluate((config) => {
      window.loadTemplateConfig(config);
    }, fixtureConfig);
    await page.waitForTimeout(500);
    result.steps.load = 'SUCCESS';
    console.log('     ✓ Config cargado');

    // Screenshot: Initial state
    const screenshotInitial = `${fixtureName}-01-initial.png`;
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshotInitial),
      fullPage: true
    });
    result.screenshots.initial = screenshotInitial;

    // Step 2: Export config
    console.log('  📤 Step 2: Exportando config...');
    const exportedConfig = await frame.evaluate(() => {
      return window.getTemplateConfig();
    });
    result.steps.export = 'SUCCESS';
    result.exportedConfig = exportedConfig;
    console.log('     ✓ Config exportado');

    // Step 3: Validate exported config
    console.log('  🔍 Step 3: Validando config exportado...');
    const validation = await frame.evaluate((config) => {
      return window.validateTemplateConfig(config);
    }, exportedConfig);

    if (!validation.valid) {
      result.steps.validate = 'FAIL';
      result.failureReason = `Validation failed: ${validation.errors.join(', ')}`;
      console.log(`     ✗ Validación falló: ${result.failureReason}`);
      return result;
    }
    result.steps.validate = 'SUCCESS';
    result.validation = validation;
    console.log('     ✓ Config válido');

    // Step 4: Clear editor
    console.log('  🧹 Step 4: Limpiando editor...');
    await frame.evaluate(() => {
      window.resetTemplate();
    });
    await page.waitForTimeout(500);
    result.steps.clear = 'SUCCESS';
    console.log('     ✓ Editor reiniciado');

    // Screenshot: After reset
    const screenshotReset = `${fixtureName}-02-reset.png`;
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshotReset),
      fullPage: true
    });
    result.screenshots.reset = screenshotReset;

    // Step 5: Reload exported config
    console.log('  🔄 Step 5: Recargando config exportado...');
    await frame.evaluate((config) => {
      window.loadTemplateConfig(config);
    }, exportedConfig);
    await page.waitForTimeout(500);
    result.steps.reload = 'SUCCESS';
    console.log('     ✓ Config recargado');

    // Screenshot: After reload
    const screenshotReload = `${fixtureName}-03-reload.png`;
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, screenshotReload),
      fullPage: true
    });
    result.screenshots.reload = screenshotReload;

    // Step 6: Export again (second round-trip)
    console.log('  📤 Step 6: Exportando nuevamente...');
    const reExportedConfig = await frame.evaluate(() => {
      return window.getTemplateConfig();
    });
    result.steps.reExport = 'SUCCESS';
    result.reExportedConfig = reExportedConfig;
    console.log('     ✓ Config re-exportado');

    // Step 7: Compare configs
    console.log('  🔬 Step 7: Comparando configs...');
    const comparison = compareConfigs(exportedConfig, reExportedConfig);
    result.comparison = comparison;

    if (comparison.identical) {
      result.steps.compare = 'SUCCESS';
      console.log('     ✓ Configs idénticos');
    } else {
      result.steps.compare = 'FAIL';
      result.failureReason = `Config mismatch: ${comparison.differences.length} differences found`;
      console.log(`     ✗ ${comparison.differences.length} diferencias encontradas`);
      comparison.differences.forEach(diff => {
        console.log(`       - ${diff}`);
      });
      return result;
    }

    // Step 8: Verify button count
    console.log('  🔢 Step 8: Verificando conteo de botones...');
    const buttonCount = await frame.locator('#view-buttons-grid a').count();
    if (buttonCount !== fixtureConfig.links.length) {
      result.steps.buttonCount = 'FAIL';
      result.failureReason = `Button count mismatch: expected ${fixtureConfig.links.length}, got ${buttonCount}`;
      console.log(`     ✗ Esperado ${fixtureConfig.links.length}, encontrado ${buttonCount}`);
      return result;
    }
    result.steps.buttonCount = 'SUCCESS';
    result.renderedButtonCount = buttonCount;
    console.log(`     ✓ ${buttonCount} botones renderizados correctamente`);

    // Step 9: Verify button order
    console.log('  📋 Step 9: Verificando orden de botones...');
    const buttonTexts = await frame.locator('#view-buttons-grid a span:first-child').allTextContents();
    const expectedTexts = fixtureConfig.links.map(link => link.text);
    const orderMatch = JSON.stringify(buttonTexts) === JSON.stringify(expectedTexts);

    if (!orderMatch) {
      result.steps.buttonOrder = 'FAIL';
      result.failureReason = `Button order mismatch`;
      console.log(`     ✗ Orden incorrecto`);
      console.log(`       Esperado: ${expectedTexts.join(', ')}`);
      console.log(`       Obtenido: ${buttonTexts.join(', ')}`);
      return result;
    }
    result.steps.buttonOrder = 'SUCCESS';
    console.log('     ✓ Orden de botones correcto');

    // All steps passed
    result.passed = true;
    console.log('  ✅ Todas las verificaciones pasaron');

  } catch (error) {
    result.passed = false;
    result.failureReason = `Exception: ${error.message}`;
    result.error = error.stack;
    console.log(`  ❌ Error: ${error.message}`);
  }

  return result;
}

async function testValidation(page, frame) {
  const result = {
    passed: false,
    tests: []
  };

  try {
    // Test 1: Valid config
    const validTest = await frame.evaluate(() => {
      const valid = {
        schemaVersion: 1,
        identity: { logoText: 'Test', subtitleText: 'Test', titleText: 'Test', profileImg: '', bannerImg: '' },
        socials: { enabled: true, displayMode: 'icons', items: [] },
        content: { footerText: 'Test' },
        links: [{ id: 'test1', text: 'Test', icon: 'fa-solid fa-link', url: '#', fullWidth: false }],
        appearance: {},
        layout: { gridCols: 2 }
      };
      const validation = window.validateTemplateConfig(valid);
      return { valid: validation.valid, errors: validation.errors };
    });
    result.tests.push({ name: 'Valid config', ...validTest, expected: true, passed: validTest.valid === true });
    console.log(`  ${validTest.valid ? '✓' : '✗'} Valid config: ${validTest.valid ? 'PASS' : 'FAIL'}`);

    // Test 2: Invalid schemaVersion
    const invalidSchemaTest = await frame.evaluate(() => {
      const invalid = { schemaVersion: 999 };
      const validation = window.validateTemplateConfig(invalid);
      return { valid: validation.valid, errors: validation.errors };
    });
    result.tests.push({ name: 'Invalid schemaVersion', ...invalidSchemaTest, expected: false, passed: invalidSchemaTest.valid === false });
    console.log(`  ${!invalidSchemaTest.valid ? '✓' : '✗'} Invalid schemaVersion: ${!invalidSchemaTest.valid ? 'PASS' : 'FAIL'}`);

    // Test 3: Links not array
    const invalidLinksTest = await frame.evaluate(() => {
      const invalid = { schemaVersion: 1, links: 'not-an-array' };
      const validation = window.validateTemplateConfig(invalid);
      return { valid: validation.valid, errors: validation.errors };
    });
    result.tests.push({ name: 'Links not array', ...invalidLinksTest, expected: false, passed: invalidLinksTest.valid === false });
    console.log(`  ${!invalidLinksTest.valid ? '✓' : '✗'} Links not array: ${!invalidLinksTest.valid ? 'PASS' : 'FAIL'}`);

    result.passed = result.tests.every(t => t.passed);
    console.log(`  ${result.passed ? '✅' : '❌'} Validation tests: ${result.tests.filter(t => t.passed).length}/${result.tests.length} passed`);

  } catch (error) {
    result.error = error.message;
    console.log(`  ❌ Validation test error: ${error.message}`);
  }

  return result;
}

async function testNormalization(page, frame) {
  const result = {
    passed: false,
    tests: []
  };

  try {
    // Test 1: Missing fields filled with defaults
    const missingFieldsTest = await frame.evaluate(() => {
      const partial = { schemaVersion: 1, identity: { logoText: 'Test' } };
      const normalized = window.normalizeTemplateConfig(partial);
      return {
        hasContent: !!normalized.content,
        hasLinks: Array.isArray(normalized.links),
        hasAppearance: !!normalized.appearance,
        hasLayout: !!normalized.layout
      };
    });
    const test1Passed = missingFieldsTest.hasContent && missingFieldsTest.hasLinks && missingFieldsTest.hasAppearance && missingFieldsTest.hasLayout;
    result.tests.push({ name: 'Missing fields filled', ...missingFieldsTest, passed: test1Passed });
    console.log(`  ${test1Passed ? '✓' : '✗'} Missing fields filled: ${test1Passed ? 'PASS' : 'FAIL'}`);

    // Test 2: Links without IDs get IDs
    const linksWithoutIdsTest = await frame.evaluate(() => {
      const config = {
        schemaVersion: 1,
        links: [{ text: 'Test', icon: 'fa-solid fa-link', url: '#' }]
      };
      const normalized = window.normalizeTemplateConfig(config);
      return {
        hasId: !!normalized.links[0].id,
        idFormat: normalized.links[0].id.startsWith('id_')
      };
    });
    const test2Passed = linksWithoutIdsTest.hasId && linksWithoutIdsTest.idFormat;
    result.tests.push({ name: 'Links without IDs', ...linksWithoutIdsTest, passed: test2Passed });
    console.log(`  ${test2Passed ? '✓' : '✗'} Links without IDs: ${test2Passed ? 'PASS' : 'FAIL'}`);

    // Test 3: Socials normalized
    const socialsTest = await frame.evaluate(() => {
      const config = { schemaVersion: 1 };
      const normalized = window.normalizeTemplateConfig(config);
      return {
        hasSocials: !!normalized.socials,
        hasItems: Array.isArray(normalized.socials.items),
        hasEnabled: typeof normalized.socials.enabled === 'boolean'
      };
    });
    const test3Passed = socialsTest.hasSocials && socialsTest.hasItems && socialsTest.hasEnabled;
    result.tests.push({ name: 'Socials normalized', ...socialsTest, passed: test3Passed });
    console.log(`  ${test3Passed ? '✓' : '✗'} Socials normalized: ${test3Passed ? 'PASS' : 'FAIL'}`);

    result.passed = result.tests.every(t => t.passed);
    console.log(`  ${result.passed ? '✅' : '❌'} Normalization tests: ${result.tests.filter(t => t.passed).length}/${result.tests.length} passed`);

  } catch (error) {
    result.error = error.message;
    console.log(`  ❌ Normalization test error: ${error.message}`);
  }

  return result;
}

function compareConfigs(config1, config2, path = '') {
  const differences = [];

  function compare(obj1, obj2, currentPath) {
    if (obj1 === obj2) return;

    if (typeof obj1 !== typeof obj2) {
      differences.push(`${currentPath}: type mismatch (${typeof obj1} vs ${typeof obj2})`);
      return;
    }

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) {
        differences.push(`${currentPath}: array length mismatch (${obj1.length} vs ${obj2.length})`);
        return;
      }
      obj1.forEach((item, index) => {
        compare(item, obj2[index], `${currentPath}[${index}]`);
      });
      return;
    }

    if (typeof obj1 === 'object' && obj1 !== null && obj2 !== null) {
      const keys1 = Object.keys(obj1).sort();
      const keys2 = Object.keys(obj2).sort();

      const allKeys = [...new Set([...keys1, ...keys2])];
      allKeys.forEach(key => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (!(key in obj1)) {
          differences.push(`${newPath}: missing in first config`);
        } else if (!(key in obj2)) {
          differences.push(`${newPath}: missing in second config`);
        } else {
          compare(obj1[key], obj2[key], newPath);
        }
      });
      return;
    }

    if (obj1 !== obj2) {
      differences.push(`${currentPath}: value mismatch (${JSON.stringify(obj1)} vs ${JSON.stringify(obj2)})`);
    }
  }

  compare(config1, config2, path);

  return {
    identical: differences.length === 0,
    differences
  };
}

// Run tests
runTests()
  .then(results => {
    const exitCode = results.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
