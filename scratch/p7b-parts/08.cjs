/** Part 8/8: phase-driven runner and entry point. */

async function runPhase(mode, phase, out) {
  const objective = OBJECTIVES.find((item) => item.key === mode);
  if (mode !== "extras" && !objective) {
    out.fatal = `unknown objective: ${mode}`;
    return out;
  }

  if (mode === "extras") {
    const before = {
      profile: await profileByPublicId(PROFILE_PUBLIC_ID),
      child: await pageByPublicId(EXISTING_CHILD_PUBLIC_ID),
    };
    out.pages = await collectGeneratedPages();

    if (phase === "cleanup") {
      await runCleanup(out);
      await runRegressions(before, out);
      return out;
    }

    const session = await withBrowser(async ({ page, context }) => {
      out.auth = await signIn(context);
      if (!out.auth) return null;
      if (phase === "qr" || phase === "all") {
        await step("qr-alias", out, () => runQrAndAlias(page, out));
      }
      if (phase === "bio" || phase === "all") {
        await step("bio-linking", out, () => runBioLinking(page, out));
      }
      return true;
    });
    out.runtime_errors = session.errors;
    await runRegressions(before, out);
    if (phase === "all") await runCleanup(out);
    return out;
  }

  if (phase === "generate" || phase === "all") {
    const session = await step("generate", out, () =>
      withBrowser(async ({ page, context }) => {
        out.auth = await signIn(context);
        if (!out.auth) return null;
        return generateObjective(page, objective);
      }),
    );
    out.generated = session && session.value ? session.value : null;
    if (session) out.runtime_errors = session.errors;
  }

  const page = await step("lookup", out, () => newestQaPage(mode));
  out.page = page;
  if (!page || !page.page_id) return out;

  if (phase === "public" || phase === "all") {
    out.public = await step("public", out, () =>
      inspectPublicPage(page.public_id, CONTENT_EXPECTATIONS[mode]),
    );
  }

  if (phase === "editor" || phase === "all") {
    const session = await step("editor", out, () =>
      withBrowser(async ({ page: editorPage, context }) => {
        out.auth = await signIn(context);
        return openEditorAndPublish(editorPage, page.page_id);
      }),
    );
    out.editor = session && session.value ? session.value : null;
    if (session) out.runtime_errors = (out.runtime_errors || []).concat(session.errors);
  }

  if (phase === "mobile" || phase === "all") {
    const session = await step("mobile", out, () =>
      withBrowser(({ page: mobilePage }) => checkMobile(mobilePage, page.public_id)),
    );
    out.mobile = session && session.value ? session.value : null;
  }

  return out;
}

async function main() {
  const mode = readMode();
  const phase = readPhase();
  const out = { stamp: STAMP, mode, phase, at: new Date().toISOString() };
  const before = {
    profile: await profileByPublicId(PROFILE_PUBLIC_ID),
    child: await pageByPublicId(EXISTING_CHILD_PUBLIC_ID),
  };
  out.before = {
    profile_revision: before.profile ? before.profile.published_revision : null,
    child_revision: before.child ? before.child.published_revision : null,
  };
  await runPhase(mode, phase, out);
  await runRegressions(before, out);
  return out;
}

main()
  .then((out) => {
    const text = JSON.stringify(out, null, 2);
    try {
      fs.writeFileSync(`scratch/qa-p7b-${out.mode}-${out.phase}.json`, text);
    } catch {}
    console.log(text);
  })
  .catch((error) => {
    const text = JSON.stringify({ fatal: String(error) }, null, 2);
    try {
      fs.writeFileSync("scratch/qa-p7b-failed.json", text);
    } catch {}
    console.log(text);
    process.exit(1);
  });
