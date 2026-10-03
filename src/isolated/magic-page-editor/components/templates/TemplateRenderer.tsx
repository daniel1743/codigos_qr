import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { BioTemplate } from './BioTemplate';
import { BusinessTemplate } from './BusinessTemplate';
import { PortfolioTemplate } from './PortfolioTemplate';
import { CatalogTemplate } from './CatalogTemplate';
import { MiniGalleryTemplate } from './MiniGalleryTemplate';
import { LandingBot } from '../../../../components/landing-bot/LandingBot';
import { normalizeLandingBot } from '../../../../lib/landing-bot/config';

export function TemplateRenderer({ showLandingBotPreview = true }: { showLandingBotPreview?: boolean }) {
  const { templateId, doc } = useEditor();
  const family = doc.props.page?.family;
  const template = family === 'catalog' ? <CatalogTemplate /> :
    family === 'gallery' ? <MiniGalleryTemplate /> :
    templateId === 'business' ? <BusinessTemplate /> :
    templateId === 'portfolio' ? <PortfolioTemplate /> :
    <BioTemplate />;

  return <>
    {template}
    {showLandingBotPreview && doc.bot?.enabled && (
      <LandingBot config={normalizeLandingBot(doc.bot)} previewOnly />
    )}
  </>;
}
