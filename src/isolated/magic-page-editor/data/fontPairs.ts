import type { FontPair } from '../types/editor';

/**
 * Page-level font pairs available to EVERY template (L1 · typography).
 *
 * The 12 Magic Patterns families ask for six display faces. Three of them
 * (Cormorant Garamond, Bodoni Moda, Inter Tight) were already reachable through
 * each template's own three pairs; the rest were not reachable at all — DM Serif
 * Display and Montserrat were not even loaded as fonts.
 *
 * Rather than hard-code extra pairs per template, they live here and are appended
 * to each template's list in `data/templates.ts`. Two properties that matter:
 *
 *  - the template's own three stay FIRST, so `fonts[0]` (the default) never moves;
 *  - ids already stored in published documents keep resolving, because existing
 *    entries are untouched and these ids are new.
 *
 * Keep in sync with the Google Fonts import in `styles/magic-editor.css`.
 */
export const sharedFontPairs: FontPair[] = [
  {
    id: 'dm-serif',
    label: 'DM Serif Display',
    display: "'DM Serif Display', Georgia, serif",
    body: "'Inter', sans-serif",
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    display: "'Playfair Display', Georgia, serif",
    body: "'Inter', sans-serif",
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    display: "'Montserrat', system-ui, sans-serif",
    body: "'Inter', sans-serif",
  },
  {
    id: 'inter-sans',
    label: 'Inter',
    display: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
  },
  {
    id: 'great-vibes',
    label: 'Great Vibes',
    display: "'Great Vibes', cursive",
    body: "'Inter', sans-serif",
  },
];
