/** Part 6/8: browser session helper, regression checks, QA cleanup. */

const LAUNCH_ARGS = [
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-extensions",
  "--disable-background-networking",
];

async function withBrowser(run) {
  const browser = await chromium.launch({ args: LAUNCH_ARGS });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (error) => errors.push("pageerror: " + error.message));
    const value = await run({ browser, page, context });
    return { value, errors };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runRegressions(before, out) {
  const after = {
    profile: await profileByPublicId(PROFILE_PUBLIC_ID),
    child: await pageByPublicId(EXISTING_CHILD_PUBLIC_ID),
  };
  out.regressions = {
    profile_revision: after.profile ? after.profile.published_revision : null,
    profile_revision_unchanged: Boolean(
      after.profile &&
        before.profile &&
        after.profile.published_revision === before.profile.published_revision,
    ),
    profile_slug_unchanged: Boolean(
      after.profile && before.profile && after.profile.slug === before.profile.slug,
    ),
    profile_canonical_unchanged:
      digest(after.profile ? after.profile.template_config : null) ===
      digest(before.profile ? before.profile.template_config : null),
    child_revision: after.child ? after.child.published_revision : null,
    child_revision_unchanged: Boolean(
      after.child &&
        before.child &&
        after.child.published_revision === before.child.published_revision,
    ),
    child_slug_unchanged: Boolean(
      after.child && before.child && after.child.slug === before.child.slug,
    ),
    child_canonical_unchanged:
      digest(after.child ? after.child.template_config : null) ===
      digest(before.child ? before.child.template_config : null),
    child_published_unchanged:
      digest(after.child ? after.child.published_template_config : null) ===
      digest(before.child ? before.child.published_template_config : null),
    child_qr_unchanged:
      digest(after.child ? after.child.qr_config : null) ===
      digest(before.child ? before.child.qr_config : null),
  };
  return out;
}

async function runCleanup(out) {
  const qaRows = (await rest("/pages?select=id,public_id,title&title=like.QA*")).payload || [];
  const deletions = [];
  for (const row of qaRows) {
    const response = await rest(`/pages?id=eq.${row.id}`, { method: "DELETE" });
    deletions.push({ public_id: row.public_id, status: response.status });
  }
  const leftover = (await rest("/pages?select=id&title=like.QA*")).payload || [];
  out.cleanup = { deleted: deletions.length, leftovers: leftover.length, deletions };
  return out;
}
