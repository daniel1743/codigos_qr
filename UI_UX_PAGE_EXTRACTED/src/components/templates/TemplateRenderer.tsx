import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { BioTemplate } from './BioTemplate';
import { BusinessTemplate } from './BusinessTemplate';
import { PortfolioTemplate } from './PortfolioTemplate';

export function TemplateRenderer() {
  const { templateId } = useEditor();
  if (templateId === 'business') return <BusinessTemplate />;
  if (templateId === 'portfolio') return <PortfolioTemplate />;
  return <BioTemplate />;
}