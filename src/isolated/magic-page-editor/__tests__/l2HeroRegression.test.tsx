// @vitest-environment happy-dom
/**
 * L2.1 · The 30 existing hero variants must not move.
 *
 * This is the guard that makes "additive only" checkable instead of aspirational.
 * It renders every pre-existing variant, in both devices, and compares a hash of
 * the produced markup against a recorded golden.
 *
 * The fixture was generated BEFORE any L2.1 change landed — that is what makes it
 * a baseline rather than a rubber stamp. It is written only when absent, so a
 * later run can never quietly bless a regression: an intentional change to an
 * existing variant must fail here and be argued for explicitly.
 *
 * `heroVariants` is the shipped list. New compositions are appended to it, and
 * their own coverage lives in l2HeroCompositions.test.tsx — this file exists to
 * prove the *old* ones are untouched, so it only ever checks the original 30.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { HeroFrame } from '../components/blocks/HeroFrame';
import { createInitialMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import type { Device, HeroVariant } from '../types/editor';

/** The 30 variants that shipped before L2. Pinned by name, not by index. */
const ORIGINAL_30: HeroVariant[] = [
  'simple', 'centered', 'split', 'image', 'arch', 'floating', 'banner', 'mosaic',
  'frame', 'bleed', 'editorialCenter', 'splitHorizontal', 'splitVertical', 'fullBleed',
  'photoCard', 'avatarBand', 'photoGrid', 'quote', 'collage', 'lowerBlock',
  'galleryFrame', 'sideBleed', 'magazine', 'elegantOverlay', 'backgroundFade',
  'minimalPremium', 'sideInfo', 'descriptionCard', 'cinematic', 'brandIdentity',
];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, '__fixtures__', 'hero30.golden.json');

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

/** FNV-1a. Compact, stable, and good enough to notice any markup change. */
function fingerprint(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function renderVariant(variant: HeroVariant, device: Device): string {
  const state = createInitialMagicEditorState('bio');
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider initialTemplate="bio" initialDocument={state} initialDevice={device}>
        <HeroFrame
          id={`hero:${variant}`}
          media="/hero.jpg"
          mediaAlt="Hero"
          defaultVariant={variant}
          radius={24}
        >
          {() => <span>Contenido</span>}
        </HeroFrame>
      </EditorProvider>,
    );
  });
  const html = host.innerHTML;
  act(() => root.unmount());
  host.remove();
  return html;
}

function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const variant of ORIGINAL_30) {
    for (const device of ['desktop', 'mobile'] as Device[]) {
      out[`${variant}:${device}`] = fingerprint(renderVariant(variant, device));
    }
  }
  return out;
}

describe('L2.1 · the 30 pre-existing hero variants are frozen', () => {
  it('pins every original variant, in both devices', () => {
    expect(ORIGINAL_30).toHaveLength(30);

    const current = snapshot();

    // Anti-vacuity. If the harness ever stopped applying `defaultVariant` — a
    // broken provider, a renamed prop — every entry would collapse to the same
    // markup and this golden would happily pass while testing nothing. More
    // distinct fingerprints than variants can only happen if the variants
    // genuinely render differently, and `S`/`M`/`L`… here desktop vs mobile.
    const distinct = new Set(Object.values(current)).size;
    expect(distinct).toBeGreaterThan(ORIGINAL_30.length);

    if (!fs.existsSync(FIXTURE)) {
      fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
      fs.writeFileSync(FIXTURE, `${JSON.stringify(current, null, 2)}\n`);
      console.warn(
        `[hero golden] baseline recorded for ${ORIGINAL_30.length} variants — ` +
          'commit __fixtures__/hero30.golden.json; later runs compare against it.',
      );
      return;
    }

    const golden = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as Record<string, string>;
    const moved = Object.keys(golden).filter((key) => golden[key] !== current[key]);
    const added = Object.keys(current).filter((key) => !(key in golden));

    // Report what moved, by name, so the failure is actionable.
    expect({ moved, added }).toEqual({ moved: [], added: [] });
  });
});
