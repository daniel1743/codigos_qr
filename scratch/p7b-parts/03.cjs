/** Part 3/6: real SSR public-route checks (no browser) + light mobile pass. */

async function fetchPublicPage(publicId) {
  const response = await fetch(BASE + "/pg/" + publicId, { redirect: "manual" });
  const html = await response.text();
  return { status: response.status, html };
}

function isHostActionHref(href) {
  return (
    href.indexOf("wa.me") >= 0 ||
    href.indexOf("whatsapp") >= 0 ||
    href.indexOf("qa-cripqer.example") >= 0
  );
}

async function inspectPublicPage(publicId, expectation) {
  const { status, html } = await fetchPublicPage(publicId);
  const hrefs = Array.from(html.matchAll(/href="([^"]+)"/g)).map((match) => match[1]);
  const imageSources = Array.from(html.matchAll(/<img[^>]+src="([^"]+)"/g)).map(
    (match) => match[1],
  );
  return {
    http: status,
    renderer_mounted: html.includes("pts-") || html.includes("<main"),
    editor_chrome: html.includes('data-testid="power-editor"'),
    content_visible: expectation.must_include.filter((text) => html.includes(text)),
    content_missing: expectation.must_include.filter((text) => !html.includes(text)),
    host_action_hrefs: hrefs.filter(isHostActionHref),
    owner_images: imageSources.filter((source) => source.includes("cripqer-p7b-")).length,
    html_bytes: html.length,
  };
}

async function checkMobile(page, publicId) {
  const out = {};
  const sizes = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    const response = await page.goto(BASE + "/pg/" + publicId, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(2000);
    const html = await page.evaluate(() => document.body.innerHTML);
    out[`${viewport.width}x${viewport.height}`] = {
      http: response ? response.status() : null,
      overflow: await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      cta_reachable: html.includes(WHATSAPP) || html.includes("qa-cripqer.example"),
    };
  }
  return out;
}
