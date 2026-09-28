import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { cardFamilies } from '../../data/cardFamilies';
import { Block } from '../editor/Block';
import { PageRoot } from '../editor/PageRoot';
import { CardFamilyBlock } from '../cards/CardFamilyBlock';
import type { BlockRef } from '../../types/editor';

/** Dedicated Magic renderer for the Catálogo page family. */
export function CatalogTemplate() {
  const { doc } = useEditor();
  const block = (doc.blocks.find((item) => item.type === 'catalog') ?? { key: 'catalog', type: 'catalog' }) as BlockRef;
  return <PageRoot><Block block={block} defaultSpacing="M"><CardFamilyBlock block={block} family={cardFamilies.catalog} /></Block></PageRoot>;
}
