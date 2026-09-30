import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { MapIllustration } from '../components/blocks/MapIllustration';
import { LocationBlock } from '../components/blocks/LocationBlock';

describe('Luxury Map visual', () => {
  it('uses thin editorial roads and removes the legacy grid/wave treatment', () => {
    const markup = renderToStaticMarkup(
      <EditorProvider initialMode="preview">
        <MapIllustration accent="#D4AF37" radius={28} />
      </EditorProvider>,
    );

    expect(markup).toContain('data-map-style="refined-map"');
    expect(markup).toContain('stroke-width="1.8"');
    expect(markup).not.toContain('stroke-width="10"');
    expect(markup).not.toContain('stroke-width="14"');
  });

  it('reuses the edited address for the directions CTA and public map link', () => {
    const markup = renderToStaticMarkup(
      <EditorProvider initialMode="preview" initialDocument={{ templateId: 'business', doc: { blocks: [], texts: { 'location.address': 'Providencia, Santiago' }, textStyles: {}, props: {}, removed: {} } }}>
        <LocationBlock prefix="" title="Dónde estamos" name="Local" address="Dirección original" hours="Horario" radius={28} accent="#D4AF37" displayFont="serif" ctaVariants={{ solid: {}, outline: {}, soft: {} }} />
      </EditorProvider>,
    );

    expect(markup).toContain('query=Providencia%2C%20Santiago');
    expect(markup).toContain('Abrir ubicación: Providencia, Santiago');
    expect(markup).not.toContain('href="https://maps.google.com"');
  });
});
