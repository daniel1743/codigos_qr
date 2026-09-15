/** Part 5/8: Bio → child link capability proof (no primary-profile mutation). */

const CANONICAL_ORIGIN = "https://www.cripqer.dev";

async function runBioLinking(page, out) {
  const linkHostUrls = {};
  const pages =
    out.generated && out.generated.services ? out.generated : await collectGeneratedPages();
  for (const objective of OBJECTIVES) {
    const generated = pages[objective.key];
    if (generated && generated.public_id) {
      linkHostUrls[objective.key] = `/pg/${generated.public_id}`;
    }
  }
  if (Object.keys(linkHostUrls).length !== 3) {
    out.bio_linking = { skipped: "missing generated pages", targets: linkHostUrls };
    return out;
  }

  const services = pages.services;
  const sourceQuery = `/pages?select=published_template_config&id=eq.${services.page_id}`;
  const sourceRow = (await rest(sourceQuery)).payload?.[0];
  const envelope = sourceRow ? sourceRow.published_template_config : null;
  if (!envelope) {
    out.bio_linking = { skipped: "no published snapshot to copy blocks from" };
    return out;
  }

  const ctaBlock = envelope.editorConfig.blocks.find((block) => block.type === "cta");
  const makeBlock = (key, suffix, url) => ({
    ...ctaBlock,
    id: `qa-bio-link-${suffix}-${key}`,
    content: { ...ctaBlock.content, title: `Ver ${key}`, label: `Ir a ${key}`, url },
  });

  const absoluteUrls = {};
  const linkBlocks = [];
  for (const [key, relative] of Object.entries(linkHostUrls)) {
    absoluteUrls[key] = CANONICAL_ORIGIN + relative;
    linkBlocks.push(makeBlock(key, "abs", absoluteUrls[key]));
    linkBlocks.push(makeBlock(key, "rel", relative));
  }

  const hostEnvelope = {
    schemaVersion: 1,
    editorConfig: {
      ...envelope.editorConfig,
      pageInstanceId: `qa-bio-link-host-${STAMP}`,
      blocks: [...envelope.editorConfig.blocks, ...linkBlocks],
    },
  };

  const identityQuery = `/profiles?select=id,user_id&public_id=eq.${PROFILE_PUBLIC_ID}`;
  const identity = (await rest(identityQuery)).payload?.[0];
  const hostRow = (
    await rest("/pages", {
      method: "POST",
      body: JSON.stringify({
        owner_user_id: identity.user_id,
        profile_id: identity.id,
        title: `QA PAGES_7B Link host ${STAMP}`,
        page_type: "landing",
        template_config: hostEnvelope,
        published_template_config: null,
        published: false,
        published_revision: 0,
        slug: null,
      }),
    })
  ).payload?.[0];

  await page.goto(BASE + "/pages/" + hostRow.id + "/edit", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  let hostEditor = false;
  try {
    await page.waitForSelector('[data-testid="power-editor"]', { timeout: 60000 });
    hostEditor = true;
  } catch {}
  await page.getByRole("button", { name: "Publicar" }).first().click();
  await page.waitForTimeout(6000);
  const hostAfter = (await rest(`/pages?select=*&id=eq.${hostRow.id}`)).payload?.[0] ?? null;

  const hostFetch = await fetchPublicPage(hostAfter.public_id);
  const hrefs = Array.from(hostFetch.html.matchAll(/href="([^"]*)"/g)).map((match) => match[1]);
  const observations = {};
  for (const [key, relative] of Object.entries(linkHostUrls)) {
    observations[key] = {
      absolute_url: absoluteUrls[key],
      absolute_rendered: hrefs.includes(absoluteUrls[key]),
      relative_target: relative,
      relative_rendered: hrefs.includes(relative),
      relative_observed_as:
        hrefs.find((href) => href.indexOf(relative.replace(/^\//, "")) >= 0) ?? null,
    };
  }

  out.bio_linking = {
    host_page_id: hostRow.id,
    host_public_id: hostAfter ? hostAfter.public_id : null,
    host_editor_accepted_document: hostEditor,
    host_published: hostAfter ? hostAfter.published : null,
    host_publish_http: hostFetch.status,
    canonical_origin: CANONICAL_ORIGIN,
    observations,
  };
  return out;
}
