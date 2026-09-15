/** Part 4/6: phases (generate / editor+publish / mobile) and QR, alias, Bio→child. */

function objectivesForSelection(selection) {
  if (!selection || selection === "all") return OBJECTIVES;
  return OBJECTIVES.filter((objective) => objective.key === selection);
}

async function step(label, out, run) {
  try {
    return await run();
  } catch (error) {
    out.errors = out.errors || [];
    out.errors.push(`${label}: ${String(error).split("\n")[0]}`);
    return null;
  }
}

async function findGeneratedPage(label) {
  const encoded = encodeURIComponent(`QA PAGES_7B ${label}*`);
  const query = `/pages?select=id,public_id,page_type,title&title=like.${encoded}`;
  const row = (await rest(query)).payload?.[0] ?? null;
  if (!row) return null;
  return { page_id: row.id, public_id: row.public_id, page_type: row.page_type, title: row.title };
}

async function collectGeneratedPages() {
  const labels = { services: "Servicios", catalog: "Catálogo", portfolio: "Portafolio" };
  const pages = {};
  for (const objective of OBJECTIVES) {
    const found = await findGeneratedPage(labels[objective.key]);
    if (found) pages[objective.key] = found;
  }
  return pages;
}

async function runQrAndAlias(page, out) {
  const services =
    (out.generated && out.generated.services) || (await findGeneratedPage("Servicios"));
  if (!services || !services.page_id) return out;

  await page.goto(BASE + "/pages/" + services.page_id, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "QR / Compartir" }).click();
  await page.waitForTimeout(3000);
  const detailText = await page.evaluate(() => document.body.innerText);
  out.qr = {
    public_id: services.public_id,
    panel_open: detailText.indexOf("QR de esta p") >= 0,
    destination_is_stable_route: detailText.indexOf(`/pg/${services.public_id}`) >= 0,
    public_id_shown: detailText.indexOf(services.public_id) >= 0,
  };

  const alias = `qa-p7b-${STAMP}`;
  await page.locator("#page_alias").fill(alias);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.waitForTimeout(2500);
  const aliasFetch = await fetchPublicPage(`a/${alias}`);
  out.alias = {
    slug: alias,
    http: aliasFetch.status,
    same_content: aliasFetch.html.includes("Corte clásico"),
  };
  return out;
}
