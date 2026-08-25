// test-s9.cjs — S9 Smart Actions / CTAs Playwright QA Script
const { chromium } = require('playwright');

const BASE = 'http://localhost:8080/template-builder.html';
const TIMEOUT = 10000;

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const results = {
        actionTypes: [],
        urlSafety: [],
        roundtrip: [],
        responsive: [],
        regression: []
    };

    try {
        // ============================================================
        // LOAD PAGE
        // ============================================================
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // ============================================================
        // TEST: ACTION_TYPES registry exists
        // ============================================================
        const hasActionTypes = await page.evaluate(() => {
            return typeof ACTION_TYPES !== 'undefined' && Array.isArray(ACTION_TYPES) && ACTION_TYPES.length >= 7;
        });
        results.actionTypes.push({ test: 'ACTION_TYPES registry exists', status: hasActionTypes ? 'PASS' : 'FAIL' });

        // ============================================================
        // TEST: resolveActionHref exists and works
        // ============================================================
        const hrefTests = await page.evaluate(() => {
            const tests = [];
            // URL
            tests.push({
                type: 'url',
                input: { actionType: 'url', url: 'https://example.com' },
                expected: 'https://example.com',
                result: resolveActionHref({ actionType: 'url', url: 'https://example.com' })
            });
            // Phone
            tests.push({
                type: 'phone',
                input: { actionType: 'phone', url: '+56 9 1234 5678' },
                expected: 'tel:+56912345678',
                result: resolveActionHref({ actionType: 'phone', url: '+56 9 1234 5678' })
            });
            // Email
            tests.push({
                type: 'email',
                input: { actionType: 'email', url: 'test@example.com' },
                expected: 'mailto:test@example.com',
                result: resolveActionHref({ actionType: 'email', url: 'test@example.com' })
            });
            // WhatsApp
            const waResult = resolveActionHref({ actionType: 'whatsapp', url: '+56912345678', waMessage: 'Hola!' });
            tests.push({
                type: 'whatsapp',
                result: waResult,
                passesCheck: waResult.includes('wa.me/56912345678') && waResult.includes('Hola')
            });
            // Location
            tests.push({
                type: 'location',
                result: resolveActionHref({ actionType: 'location', url: 'https://maps.google.com/test' }),
                expected: 'https://maps.google.com/test'
            });
            // Booking
            tests.push({
                type: 'booking',
                result: resolveActionHref({ actionType: 'booking', url: 'https://calendly.com/test' }),
                expected: 'https://calendly.com/test'
            });
            // Download
            tests.push({
                type: 'download',
                result: resolveActionHref({ actionType: 'download', url: 'https://example.com/file.pdf' }),
                expected: 'https://example.com/file.pdf'
            });
            return tests;
        });

        for (const t of hrefTests) {
            const pass = t.passesCheck !== undefined ? t.passesCheck : (t.result === t.expected);
            results.actionTypes.push({ test: `CTA-${t.type.toUpperCase()} href resolution`, status: pass ? 'PASS' : 'FAIL', detail: t.result });
        }

        // ============================================================
        // TEST: URL Safety
        // ============================================================
        const safetyTests = await page.evaluate(() => {
            const dangerous = [
                { url: 'javascript:alert(1)', type: 'url' },
                { url: 'data:text/html,<h1>X</h1>', type: 'url' },
                { url: 'file:///etc/passwd', type: 'url' },
                { url: 'vbscript:MsgBox(1)', type: 'url' },
            ];
            return dangerous.map(d => ({
                input: d.url,
                result: resolveActionHref({ actionType: d.type, url: d.url }),
                blocked: resolveActionHref({ actionType: d.type, url: d.url }) === '#'
            }));
        });

        for (const s of safetyTests) {
            results.urlSafety.push({ test: `Reject ${s.input.split(':')[0]}:`, status: s.blocked ? 'PASS' : 'FAIL', detail: s.result });
        }

        // Validation tests
        const validationTests = await page.evaluate(() => {
            return [
                { type: 'phone', val: 'abc', result: validateActionInput('phone', 'abc') },
                { type: 'email', val: 'notanemail', result: validateActionInput('email', 'notanemail') },
                { type: 'phone', val: '+56912345678', result: validateActionInput('phone', '+56912345678') },
                { type: 'email', val: 'test@test.com', result: validateActionInput('email', 'test@test.com') },
            ];
        });
        for (const v of validationTests) {
            const expectedValid = v.val.includes('@') || v.val.startsWith('+');
            results.urlSafety.push({ test: `Validate ${v.type}: "${v.val}"`, status: (v.result.valid === expectedValid) ? 'PASS' : 'FAIL', detail: v.result });
        }

        // ============================================================
        // TEST: Round-trip — create button, set action, serialize, reload
        // ============================================================
        const roundtripResult = await page.evaluate(() => {
            // Add a new button
            addButton();
            const newBtn = appState.links[appState.links.length - 1];
            const btnId = newBtn.id;

            // Configure it as WhatsApp
            newBtn.actionType = 'whatsapp';
            newBtn.url = '+56912345678';
            newBtn.waMessage = 'Hola desde Cripqer';
            newBtn.text = 'WhatsApp Test';
            newBtn.icon = 'fa-brands fa-whatsapp';

            // Serialize
            const config = window.getTemplateConfig();
            const serialized = JSON.stringify(config);

            // Reload
            window.loadTemplateConfig(JSON.parse(serialized));

            // Find the button again
            const loaded = appState.links.find(b => b.id === btnId);
            if (!loaded) return { pass: false, reason: 'Button not found after reload' };

            return {
                pass: loaded.actionType === 'whatsapp' &&
                      loaded.url === '+56912345678' &&
                      loaded.waMessage === 'Hola desde Cripqer' &&
                      loaded.text === 'WhatsApp Test' &&
                      loaded.icon === 'fa-brands fa-whatsapp',
                loaded: {
                    actionType: loaded.actionType,
                    url: loaded.url,
                    waMessage: loaded.waMessage,
                    text: loaded.text,
                    icon: loaded.icon
                }
            };
        });
        results.roundtrip.push({ test: 'WhatsApp button roundtrip', status: roundtripResult.pass ? 'PASS' : 'FAIL', detail: roundtripResult });

        // Test backward compat: old button without actionType
        const backwardCompat = await page.evaluate(() => {
            const oldConfig = window.getTemplateConfig();
            // Remove actionType from first button to simulate old config
            if (oldConfig.links && oldConfig.links.length > 0) {
                delete oldConfig.links[0].actionType;
                delete oldConfig.links[0].waMessage;
            }
            window.loadTemplateConfig(oldConfig);
            const firstBtn = appState.links[0];
            return {
                pass: firstBtn.actionType !== undefined && firstBtn.waMessage !== undefined,
                actionType: firstBtn.actionType,
                waMessage: firstBtn.waMessage
            };
        });
        results.roundtrip.push({ test: 'Backward compat (old button without actionType)', status: backwardCompat.pass ? 'PASS' : 'FAIL', detail: backwardCompat });

        // Mixed template test: 5 different action types
        const mixedTest = await page.evaluate(() => {
            // Clear and create 5 buttons
            appState.links = [
                { id: 'mix1', text: 'Visitar web', icon: 'fa-solid fa-link', url: 'https://example.com', fullWidth: false, actionType: 'url', waMessage: '' },
                { id: 'mix2', text: 'Llamar', icon: 'fa-solid fa-phone', url: '+56912345678', fullWidth: false, actionType: 'phone', waMessage: '' },
                { id: 'mix3', text: 'WhatsApp', icon: 'fa-brands fa-whatsapp', url: '+56912345678', fullWidth: false, actionType: 'whatsapp', waMessage: 'Hola' },
                { id: 'mix4', text: 'Reservar', icon: 'fa-regular fa-calendar', url: 'https://calendly.com/test', fullWidth: false, actionType: 'booking', waMessage: '' },
                { id: 'mix5', text: 'Ubicación', icon: 'fa-solid fa-location-dot', url: 'https://maps.google.com/test', fullWidth: false, actionType: 'location', waMessage: '' },
            ];
            renderCanvas();
            renderControlsList();

            // Check canvas has 5 buttons
            const rendered = document.querySelectorAll('#view-buttons-grid .render-btn');
            // Check hrefs
            const hrefs = Array.from(rendered).map(a => a.href);
            return {
                count: rendered.length,
                pass: rendered.length === 5,
                hrefs: hrefs
            };
        });
        results.roundtrip.push({ test: 'Mixed template (5 action types)', status: mixedTest.pass ? 'PASS' : 'FAIL', detail: mixedTest });

        // ============================================================
        // TEST: Responsive — action selector at different viewports
        // ============================================================
        const viewports = [
            { width: 375, height: 812, label: 'iPhone 13' },
            { width: 1280, height: 800, label: 'Desktop' },
        ];
        for (const vp of viewports) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.waitForTimeout(500);
            // Check if action selector is visible and not overflowing
            const overflow = await page.evaluate(() => {
                const selects = document.querySelectorAll('#buttons-control-list select');
                for (const sel of selects) {
                    const rect = sel.getBoundingClientRect();
                    if (rect.right > window.innerWidth || rect.left < 0) return true;
                }
                return false;
            });
            results.responsive.push({ test: `Controls fit at ${vp.label} (${vp.width}x${vp.height})`, status: !overflow ? 'PASS' : 'FAIL' });
        }

        // ============================================================
        // TEST: Regression — basic S1-S8 checks
        // ============================================================
        // Check themes exist
        const themesExist = await page.evaluate(() => typeof PREMIUM_THEMES !== 'undefined' && Array.isArray(PREMIUM_THEMES) && PREMIUM_THEMES.length > 0);
        results.regression.push({ test: 'Themes registry exists', status: themesExist ? 'PASS' : 'FAIL' });

        // Check button presets exist
        const presetsExist = await page.evaluate(() => typeof BUTTON_PRESETS !== 'undefined' && Object.keys(BUTTON_PRESETS).length >= 6);
        results.regression.push({ test: 'Button presets exist (>=6)', status: presetsExist ? 'PASS' : 'FAIL' });

        // Check socials system exists
        const socialsExist = await page.evaluate(() => appState.socials && Array.isArray(appState.socials.items));
        results.regression.push({ test: 'S8 socials system exists', status: socialsExist ? 'PASS' : 'FAIL' });

        // Check avatar upload function
        const avatarFn = await page.evaluate(() => typeof handleImageUpload === 'function');
        results.regression.push({ test: 'Avatar upload function exists', status: avatarFn ? 'PASS' : 'FAIL' });

        // Check banner system
        const bannerExists = await page.evaluate(() => appState.appearance && appState.appearance.banner !== undefined);
        results.regression.push({ test: 'Banner system exists', status: bannerExists ? 'PASS' : 'FAIL' });

        // Check getTemplateConfig / loadTemplateConfig
        const configFns = await page.evaluate(() => typeof window.getTemplateConfig === 'function' && typeof window.loadTemplateConfig === 'function');
        results.regression.push({ test: 'Config roundtrip functions exist', status: configFns ? 'PASS' : 'FAIL' });

        // Check addButton / removeButton
        const btnFns = await page.evaluate(() => typeof addButton === 'function' && typeof removeButton === 'function');
        results.regression.push({ test: 'Button add/remove functions exist', status: btnFns ? 'PASS' : 'FAIL' });

    } catch (err) {
        console.error('Test error:', err.message);
        results.actionTypes.push({ test: 'GLOBAL', status: 'FAIL', detail: err.message });
    }

    await browser.close();

    // ============================================================
    // PRINT RESULTS
    // ============================================================
    console.log('\n============================================================');
    console.log('S9 SMART ACTIONS — QA RESULTS');
    console.log('============================================================\n');

    let totalPass = 0, totalFail = 0;

    for (const [category, tests] of Object.entries(results)) {
        console.log(`--- ${category.toUpperCase()} ---`);
        for (const t of tests) {
            const icon = t.status === 'PASS' ? '✓' : '✗';
            console.log(`  ${icon} ${t.test}: ${t.status}`);
            if (t.status === 'PASS') totalPass++;
            else totalFail++;
        }
        console.log('');
    }

    console.log(`TOTAL: ${totalPass} PASS, ${totalFail} FAIL`);
    console.log(totalFail === 0 ? '\n★ ALL TESTS PASSED ★' : '\n✗ SOME TESTS FAILED');

    // Write results to JSON files
    const fs = require('fs');
    const dir = 'artifacts/simple-editor/s9-smart-actions';
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/s9-action-type-results.json`, JSON.stringify(results.actionTypes, null, 2));
    fs.writeFileSync(`${dir}/s9-url-safety-results.json`, JSON.stringify(results.urlSafety, null, 2));
    fs.writeFileSync(`${dir}/s9-roundtrip-results.json`, JSON.stringify(results.roundtrip, null, 2));
    fs.writeFileSync(`${dir}/s9-responsive-results.json`, JSON.stringify(results.responsive, null, 2));
    fs.writeFileSync(`${dir}/s9-regression-results.json`, JSON.stringify(results.regression, null, 2));
    console.log(`\nResults written to ${dir}/`);

    process.exit(totalFail > 0 ? 1 : 0);
}

run();
