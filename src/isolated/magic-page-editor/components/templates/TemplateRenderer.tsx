import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { BioTemplate } from './BioTemplate';
import { BusinessTemplate } from './BusinessTemplate';
import { PortfolioTemplate } from './PortfolioTemplate';
import { CatalogTemplate } from './CatalogTemplate';
import { MiniGalleryTemplate } from './MiniGalleryTemplate';

export function TemplateRenderer() {
  const { templateId, doc } = useEditor();
  const family = doc.props.page?.family;
  if (family === 'catalog') return <CatalogTemplate />;
  if (family === 'gallery') return <MiniGalleryTemplate />;
  if (templateId === 'business') return <BusinessTemplate />;
  if (templateId === 'portfolio') return <PortfolioTemplate />;
  return <BioTemplate />;
}
