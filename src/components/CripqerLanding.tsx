import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import PlatformFooter from "./brand/PlatformFooter";
import PlatformNavbar from "./brand/PlatformNavbar";

/**
 * CRIPQER — Landing pública narrativa.
 * Archivo autocontenido: sin dependencias externas, sin librerías de iconos,
 * sin Tailwind. Todo el CSS vive en <style> dentro de este archivo.
 *
 * Integración: copiar el archivo, montarlo en la ruta pública "/" y conectar
 * los CTAs (data-cta="crear-qr" | "ver-disenos" | "login") a las rutas reales.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DIRECCIÓN DE MARCA: PREMIUM BLACK
 * Negro profundo + marfil cálido + grises neutros + un acento champagne
 * sobrio. La interfaz actúa como una galería premium: enmarca el producto
 * sin competir con las plantillas, la fotografía y las identidades de los
 * usuarios, que son las protagonistas visuales.
 * ────────────────────────────────────────────────────────────────────────────
 * SLOTS DE IMAGEN FINAL
 * Las constantes de `MEDIA` definen los espacios de imagen definitivos.
 * Mientras una constante sea `null`, se muestra un contenedor placeholder
 * pulido (con ratio, radio, recorte y overlay ya resueltos). Cuando exista
 * la fotografía/screenshot final, basta asignar la URL — el layout ya sabe
 * exactamente dónde y cómo se recorta cada imagen, en desktop y en mobile.
 * ────────────────────────────────────────────────────────────────────────────
 */

/* ============================ MEDIA — SLOTS ============================ */
/**
 * Asignar aquí las URLs finales (fotografía propia / screenshots reales).
 * Cada slot ya define: aspect ratio, posición, border-radius, object-fit
 * (crop), overlay, tamaño desktop y tamaño mobile. No tocar el layout.
 */
const MEDIA = {
  /** HERO — persona real + smartphone premium + plantilla Cripqer + QR.
   *  Slot: ratio 4/5, radius 26px, crop cover, overlay inferior sutil. */
  heroVisualUrl: "/hero 1.png",
  /** CREADOR — creador/influencer + contexto social + destino Cripqer.
   *  Slot: ratio 4/5, radius 22px, crop cover. */
  creatorStoryUrl: "/influencer.png",
  /** RESTAURANT — ambiente restaurante/café + QR físico en mesa/carta +
   *  persona escaneando. Slot: ratio 4/3, radius 22px, crop cover. */
  restaurantStoryUrl: "/qr retaurant.png",
  /** PROFESIONAL — persona profesional + perfil profesional Cripqer.
   *  Slot: ratio 4/5, radius 22px, crop cover. */
  professionalStoryUrl: "/antonella aria.png",
  /** EDITOR — screenshot real del editor Cripqer (16/10, radius 22px). */
  editorVisualUrl: null as string | null,
};

/* Screenshots reales de plantillas: asignar `shot` por plantilla cuando
 * existan los assets. El grid ya reserva ratio 9/15 con crop cover. */
const TEMPLATE_SHOTS: Record<string, string | null> = {
  Profesional: null,
  Belleza: null,
  Creador: null,
  Premium: null,
  Negocio: null,
  Fotografía: null,
  Lifestyle: null,
  Minimal: null,
};

const css = `
:root {
  /* ── Premium Black palette ─────────────────────────────────────────── */
  --cq-bg: #FAF8F3;             /* marfil cálido */
  --cq-bg-soft: #F5F2EA;        /* marfil profundo (bandas alternas) */
  --cq-ink: #111111;            /* near-black */
  --cq-ink-soft: #4c4c4a;
  --cq-ink-faint: #A8A8A8;      /* gris neutro */
  --cq-line: #e3ded2;
  --cq-card: #ffffff;
  --cq-accent: #B08D57;         /* champagne envejecido, sobrio */
  --cq-accent-strong: #96784a;
  --cq-accent-soft: #f0e8da;
  --cq-dark: #090909;           /* negro profundo */
  --cq-dark-soft: #111111;
  --cq-dark-card: #1a1a1a;
  --cq-dark-line: #262626;      /* gris neutro oscuro */
  --cq-dark-text: #F5F2EA;
  --cq-dark-muted: #A8A8A8;
  --cq-radius: 18px;
  --cq-font: "Georgia", "Times New Roman", serif;
  --cq-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.cq { background: var(--cq-bg); color: var(--cq-ink); font-family: var(--cq-sans); line-height: 1.55; -webkit-font-smoothing: antialiased; }
.cq *, .cq *::before, .cq *::after { box-sizing: border-box; }
.cq img { max-width: 100%; display: block; }
.cq a { color: inherit; text-decoration: none; }
.cq-wrap { max-width: 1120px; margin: 0 auto; padding: 0 20px; }
.cq-serif { font-family: var(--cq-font); font-weight: 400; letter-spacing: -0.01em; }

/* ---------- NAV ---------- */
.cq-nav { position: sticky; top: 0; z-index: 50; background: rgba(9,9,9,0.86); backdrop-filter: blur(12px); border-bottom: 1px solid var(--cq-dark-line); color: var(--cq-dark-text); }
.cq-nav-in { display: flex; align-items: center; justify-content: space-between; height: 62px; }
.cq-logo-link { display: inline-flex; align-items: center; flex-shrink: 0; }
.cq-logo { display: inline-flex; align-items: center; width: 146px; height: 34px; flex-shrink: 0; overflow: hidden; }
.cq-logo .logo-symbol-only { display: none; }
.cq-logo .logo-horizontal-lockup { display: inline-flex; align-items: center; gap: 7px; width: 100%; height: 100%; }
.cq-logo .logo-horizontal-lockup img { display: block; width: 30px; height: 30px; flex: 0 0 30px; object-fit: contain; }
.cq-logo .logo-wordmark { font-size: 16px !important; letter-spacing: 0.12em !important; }
.cq-footer .cq-logo { width: 128px; height: 30px; }
.cq-footer .cq-logo .logo-horizontal-lockup { gap: 6px; }
.cq-footer .cq-logo .logo-horizontal-lockup img { width: 26px; height: 26px; flex-basis: 26px; }
.cq-footer .cq-logo .logo-wordmark { font-size: 14px !important; }
.cq-nav-links { display: none; gap: 26px; font-size: 14px; color: var(--cq-dark-muted); }
.cq-nav-links a:hover { color: var(--cq-dark-text); }
.cq-nav-cta { display: flex; align-items: center; gap: 14px; font-size: 14px; }
.cq-nav-cta > a:not(.cq-btn):hover { color: var(--cq-dark-text); }
@media (min-width: 860px) { .cq-nav-links { display: flex; } }
@media (max-width: 520px) {
  .cq-logo { width: 34px; height: 34px; }
  .cq-logo .logo-symbol-only { display: inline-flex; width: 100%; height: 100%; }
  .cq-logo .logo-symbol-only img { display: block; width: 100%; height: 100%; object-fit: contain; }
  .cq-logo .logo-horizontal-lockup { display: none; }
}

/* ---------- BUTTONS ---------- */
.cq-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 999px; padding: 13px 26px; font-size: 15px; font-weight: 600; cursor: pointer; border: 1px solid transparent; white-space: nowrap; transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease; }
.cq-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
.cq-btn:hover { transform: translateY(-1px); }
.cq-btn-primary, .cq a.cq-btn-primary { background: #F5F2EA; color: #111111; }
.cq-btn-primary:hover { box-shadow: 0 8px 24px rgba(0,0,0,.3); background: #ffffff; }
.cq-btn-accent, .cq a.cq-btn-accent { background: var(--cq-accent); color: #111111; }
.cq-btn-accent:hover { background: var(--cq-accent-strong); color: #FAF8F3; box-shadow: 0 8px 26px rgba(176,141,87,.35); }
.cq-btn-ghost, .cq a.cq-btn-ghost { background: transparent; color: var(--cq-ink); border-color: var(--cq-line); }
.cq-btn-ghost:hover { border-color: var(--cq-ink); }
.cq-btn-sm { padding: 9px 18px; font-size: 14px; }
.cq-nav .cq-btn-primary, .cq-nav a.cq-btn-primary { background: #F5F2EA; color: #111111; }

/* ---------- SECTIONS ---------- */
.cq-section { padding: 72px 0; }
@media (min-width: 860px) { .cq-section { padding: 110px 0; } }
.cq-band { background: var(--cq-bg-soft); }
.cq-eyebrow { display: inline-block; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--cq-accent-strong); font-weight: 700; margin-bottom: 14px; }
.cq-h2 { font-family: var(--cq-font); font-size: clamp(28px, 5vw, 44px); line-height: 1.12; margin: 0 0 16px; }
.cq-lead { font-size: 17px; color: var(--cq-ink-soft); max-width: 620px; margin: 0; }
.cq-center { text-align: center; }
.cq-center .cq-lead { margin-left: auto; margin-right: auto; }

/* ---------- HERO ---------- */
.cq-hero { padding: 56px 0 72px; overflow: hidden; background: var(--cq-dark); color: var(--cq-dark-text); position: relative; }
.cq-hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(900px 480px at 78% -10%, rgba(176,141,87,.14), transparent 60%); pointer-events: none; }
.cq-hero-grid { display: grid; gap: 44px; align-items: center; position: relative; }
@media (min-width: 900px) { .cq-hero-grid { grid-template-columns: 1.05fr 0.95fr; } .cq-hero { padding: 88px 0 104px; } }
.cq-h1 { font-family: var(--cq-font); font-size: clamp(36px, 7vw, 60px); line-height: 1.05; margin: 0 0 20px; letter-spacing: -0.015em; }
.cq-h1 em { font-style: italic; color: var(--cq-accent); }
.cq-hero-sub { font-size: 17px; color: var(--cq-dark-muted); max-width: 480px; margin: 0 0 28px; }
.cq-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.cq-hero-note { margin-top: 18px; font-size: 13px; color: #777777; }
.cq-hero .cq-btn-ghost, .cq-hero a.cq-btn-ghost { color: var(--cq-dark-text); border-color: #3a3a3a; }
.cq-hero .cq-btn-ghost:hover { border-color: var(--cq-accent); }

/* ---------- IMAGE SLOTS (espacios finales) ---------- */
/* MediaSlot: contenedor definitivo. Con URL -> <img> cover. Sin URL ->
   placeholder pulido que ya ocupa el espacio final exacto. */
.cq-slot { position: relative; overflow: hidden; border-radius: 22px; background: var(--cq-dark-soft); box-shadow: 0 28px 60px rgba(9,9,9,.22); }
.cq-slot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cq-slot-45 { aspect-ratio: 4/5; }
.cq-slot-43 { aspect-ratio: 4/3; }
.cq-slot-1610 { aspect-ratio: 16/10; border-radius: 22px; }
.cq-slot-overlay::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, rgba(9,9,9,.42), transparent 45%); pointer-events: none; }
.cq-slot-ph { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #6b6b6b; background:
  radial-gradient(120% 90% at 50% 0%, #1d1d1d 0%, #111111 55%, #0c0c0c 100%); }
.cq-slot-ph::before { content: ""; position: absolute; inset: 10px; border: 1px dashed #2e2e2e; border-radius: 14px; pointer-events: none; }
.cq-slot-ph svg { width: 30px; height: 30px; color: var(--cq-accent); opacity: .8; }
.cq-slot-ph span { font-size: 11.5px; letter-spacing: .16em; text-transform: uppercase; font-weight: 700; color: #8a8a8a; }
.cq-slot-ph small { font-size: 11px; color: #5c5c5c; max-width: 220px; text-align: center; line-height: 1.5; }
/* Slot claro (para secciones marfil) */
.cq-slot-light .cq-slot-ph { color: #9a958a; background:
  radial-gradient(120% 90% at 50% 0%, #ffffff 0%, #F5F2EA 60%, #ece7db 100%); }
.cq-slot-light .cq-slot-ph::before { border-color: #ddd6c6; }
.cq-slot-light .cq-slot-ph svg { color: var(--cq-accent); }
.cq-slot-light .cq-slot-ph span { color: #8d8674; }
.cq-slot-light .cq-slot-ph small { color: #a8a294; }
/* Etiqueta flotante dentro del slot (contexto) */
.cq-slot-tag { position: absolute; left: 16px; bottom: 16px; z-index: 2; display: inline-flex; align-items: center; gap: 8px; background: rgba(250,248,243,.96); color: var(--cq-ink); border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600; box-shadow: 0 10px 24px rgba(0,0,0,.22); }
.cq-slot-tag svg { width: 22px; height: 22px; }

/* ---------- PHONE MOCKUP ---------- */
.cq-phone { width: 250px; border-radius: 34px; background: #000; border: 1px solid #2a2a2a; padding: 10px; box-shadow: 0 34px 70px rgba(0,0,0,.55); flex-shrink: 0; }
.cq-phone-screen { border-radius: 26px; overflow: hidden; background: #fff; min-height: 480px; display: flex; flex-direction: column; }
.cq-notch { height: 22px; display: flex; justify-content: center; align-items: flex-start; background: inherit; }
.cq-notch::after { content: ""; width: 78px; height: 18px; background: #000; border-radius: 0 0 12px 12px; }
.cq-pf-banner { height: 74px; }
.cq-pf-body { padding: 0 16px 20px; margin-top: -30px; text-align: center; flex: 1; }
.cq-pf-avatar { width: 60px; height: 60px; border-radius: 50%; border: 3px solid #fff; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-family: var(--cq-font); font-size: 22px; color: #fff; }
.cq-pf-name { font-family: var(--cq-font); font-size: 18px; margin: 0; color: #111; }
.cq-pf-role { font-size: 11.5px; color: #6b6b6b; margin: 2px 0 12px; }
.cq-pf-link { display: block; font-size: 12.5px; font-weight: 600; padding: 10px 12px; border-radius: 12px; margin-bottom: 8px; text-align: center; }
.cq-pf-socials { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }
.cq-pf-socials i { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-style: normal; }
.cq-pf-socials svg { width: 14px; height: 14px; }

/* Hero composition: phone + QR card + context chip (vive dentro del slot hero) */
.cq-hero-visual { position: relative; display: flex; justify-content: center; }
.cq-hero-stage { position: relative; width: 100%; max-width: 440px; aspect-ratio: 4/5; border-radius: 26px; background:
  radial-gradient(130% 90% at 70% 0%, #1f1c17 0%, #111111 55%, #0a0a0a 100%);
  border: 1px solid #232323; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 34px 80px rgba(0,0,0,.5); }
.cq-hero-stage::before { content: ""; position: absolute; inset: 12px; border: 1px dashed #2b2b2b; border-radius: 18px; pointer-events: none; }
.cq-hero-stage > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cq-hero-stage .cq-phone { width: 218px; }
.cq-hero-stage .cq-phone-screen { min-height: 420px; }
.cq-hero-hint { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; font-weight: 700; color: #6f6f6f; white-space: nowrap; }
.cq-qrcard { position: absolute; right: 0; bottom: 24px; z-index: 3; background: #fff; border: 1px solid #e8e2d4; border-radius: var(--cq-radius); padding: 14px; box-shadow: 0 18px 44px rgba(0,0,0,.4); text-align: center; width: 138px; }
.cq-qrcard p { font-size: 11px; color: #6b6b6b; margin: 8px 0 0; }
.cq-scanline { position: absolute; left: 0; top: 60px; z-index: 3; background: #F5F2EA; color: #111; font-size: 12px; font-weight: 600; padding: 9px 14px; border-radius: 999px; box-shadow: 0 12px 30px rgba(0,0,0,.45); display: flex; align-items: center; gap: 7px; }
.cq-scanline svg { width: 14px; height: 14px; color: var(--cq-accent-strong); }
@media (max-width: 520px) { .cq-qrcard { right: -4px; width: 122px; } .cq-scanline { left: -4px; } }

/* ---------- STORY SPLIT ---------- */
.cq-split { display: grid; gap: 40px; align-items: center; }
@media (min-width: 900px) { .cq-split { grid-template-columns: 1fr 1fr; gap: 64px; } .cq-split.cq-rev > .cq-split-media { order: 2; } }
.cq-split-media { display: flex; justify-content: center; }
.cq-split-media > * { width: 100%; max-width: 460px; }
.cq-split-media > .cq-slot { width: 100%; }
.cq-mini-flow { display: flex; align-items: center; gap: 10px; margin-top: 26px; flex-wrap: wrap; }
.cq-mini-flow .cq-chip { font-size: 12.5px; font-weight: 600; padding: 8px 14px; border-radius: 999px; background: var(--cq-card); border: 1px solid var(--cq-line); }
.cq-mini-flow svg { width: 16px; height: 16px; color: var(--cq-ink-faint); flex-shrink: 0; }

/* ---------- PROBLEM / COMPARE ---------- */
.cq-dark-section { background: var(--cq-dark); color: var(--cq-dark-text); border-radius: 28px; padding: 56px 24px; margin: 0 8px; position: relative; overflow: hidden; }
.cq-dark-section::before { content: ""; position: absolute; inset: 0; background: radial-gradient(700px 340px at 85% 0%, rgba(176,141,87,.1), transparent 60%); pointer-events: none; }
.cq-dark-section > * { position: relative; }
@media (min-width: 860px) { .cq-dark-section { padding: 84px 64px; } }
.cq-dark-section .cq-h2 { color: var(--cq-dark-text); }
.cq-dark-section .cq-lead { color: var(--cq-dark-muted); }
.cq-compare { display: grid; gap: 18px; margin-top: 40px; }
@media (min-width: 760px) { .cq-compare { grid-template-columns: 1fr 1fr; } }
.cq-compare-card { border-radius: var(--cq-radius); padding: 26px; }
.cq-compare-old { background: var(--cq-dark-card); border: 1px solid var(--cq-dark-line); }
.cq-compare-new { background: #FAF8F3; color: var(--cq-ink); }
.cq-compare-new .cq-lead, .cq-compare-new p { color: var(--cq-ink-soft); }
.cq-compare-card h3 { font-family: var(--cq-font); font-size: 21px; margin: 0 0 6px; }
.cq-compare-old h3 { color: #c9c4ba; }
.cq-compare-old p { color: #8a857c; font-size: 14.5px; margin: 0; }
.cq-compare-new p { font-size: 14.5px; margin: 0; }
.cq-flowline { display: flex; align-items: center; gap: 8px; margin-top: 18px; font-size: 13px; font-weight: 600; flex-wrap: wrap; }
.cq-flowline .cq-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: .35; }
.cq-flowline svg { width: 15px; height: 15px; opacity: .55; }

/* ---------- EVOLVE ---------- */
.cq-evolve-tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
.cq-evolve-tags span { font-size: 13.5px; font-weight: 600; padding: 9px 16px; border-radius: 999px; background: var(--cq-card); border: 1px solid var(--cq-line); transition: border-color .18s ease; }
.cq-evolve-tags span:hover { border-color: var(--cq-accent); }

/* ---------- TEMPLATES (preparado para screenshots reales) ---------- */
.cq-tpl-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 40px; }
@media (min-width: 760px) { .cq-tpl-grid { grid-template-columns: repeat(4, 1fr); gap: 18px; } }
.cq-tpl { border-radius: 16px; overflow: hidden; aspect-ratio: 9/15; position: relative; box-shadow: 0 14px 30px rgba(9,9,9,.14); transition: transform .22s ease, box-shadow .22s ease; cursor: default; }
.cq-tpl:hover { transform: translateY(-5px); box-shadow: 0 22px 44px rgba(9,9,9,.22); }
/* Screenshot real: cubre todo el tile, crop cover */
.cq-tpl-shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cq-tpl-label { position: absolute; left: 10px; bottom: 10px; z-index: 2; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; background: rgba(250,248,243,.94); color: var(--cq-ink); padding: 5px 10px; border-radius: 999px; }
.cq-tpl-inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding-top: 26px; }
.cq-tpl-av { width: 42px; height: 42px; border-radius: 50%; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; font-family: var(--cq-font); font-size: 17px; }
.cq-tpl-name { font-family: var(--cq-font); font-size: 14px; }
.cq-tpl-bars { width: 70%; margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.cq-tpl-bars i { height: 16px; border-radius: 7px; display: block; }
.cq-tpl-count { text-align: center; margin-top: 22px; font-size: 13.5px; color: var(--cq-ink-soft); }

/* ---------- EDITOR ---------- */
.cq-editor { background: var(--cq-card); border: 1px solid var(--cq-line); border-radius: 22px; overflow: hidden; box-shadow: 0 24px 60px rgba(9,9,9,.12); }
.cq-editor-bar { display: flex; align-items: center; gap: 6px; padding: 12px 16px; border-bottom: 1px solid var(--cq-line); background: #faf8f3; }
.cq-editor-bar i { width: 10px; height: 10px; border-radius: 50%; background: var(--cq-line); }
.cq-editor-body { display: grid; gap: 0; }
@media (min-width: 800px) { .cq-editor-body { grid-template-columns: 220px 1fr; } }
.cq-editor-panel { padding: 20px; border-bottom: 1px solid var(--cq-line); }
@media (min-width: 800px) { .cq-editor-panel { border-bottom: 0; border-right: 1px solid var(--cq-line); } }
.cq-editor-panel h4 { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--cq-ink-faint); margin: 0 0 12px; }
.cq-tool { display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 600; padding: 10px 12px; border-radius: 10px; color: var(--cq-ink-soft); margin-bottom: 4px; }
.cq-tool.active { background: var(--cq-accent-soft); color: var(--cq-accent-strong); }
.cq-tool svg { width: 16px; height: 16px; }
.cq-editor-stage { padding: 26px; display: flex; align-items: center; justify-content: center; background: repeating-conic-gradient(#f0ebe0 0% 25%, #faf8f3 0% 50%) 0 0/22px 22px; min-height: 320px; }
/* Screenshot real del editor: reemplaza el mock completo conservando el marco */
.cq-editor-shot { display: block; width: 100%; height: auto; aspect-ratio: 16/10; object-fit: cover; }
.cq-swatches { display: flex; gap: 8px; margin-top: 14px; }
.cq-swatches button { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--cq-line); cursor: pointer; padding: 0; transition: transform .15s ease; }
.cq-swatches button:hover { transform: scale(1.12); }
.cq-swatches button.active { box-shadow: 0 0 0 2px var(--cq-accent); }

/* ---------- PROTECTED ---------- */
.cq-lock-badge { width: 54px; height: 54px; border-radius: 16px; background: var(--cq-dark); color: var(--cq-accent); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.cq-lock-badge svg { width: 24px; height: 24px; }
.cq-protect-card { background: var(--cq-card); border: 1px solid var(--cq-line); border-radius: var(--cq-radius); padding: 22px; box-shadow: 0 18px 40px rgba(9,9,9,.1); max-width: 340px; margin: 0 auto; }
.cq-protect-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px dashed var(--cq-line); font-size: 14px; font-weight: 600; }
.cq-protect-row:last-child { border-bottom: 0; }
.cq-protect-row svg { width: 18px; height: 18px; color: var(--cq-accent-strong); flex-shrink: 0; }
.cq-protect-row small { display: block; font-weight: 400; color: var(--cq-ink-faint); font-size: 12px; }

/* ---------- POSSIBILITIES ---------- */
.cq-poss { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 40px; }
@media (min-width: 760px) { .cq-poss { grid-template-columns: repeat(3, 1fr); } }
.cq-poss-item { border-radius: 14px; padding: 20px 18px; background: var(--cq-card); border: 1px solid var(--cq-line); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 12px; transition: border-color .18s ease, transform .18s ease; }
.cq-poss-item:hover { border-color: var(--cq-accent); transform: translateY(-2px); }
.cq-poss-item svg { width: 20px; height: 20px; color: var(--cq-accent-strong); flex-shrink: 0; }

/* ---------- STEPS ---------- */
.cq-steps { display: grid; gap: 14px; margin-top: 40px; }
@media (min-width: 760px) { .cq-steps { grid-template-columns: repeat(3, 1fr); gap: 20px; } }
.cq-step { background: var(--cq-card); border: 1px solid var(--cq-line); border-radius: var(--cq-radius); padding: 26px; }
.cq-step-num { font-family: var(--cq-font); font-size: 34px; color: var(--cq-accent-strong); line-height: 1; }
.cq-step h3 { font-family: var(--cq-font); font-size: 20px; margin: 12px 0 8px; }
.cq-step p { font-size: 14.5px; color: var(--cq-ink-soft); margin: 0; }

/* ---------- FAQ ---------- */
.cq-faq { max-width: 720px; margin: 40px auto 0; }
.cq-faq details { border-bottom: 1px solid var(--cq-line); }
.cq-faq summary { cursor: pointer; list-style: none; padding: 20px 4px; font-weight: 600; font-size: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.cq-faq summary::-webkit-details-marker { display: none; }
.cq-faq summary::after { content: "+"; font-family: var(--cq-font); font-size: 22px; color: var(--cq-accent-strong); transition: transform .2s ease; }
.cq-faq details[open] summary::after { transform: rotate(45deg); }
.cq-faq details p { margin: 0; padding: 0 4px 20px; color: var(--cq-ink-soft); font-size: 15px; max-width: 600px; }

/* ---------- FINAL CTA ---------- */
.cq-final { background: var(--cq-dark); color: var(--cq-dark-text); text-align: center; border-radius: 28px; padding: 72px 24px; margin: 0 8px 72px; position: relative; overflow: hidden; }
.cq-final::before { content: ""; position: absolute; inset: 0; background: radial-gradient(720px 380px at 50% 120%, rgba(176,141,87,.16), transparent 65%); pointer-events: none; }
.cq-final > * { position: relative; }
@media (min-width: 860px) { .cq-final { padding: 110px 48px; } }
.cq-final h2 { font-family: var(--cq-font); font-size: clamp(30px, 6vw, 52px); line-height: 1.08; margin: 0 0 16px; }
.cq-final p { color: var(--cq-dark-muted); max-width: 520px; margin: 0 auto 32px; font-size: 17px; }
.cq-final .cq-btn-ghost, .cq-final a.cq-btn-ghost { color: var(--cq-dark-text); border-color: #3a3a3a; background: transparent; }
.cq-final .cq-btn-ghost:hover { border-color: var(--cq-accent); }

/* ---------- FOOTER ---------- */
.cq-footer { background: var(--cq-dark); color: var(--cq-dark-text); border-top: 1px solid var(--cq-dark-line); padding: 36px 0 44px; }
.cq-footer-in { display: flex; flex-direction: column; gap: 18px; align-items: center; text-align: center; }
@media (min-width: 760px) { .cq-footer-in { flex-direction: row; justify-content: space-between; text-align: left; } }
.cq-footer-links { display: flex; gap: 22px; font-size: 13.5px; color: var(--cq-dark-muted); }
.cq-footer-links a:hover { color: var(--cq-dark-text); }
.cq-footer small { font-size: 12.5px; color: #6f6f6f; }

/* ---------- MOTION (sutil) ---------- */
@keyframes cqFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
.cq-float { animation: cqFloat 5.5s ease-in-out infinite; }
.cq-float-delay { animation: cqFloat 6.5s ease-in-out 1.2s infinite; }
@media (prefers-reduced-motion: reduce) { .cq-float, .cq-float-delay { animation: none; } }
`;

/* ------------------------------ Inline SVG icons ------------------------------ */

const Icon = {
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
  ),
  scan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.69-.43-1.12 0-.94.75-1.69 1.68-1.69h2.03A5.54 5.54 0 0 0 22 10.8C22 5.9 17.5 2 12 2z" /></svg>
  ),
  type: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" /></svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20" /><path d="M8 2v7a2 2 0 0 1-4 0" /><path d="M15 2v20" /><path d="M15 9a3 3 0 0 0 3-3V2" /></svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
  ),
  store: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /></svg>
  ),
  ticket: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></svg>
  ),
  presentation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m9 21 3-3 3 3" /><path d="M12 16v2" /></svg>
  ),
};

/** QR decorativo (patrón fijo, no escaneable — reemplazar por QR real en integración). */
function QrSvg({ size = 96, dark = "#111111", light = "#ffffff" }: { size?: number; dark?: string; light?: string }) {
  const m = [
    "111111101101111","100000100110001","101110101010101","101110100011101","101110101100101",
    "100000101010001","111111101010101","000000001110000","110110111011011","011001000100100",
    "101011101110101","001010011010010","111010101110111","010011001000001","110111110101101",
  ];
  const cell = 100 / 15;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Código QR de ejemplo">
      <rect width="100" height="100" fill={light} rx="6" />
      {m.flatMap((row, y) =>
        row.split("").map((c, x) =>
          c === "1" ? <rect key={`${x}-${y}`} x={x * cell + 0.4} y={y * cell + 0.4} width={cell - 0.8} height={cell - 0.8} fill={dark} rx="1" /> : null
        )
      )}
    </svg>
  );
}

/**
 * MediaSlot — contenedor de imagen final.
 * Con `url`: renderiza <img> con object-fit cover (crop ya definido por CSS).
 * Sin `url`: placeholder pulido que ocupa el espacio final exacto.
 * El ratio/radio/overlay ya están resueltos: asignar la URL es el único paso.
 */
function MediaSlot({
  url, ratio, label, hint, light = false, overlay = false, children, imgStyle
}: {
  url: string | null;
  ratio: "45" | "43" | "1610";
  label: string;
  hint: string;
  light?: boolean;
  overlay?: boolean;
  children?: React.ReactNode;
  imgStyle?: React.CSSProperties;
}) {
  const cls = [
    "cq-slot",
    ratio === "45" ? "cq-slot-45" : ratio === "43" ? "cq-slot-43" : "cq-slot-1610",
    overlay ? "cq-slot-overlay" : "",
    light ? "cq-slot-light" : "",
  ].filter(Boolean).join(" ");
  return (
    <div className={cls} data-media-slot={label}>
      {url ? (
        <img src={url} alt={label} loading="lazy" style={imgStyle} />
      ) : (
        <div className="cq-slot-ph" aria-hidden="true">
          {Icon.image}
          <span>{label}</span>
          <small>{hint}</small>
        </div>
      )}
      {children}
    </div>
  );
}

/** Mini perfil Cripqer (resultado final dentro del teléfono). */
function PhoneProfile({
  banner = "linear-gradient(135deg,#B08D57,#6e5836)",
  avatarBg = "#111111",
  initials = "MV",
  name = "Marina Vidal",
  role = "Fotógrafa · Santiago",
  links = ["Portfolio", "Reservar sesión", "WhatsApp"],
  linkBg = "#f3eee3",
  linkColor = "#111111",
}: {
  banner?: string; avatarBg?: string; initials?: string; name?: string; role?: string;
  links?: string[]; linkBg?: string; linkColor?: string;
}) {
  return (
    <div className="cq-phone cq-float">
      <div className="cq-phone-screen">
        <div className="cq-notch" style={{ background: "transparent", position: "absolute", width: "100%" }} />
        <div className="cq-pf-banner" style={{ background: banner }} />
        <div className="cq-pf-body">
          <div className="cq-pf-avatar" style={{ background: avatarBg }}>{initials}</div>
          <h3 className="cq-pf-name">{name}</h3>
          <p className="cq-pf-role">{role}</p>
          {links.map((l) => (
            <span key={l} className="cq-pf-link" style={{ background: linkBg, color: linkColor }}>{l}</span>
          ))}
          <div className="cq-pf-socials">
            {["ig", "tt", "wa"].map((s) => (
              <i key={s} style={{ background: linkBg }} aria-hidden="true">
                {s === "ig" && <svg viewBox="0 0 24 24" fill="none" stroke={linkColor} strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" fill={linkColor} /></svg>}
                {s === "tt" && <svg viewBox="0 0 24 24" fill="none" stroke={linkColor} strokeWidth="2" strokeLinecap="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>}
                {s === "wa" && <svg viewBox="0 0 24 24" fill="none" stroke={linkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" /></svg>}
              </i>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Templates data ------------------------------ */
/* Cuando existan los screenshots reales, asignar su URL en TEMPLATE_SHOTS.
 * El placeholder abstracto desaparece automáticamente al tener `shot`. */

const TEMPLATES = [
  { label: "Profesional", bg: "linear-gradient(160deg,#f5f2ea,#e5ddcb)", av: "#111111", avc: "#F5F2EA", bar: "#ddd5c2", name: "#111111" },
  { label: "Belleza", bg: "linear-gradient(160deg,#f7e8e4,#eccfc7)", av: "#8c4a3c", avc: "#fff", bar: "#e8c4ba", name: "#5e3228" },
  { label: "Creador", bg: "linear-gradient(160deg,#262626,#0d0d0d)", av: "#B08D57", avc: "#111111", bar: "#3d3d3d", name: "#F5F2EA" },
  { label: "Premium", bg: "linear-gradient(160deg,#111111,#2b2620)", av: "#F5F2EA", avc: "#111111", bar: "#4a4238", name: "#F5F2EA" },
  { label: "Negocio", bg: "linear-gradient(160deg,#e4e9e4,#c9d4c9)", av: "#33463a", avc: "#fff", bar: "#c2cec2", name: "#22332a" },
  { label: "Fotografía", bg: "linear-gradient(160deg,#1a1a1a,#000000)", av: "#d6d3cd", avc: "#111111", bar: "#3a3a3a", name: "#e8e5df" },
  { label: "Lifestyle", bg: "linear-gradient(160deg,#efe6d4,#e0d0b2)", av: "#96784a", avc: "#fff", bar: "#e3d3b4", name: "#5c4a2c" },
  { label: "Minimal", bg: "linear-gradient(160deg,#ffffff,#f2f2f0)", av: "#111111", avc: "#fff", bar: "#e4e4e0", name: "#111111" },
];

const SWATCHES = ["#B08D57", "#33463a", "#8c4a3c", "#262626", "#111111"];

/* ------------------------------ Component ------------------------------ */

export default function CripqerLanding() {
  const [tplIndex, setTplIndex] = useState(0);
  const active = TEMPLATES[tplIndex] ?? TEMPLATES[0]!;

  return (
    <div className="cq">
      <style>{css}</style>

      {/* ============ NAV ============ */}
      <PlatformNavbar
        variant="landing"
        brandHref="/"
        logoTheme="inverse"
        className="cq-nav"
        innerClassName="cq-wrap cq-nav-in"
        brandClassName="cq-logo-link"
        logoClassName="cq-logo"
        leadingClassName="contents"
        navigation={
          <nav className="cq-nav-links" aria-label="Navegación principal">
            <a href="#producto">Producto</a>
            <a href="#disenos">Diseños</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#seguridad">Documentos</a>
            <a href="#faq">FAQ</a>
          </nav>
        }
        actions={
          <div className="cq-nav-cta">
            <Link to="/editor" data-cta="login">Iniciar sesión</Link>
            <Link to="/editor" className="cq-btn cq-btn-primary cq-btn-sm" data-cta="crear-qr">Crear mi QR</Link>
          </div>
        }
      />

      {/* ============ 1. HERO ============ */}
      <section className="cq-hero" id="producto">
        <div className="cq-wrap cq-hero-grid">
          <div>
            <h1 className="cq-h1">Tu QR puede mostrar <em>mucho más</em> que un enlace.</h1>
            <p className="cq-hero-sub">
              Crea una presencia digital diseñada para representarte, reúne lo que quieres
              compartir y deja que las personas la descubran con un solo escaneo.
            </p>
            <div className="cq-hero-actions">
              <Link to="/editor" className="cq-btn cq-btn-accent" data-cta="crear-qr">Crear mi QR {Icon.arrow}</Link>
              <a href="#disenos" className="cq-btn cq-btn-ghost" data-cta="ver-disenos">Ver diseños</a>
            </div>
            <p className="cq-hero-note">Sin programar. Sin construir un sitio web desde cero.</p>
          </div>

          {/* SLOT HERO — composición final: persona + smartphone + plantilla + QR.
              Asignar MEDIA.heroVisualUrl para usar la fotografía definitiva;
              el marco (ratio 4/5, radius 26px, crop cover) ya está resuelto. */}
          <div className="cq-hero-visual">
            <div className="cq-scanline cq-float-delay">{Icon.scan} Alguien escanea tu QR</div>
            <div className="cq-hero-stage" data-media-slot="Hero — visual principal">
              {MEDIA.heroVisualUrl ? (
                <img src={MEDIA.heroVisualUrl} alt="Persona escaneando un QR que abre una experiencia Cripqer" />
              ) : (
                <>
                  <span className="cq-hero-hint">Visual final — persona + smartphone + QR</span>
                  <PhoneProfile />
                </>
              )}
            </div>
            <div className="cq-qrcard cq-float-delay">
              <QrSvg size={96} />
              <p>Tu acceso, siempre el mismo</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 2. STORY — CREADOR ============ */}
      <section className="cq-section">
        <div className="cq-wrap cq-split">
          <div className="cq-split-media">
            {/* SLOT CREADOR — creatorStoryUrl: creador + contexto social + destino */}
            <MediaSlot
              url={MEDIA.creatorStoryUrl}
              ratio="45"
              label="Creador"
              hint="Creador/influencer + contexto social + destino Cripqer"
              light
              overlay
            >
              {!MEDIA.creatorStoryUrl && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PhoneProfile
                    banner="linear-gradient(135deg,#3a3a3a,#111111)"
                    avatarBg="#262626"
                    initials="LA"
                    name="Lua Andrade"
                    role="Creadora de contenido · 1 destino"
                    links={["Mi último video", "YouTube", "Colaboraciones"]}
                    linkBg="#f3eee3"
                    linkColor="#111111"
                  />
                </div>
              )}
            </MediaSlot>
          </div>
          <div>
            <span className="cq-eyebrow">Para creadores</span>
            <h2 className="cq-h2">Tu identidad no es una lista de enlaces genéricos.</h2>
            <p className="cq-lead">
              Desde Instagram o TikTok, tu audiencia llega a una página que se ve y se siente
              como tú: tu foto, tu estilo, tus redes, tu contenido y tu contacto — todo en un
              solo lugar diseñado.
            </p>
            <div className="cq-mini-flow" aria-label="Flujo: perfil social, escaneo, página Cripqer">
              <span className="cq-chip">Perfil social</span>
              {Icon.arrow}
              <span className="cq-chip">QR / enlace Cripqer</span>
              {Icon.arrow}
              <span className="cq-chip">Tu experiencia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 3. STORY — NEGOCIO FÍSICO ============ */}
      <section className="cq-section cq-band">
        <div className="cq-wrap cq-split cq-rev">
          <div className="cq-split-media">
            {/* SLOT RESTAURANT — restaurantStoryUrl: ambiente + QR físico + escaneo */}
            <MediaSlot
              url={MEDIA.restaurantStoryUrl}
              ratio="43"
              label="Restaurante"
              hint="Ambiente restaurante/café + QR físico en mesa o carta + persona escaneando"
              overlay
            >
              <div className="cq-scene-tag cq-slot-tag">
                <QrSvg size={22} dark="#111111" />
                En la mesa del restaurante: escanea y descubre
              </div>
            </MediaSlot>
          </div>
          <div>
            <span className="cq-eyebrow">Para negocios</span>
            <h2 className="cq-h2">Del mundo físico a una experiencia útil, en un escaneo.</h2>
            <p className="cq-lead">
              Un QR en la mesa, el mostrador o la carta abre tu presencia en Cripqer: tu menú,
              tus servicios, tu WhatsApp, tu ubicación y lo que quieras que tus clientes encuentren.
            </p>
            <div className="cq-mini-flow">
              <span className="cq-chip">Mundo físico</span>
              {Icon.arrow}
              <span className="cq-chip">Escaneo</span>
              {Icon.arrow}
              <span className="cq-chip">Experiencia móvil</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 4. STORY — PROFESIONAL ============ */}
      <section className="cq-section">
        <div className="cq-wrap cq-split">
          <div className="cq-split-media">
            {/* SLOT PROFESIONAL — professionalStoryUrl: persona + perfil profesional */}
            <MediaSlot
              url={MEDIA.professionalStoryUrl}
              ratio="45"
              label="Profesional"
              hint="Retrato profesional + perfil profesional Cripqer"
              light
              overlay
              imgStyle={{ objectFit: "contain", objectPosition: "center center" }}
            >
              {!MEDIA.professionalStoryUrl && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PhoneProfile
                    banner="linear-gradient(135deg,#96784a,#5c4a2c)"
                    avatarBg="#111111"
                    initials="DR"
                    name="Daniela Rojas"
                    role="Abogada · Consultas"
                    links={["Agendar consulta", "LinkedIn", "Enviar WhatsApp"]}
                    linkBg="#f3eee3"
                    linkColor="#111111"
                  />
                </div>
              )}
            </MediaSlot>
          </div>
          <div>
            <span className="cq-eyebrow">Para profesionales</span>
            <h2 className="cq-h2">Una tarjeta de presentación que vive después del apretón de manos.</h2>
            <p className="cq-lead">
              Abogados, consultores, fotógrafos, profesionales de la belleza, corredores,
              freelancers: tu foto, tu profesión, tus servicios y tus canales de contacto,
              presentados con el cuidado que tu trabajo merece.
            </p>
          </div>
        </div>
      </section>

      {/* ============ 5. EL PROBLEMA ============ */}
      <section className="cq-section" style={{ paddingTop: 24 }}>
        <div className="cq-wrap">
          <div className="cq-dark-section">
            <span className="cq-eyebrow" style={{ color: "var(--cq-accent)" }}>La oportunidad</span>
            <h2 className="cq-h2">Un QR tradicional termina demasiado pronto.</h2>
            <p className="cq-lead">
              La tecnología QR es maravillosa: conecta cualquier superficie con internet al instante.
              El problema es lo que suele haber del otro lado.
            </p>
            <div className="cq-compare">
              <div className="cq-compare-card cq-compare-old">
                <h3>Lo habitual</h3>
                <p>Un escaneo que cae en una URL fría, una página que no representa a nadie.</p>
                <div className="cq-flowline" style={{ color: "#8a857c" }}>
                  <span>Escanear</span>{Icon.arrow}<span>Una URL</span><span className="cq-dot" /><span>Fin.</span>
                </div>
              </div>
              <div className="cq-compare-card cq-compare-new">
                <h3>Con Cripqer</h3>
                <p>Un escaneo que abre una identidad digital diseñada: quién eres, qué ofreces y cómo contactarte.</p>
                <div className="cq-flowline" style={{ color: "var(--cq-accent-strong)" }}>
                  <span>Escanear</span>{Icon.arrow}<span>Tu experiencia</span>{Icon.arrow}<span>Una conexión real</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 6. EVOLUCIÓN ============ */}
      <section className="cq-section cq-center">
        <div className="cq-wrap">
          <span className="cq-eyebrow">Siempre vivo</span>
          <h2 className="cq-h2">Imprime el QR una vez.<br />Haz evolucionar lo que existe detrás.</h2>
          <p className="cq-lead" style={{ margin: "0 auto" }}>
            Tu presencia digital puede cambiar cuando tú cambias. El QR sigue siendo el mismo
            punto de acceso — lo que descubren al escanearlo, lo decides tú.
          </p>
          <div className="cq-evolve-tags" style={{ justifyContent: "center" }}>
            <span>Biografía</span><span>Enlaces</span><span>Redes sociales</span>
            <span>Fotografías</span><span>Estilo visual</span><span>Plantilla</span>
            <span>Servicios</span><span>Información de contacto</span>
          </div>
        </div>
      </section>

      {/* ============ 7. PLANTILLAS ============ */}
      <section className="cq-section cq-band" id="disenos">
        <div className="cq-wrap cq-center">
          <span className="cq-eyebrow">Plantillas</span>
          <h2 className="cq-h2">No necesitas ser diseñador para verte como uno.</h2>
          <p className="cq-lead" style={{ margin: "0 auto" }}>
            Empieza desde una base visual profesional — no desde una página en blanco.
            Cada familia de diseño tiene su propia personalidad.
          </p>
          {/* Grid preparado para screenshots reales: asignar URL en TEMPLATE_SHOTS
              y cada tile mostrará la captura real (crop cover, ratio 9/15). */}
          <div className="cq-tpl-grid">
            {TEMPLATES.map((t) => {
              const shot = TEMPLATE_SHOTS[t.label];
              return (
                <div key={t.label} className="cq-tpl" style={shot ? undefined : { background: t.bg }} data-template={t.label}>
                  {shot ? (
                    <img className="cq-tpl-shot" src={shot} alt={`Plantilla ${t.label}`} loading="lazy" />
                  ) : (
                    <div className="cq-tpl-inner">
                      <div className="cq-tpl-av" style={{ background: t.av, color: t.avc }}>{t.label[0]}</div>
                      <span className="cq-tpl-name" style={{ color: t.name }}>Nombre Apellido</span>
                      <div className="cq-tpl-bars">
                        <i style={{ background: t.bar }} /><i style={{ background: t.bar }} /><i style={{ background: t.bar }} />
                      </div>
                    </div>
                  )}
                  <span className="cq-tpl-label">{t.label}</span>
                </div>
              );
            })}
          </div>
          <p className="cq-tpl-count">La biblioteca actual incluye 14 diseños base — y crece.</p>
        </div>
      </section>

      {/* ============ 8. EDITOR ============ */}
      <section className="cq-section">
        <div className="cq-wrap cq-split">
          <div>
            <span className="cq-eyebrow">Editor visual</span>
            <h2 className="cq-h2">Si lo ves, sabes cómo cambiarlo.</h2>
            <p className="cq-lead">
              Elige una plantilla, cambia la foto, mueve los colores, edita el texto y mira
              el resultado al instante. Sin código, sin hosting, sin diseño web.
            </p>
            <div className="cq-swatches" role="group" aria-label="Cambiar color de la plantilla de ejemplo">
              {SWATCHES.map((c, i) => (
                <button
                  key={c}
                  className={i === tplIndex % SWATCHES.length ? "active" : ""}
                  style={{ background: c }}
                  onClick={() => setTplIndex(i)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="cq-split-media" style={{ maxWidth: "none" }}>
            {/* SLOT EDITOR — editorVisualUrl: screenshot real del editor.
                Al asignar la URL, el screenshot reemplaza el mock conservando
                el marco (barra de ventana + radius 22px, crop 16/10). */}
            <div className="cq-editor" style={{ width: "100%" }}>
              <div className="cq-editor-bar" aria-hidden="true"><i /><i /><i /></div>
              {MEDIA.editorVisualUrl ? (
                <img className="cq-editor-shot" src={MEDIA.editorVisualUrl} alt="Editor visual de Cripqer" loading="lazy" />
              ) : (
                <div className="cq-editor-body">
                  <div className="cq-editor-panel">
                    <h4>Personalizar</h4>
                    <div className="cq-tool">{Icon.image} Cambiar foto</div>
                    <div className="cq-tool active">{Icon.palette} Color y estilo</div>
                    <div className="cq-tool">{Icon.type} Editar textos</div>
                    <div className="cq-tool">{Icon.link} Tus enlaces</div>
                  </div>
                  <div className="cq-editor-stage">
                    <div style={{
                      width: 190, borderRadius: 22, padding: "22px 14px", textAlign: "center",
                      background: active.bg, transition: "background .3s ease",
                      boxShadow: "0 16px 36px rgba(9,9,9,.2)",
                    }}>
                      <div className="cq-tpl-av" style={{ background: active.av, color: active.avc, margin: "0 auto 8px" }}>Tú</div>
                      <div className="cq-tpl-name" style={{ color: active.name }}>Tu nombre</div>
                      <div className="cq-tpl-bars" style={{ margin: "12px auto 0" }}>
                        <i style={{ background: active.bar }} /><i style={{ background: active.bar }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ 9. ACCESO PROTEGIDO ============ */}
      <section className="cq-section cq-band" id="seguridad">
        <div className="cq-wrap cq-split cq-rev">
          <div className="cq-split-media">
            <div className="cq-protect-card">
              <div className="cq-lock-badge">{Icon.lock}</div>
              <div className="cq-protect-row">{Icon.file}<div>Propuesta comercial.pdf<small>Contenido protegido</small></div></div>
              <div className="cq-protect-row">{Icon.scan}<div>QR dedicado<small>Acceso controlado</small></div></div>
              <div className="cq-protect-row">{Icon.lock}<div>Contraseña requerida<small>Acceso mediante contraseña</small></div></div>
            </div>
          </div>
          <div>
            <span className="cq-eyebrow">Acceso protegido</span>
            <h2 className="cq-h2">Y no todo lo que compartes tiene que ser público.</h2>
            <p className="cq-lead">
              Cripqer también incluye un flujo para documentos y contenido protegido:
              genera un QR con acceso controlado por contraseña y compártelo solo con
              quien corresponda.
            </p>
          </div>
        </div>
      </section>

      {/* ============ 10. POSIBILIDADES ============ */}
      <section className="cq-section cq-center">
        <div className="cq-wrap">
          <span className="cq-eyebrow">Un QR, muchas posibilidades</span>
          <h2 className="cq-h2">El mismo concepto, donde tu mundo ya sucede.</h2>
          <p className="cq-lead" style={{ margin: "0 auto" }}>
            Personas distintas, contextos distintos, la misma necesidad: que lo que la gente
            vea después de escanear represente quién eres y lo que ofreces.
          </p>
          <div className="cq-poss" style={{ textAlign: "left" }}>
            <div className="cq-poss-item">{Icon.card} Tarjetas de presentación</div>
            <div className="cq-poss-item">{Icon.menu} Cartas y menús</div>
            <div className="cq-poss-item">{Icon.store} Vitrinas y mostradores</div>
            <div className="cq-poss-item">{Icon.box} Empaques y productos</div>
            <div className="cq-poss-item">{Icon.ticket} Eventos y credenciales</div>
            <div className="cq-poss-item">{Icon.presentation} Propuestas y presentaciones</div>
          </div>
        </div>
      </section>

      {/* ============ 11. SIMPLICIDAD ============ */}
      <section className="cq-section cq-band" id="como-funciona">
        <div className="cq-wrap cq-center">
          <span className="cq-eyebrow">Cómo funciona</span>
          <h2 className="cq-h2">No necesitas construir un sitio web.</h2>
          <p className="cq-lead" style={{ margin: "0 auto" }}>Tres pasos. Ninguno técnico.</p>
          <div className="cq-steps" style={{ textAlign: "left" }}>
            <div className="cq-step">
              <div className="cq-step-num">1</div>
              <h3>Elige</h3>
              <p>Parte de una plantilla profesional que combine con tu estilo o tu negocio.</p>
            </div>
            <div className="cq-step">
              <div className="cq-step-num">2</div>
              <h3>Personaliza</h3>
              <p>Agrega tu foto, tu historia, tus enlaces y tus colores en el editor visual.</p>
            </div>
            <div className="cq-step">
              <div className="cq-step-num">3</div>
              <h3>Publica</h3>
              <p>Tu QR queda listo para compartir — en pantalla, impreso o donde lo necesites.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 12. FAQ ============ */}
      <section className="cq-section" id="faq">
        <div className="cq-wrap cq-center">
          <span className="cq-eyebrow">Preguntas frecuentes</span>
          <h2 className="cq-h2">Lo que sueles querer saber.</h2>
          <div className="cq-faq" style={{ textAlign: "left" }}>
            <details>
              <summary>¿Cripqer es un generador de QR?</summary>
              <p>El QR es solo el punto de acceso. Lo que creas con Cripqer es la experiencia digital que aparece después del escaneo: tu identidad, tus enlaces y tu presentación visual.</p>
            </details>
            <details>
              <summary>¿Necesito saber de diseño o programación?</summary>
              <p>No. Partes de una plantilla profesional y la personalizas en un editor visual: eliges, ajustas y publicas.</p>
            </details>
            <details>
              <summary>¿Puedo cambiar el contenido después de imprimir el QR?</summary>
              <p>Sí. Tu presencia digital puede evolucionar — textos, enlaces, fotos, estilo — mientras el QR sigue siendo el mismo punto de acceso.</p>
            </details>
            <details>
              <summary>¿Puedo compartir algo privado con un QR?</summary>
              <p>Sí. Además de la presencia pública, Cripqer incluye un flujo de acceso protegido con contraseña para documentos y contenido que no quieres que sea público.</p>
            </details>
          </div>
        </div>
      </section>

      {/* ============ 13. CTA FINAL ============ */}
      <section>
        <div className="cq-wrap">
          <div className="cq-final">
            <h2>Haz que el próximo escaneo cuente.</h2>
            <p>Construye la experiencia que quieres que las personas descubran cuando escanean tu QR.</p>
            <div className="cq-hero-actions" style={{ justifyContent: "center" }}>
              <Link to="/editor" className="cq-btn cq-btn-accent" data-cta="crear-qr">Crear mi QR {Icon.arrow}</Link>
              <a href="#disenos" className="cq-btn cq-btn-ghost" data-cta="ver-disenos">Ver diseños</a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <PlatformFooter className="cq-footer" innerClassName="cq-wrap cq-footer-in" logoClassName="cq-logo">
        <nav className="cq-footer-links" aria-label="Pie de página">
          <a href="#producto">Producto</a>
          <a href="#disenos">Diseños</a>
          <a href="#seguridad">Documentos</a>
          <Link to="/editor" data-cta="login">Iniciar sesión</Link>
        </nav>
      </PlatformFooter>
    </div>
  );
}
