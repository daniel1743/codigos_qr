/**
 * QA-only synthetic entity seeder for Analytics V1.1 Phase C2B2.
 *
 * Creates exactly one synthetic QA auth user + profile + published direct page
 * in the dedicated cripqer-qa project, then prints the canonical identities.
 * It NEVER touches production and refuses unless QA_PROJECT_REF matches.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(new URL("../.env.qa", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const ref = env.QA_PROJECT_REF;
if (ref !== "tjigzcyoogmvdkivypym") {
  throw new Error(`Refusing to seed: expected QA project tjigzcyoogmvdkivypym, got "${ref}".`);
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const QA_EMAIL = "qa-c2b2-analytics@cripqer.test";
const QA_PASSWORD = "CripqerQA!2026";
const QA_PUBLIC_ID = "qa-c2b2-canonical-page";
const QA_SLUG = "qa-c2b2-canonical-page";

function pageDocument() {
  return {
    documentType: "direct-page",
    version: 1,
    theme: {
      pageBackground: "#f7f4ef",
      surface: "#ffffff",
      primaryText: "#1f2937",
      secondaryText: "#6b7280",
      accent: "#0f766e",
      border: "#e5e7eb",
      fontFamily: "Inter",
      typographyScale: {},
      radius: 24,
      buttonStyle: {},
      spacingScale: {},
      contentWidth: 960,
    },
    blocks: [
      {
        id: "qa-hero",
        type: "hero",
        variant: "default",
        visible: true,
        visibility: { desktop: true, tablet: true, mobile: true },
        layout: { spacing: "normal", width: "content", alignment: "center" },
        content: {
          eyebrow: "QA sintético",
          title: "Página QA C2B2 — Canonical Analytics",
          subtitle: "Página de prueba del writer canónico V1.1",
          description: "Contenido sintético propiedad del QA de Cripqer.",
          primaryCTA: { label: "Agendar consulta QA", url: "https://example.com/qa-cta" },
        },
        style: {},
      },
      {
        id: "qa-text",
        type: "text",
        variant: "default",
        visible: true,
        visibility: { desktop: true, tablet: true, mobile: true },
        layout: { spacing: "normal", width: "content", alignment: "left" },
        content: {
          title: "Sobre esta página",
          body: "Esta página existe únicamente para instrumentar y verificar eventos analíticos canónicos en cripqer-qa.",
        },
        style: {},
      },
      {
        id: "qa-links",
        type: "links",
        variant: "cards",
        visible: true,
        visibility: { desktop: true, tablet: true, mobile: true },
        layout: { spacing: "normal", width: "content", alignment: "left" },
        content: {
          title: "Enlaces",
          items: [
            { id: "qa-external", title: "Sitio externo de ejemplo", ctaUrl: "https://example.com/qa-external" },
          ],
        },
        style: {},
      },
      {
        id: "qa-social",
        type: "social",
        variant: "icons",
        visible: true,
        visibility: { desktop: true, tablet: true, mobile: true },
        layout: { spacing: "normal", width: "content", alignment: "left" },
        content: {
          title: "Redes",
          items: [
            { id: "qa-whatsapp", title: "WhatsApp QA", ctaUrl: "https://wa.me/56900000000" },
            { id: "qa-instagram", title: "Instagram QA", ctaUrl: "https://instagram.com/cripqer.qa" },
          ],
        },
        style: {},
      },
    ],
    footer: { visible: true, content: { branding: "Cripqer" } },
  };
}

const envelope = {
  schemaVersion: 1,
  documentType: "direct-page",
  editorConfig: pageDocument(),
};


async function main() {
  // 1) Auth user (idempotent by email).
  let userId = null;
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = (existing?.users ?? []).find((u) => u.email === QA_EMAIL);
  if (found) {
    userId = found.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: QA_EMAIL,
      password: QA_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "qa_analytics_owner" },
    });
    if (error) throw new Error(`createUser failed: ${error.message}`);
    userId = data.user.id;
  }

  // 2) Profile.
  let profileId = null;
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileRow) {
    profileId = profileRow.id;
  } else {
    const { data: createdProfile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        slug: "qa-c2b2-analytics",
        display_name: "QA C2B2 Analytics Owner",
        bio: "Perfil sintético de QA para el writer canónico V1.1.",
        profession: "QA",
        published: true,
      })
      .select("id")
      .single();
    if (profileError) throw new Error(`profile insert failed: ${profileError.message}`);
    profileId = createdProfile.id;
  }

  // 3) Published direct page.
  let pageId = null;
  const { data: pageRow } = await supabase
    .from("pages")
    .select("id")
    .eq("public_id", QA_PUBLIC_ID)
    .maybeSingle();
  if (pageRow) {
    pageId = pageRow.id;
    await supabase
      .from("pages")
      .update({
        title: "Página QA C2B2 — Canonical Analytics",
        published: true,
        published_revision: 1,
        published_at: new Date().toISOString(),
        published_template_config: envelope,
        template_config: envelope,
        slug: QA_SLUG,
      })
      .eq("id", pageId);
  } else {
    const { data: createdPage, error: pageError } = await supabase
      .from("pages")
      .insert({
        owner_user_id: userId,
        profile_id: profileId,
        public_id: QA_PUBLIC_ID,
        title: "Página QA C2B2 — Canonical Analytics",
        page_type: "landing",
        published: true,
        published_revision: 1,
        published_at: new Date().toISOString(),
        published_template_config: envelope,
        template_config: envelope,
        slug: QA_SLUG,
      })
      .select("id")
      .single();
    if (pageError) throw new Error(`page insert failed: ${pageError.message}`);
    pageId = createdPage.id;
  }

  console.log(
    JSON.stringify(
      {
        projectRef: ref,
        qaUserId: userId,
        qaProfileId: profileId,
        qaPageId: pageId,
        qaPublicId: QA_PUBLIC_ID,
        qaSlug: QA_SLUG,
        qaEmail: QA_EMAIL,
        publicUrl: `https://www.cripqer.dev/pg/${QA_PUBLIC_ID}`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
