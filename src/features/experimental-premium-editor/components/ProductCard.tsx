import React from 'react';
import { Product, TargetKind } from '../types/editor';
import { useEditor } from '../contexts/EditorContext';
import { styleToCss } from '../utils/textStyle';
import { cn } from '../utils/cn';
import { InlineText } from './InlineText';
import { CardImage } from './CardImage';

interface ProductCardProps {
  product: Product;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const editor = useEditor();
  const {
    selection,
    select,
    patchProduct,
    openChangeImage,
    retryUpload,
    mode
  } = editor;

  const isTarget = (kind: TargetKind) =>
  selection?.cardId === product.id && selection.kind === kind;

  const cardSelected = isTarget('card');
  const anySelected = selection?.cardId === product.id;

  const ctaBase =
  'inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-[14px] font-medium transition-[background-color,box-shadow,color] duration-150 ease-premium';

  const ctaStyles =
  product.cta.variant === 'solid' ?
  { background: product.cta.color, color: '#FFFFFF' } :
  product.cta.variant === 'outline' ?
  {
    background: 'transparent',
    color: product.cta.color,
    boxShadow: `inset 0 0 0 1.5px ${product.cta.color}`
  } :
  { background: 'transparent', color: product.cta.color };

  return (
    <article
      data-anchor={`${product.id}:card`}
      aria-label={`Producto ${index + 1}: ${product.title}`}
      onMouseDown={(event) => {
        if (mode === 'preview') return;
        const target = event.target as HTMLElement;
        if (target.closest('[data-editable="true"]')) return;
        select(product.id, 'card');
      }}
      onClick={() => {
        if (mode === 'preview') {
          editor.setViewingProductId(product.id);
        }
      }}
      style={{
        background: product.card.background,
        borderRadius: product.card.radius,
        boxShadow: `inset 0 0 0 1px ${product.card.border}`
      }}
      className={cn(
        'group relative flex h-full flex-col p-4 transition-[outline-color,transform] duration-200 ease-premium sm:p-5',
        mode === 'preview' ? 'cursor-pointer hover:-translate-y-1 hover:shadow-card' : 'cursor-default',
        mode === 'edit' && cardSelected ?
        'outline outline-2 outline-offset-[3px] outline-sel' :
        'outline outline-2 outline-offset-[3px] outline-transparent',
        mode === 'edit' && !anySelected && 'hover:outline-sel/25'
      )}>
      
      {cardSelected &&
      <span className="pointer-events-none absolute -top-[13px] left-0 z-20 -translate-y-full rounded-md bg-sel px-2 py-0.5 text-[10.5px] font-medium tracking-wide text-white">
          Tarjeta
        </span>
      }

      <div className="relative">
        <CardImage
          product={product}
          selected={isTarget('image')}
          onActivate={() => select(product.id, 'image')}
          onRetry={() => retryUpload(product.id)}
          onPick={() => openChangeImage(product.id)} />
          
        {product.categoryIds.length > 0 && product.imageState === 'ready' && (
          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
            {product.categoryIds.map(id => {
              const c = editor.categories.find(cat => cat.id === id);
              if (!c) return null;
              return (
              <div
                key={c.id}
                className={cn(
                  "relative",
                  mode === 'edit' && selection?.cardId === product.id && selection?.kind === 'badge' && selection?.subId === c.id
                    ? 'ring-2 ring-sel ring-offset-1 ring-offset-white'
                    : ''
                )}
                style={{
                  backgroundColor: c.style.backgroundColor,
                  borderRadius: c.style.radius
                }}
              >
                <InlineText
                  as="span"
                  value={c.label}
                  onChange={(val) => editor.patchCategory(c.id, { label: val })}
                  onActivate={() => editor.select(product.id, 'badge', c.id)}
                  selected={selection?.cardId === product.id && selection?.kind === 'badge' && selection?.subId === c.id}
                  anchor={`badge:${c.id}`}
                  label="Etiqueta"
                  placeholder="Etiqueta"
                  singleLine
                  className="px-2.5 py-1 whitespace-nowrap"
                  style={{
                    color: c.style.textColor,
                    fontFamily: c.style.font,
                    fontSize: c.style.size,
                  }}
                />
              </div>
            )})}
          </div>
        )}
      </div>
      

      <div className="mt-5 flex flex-1 flex-col gap-3">
        <InlineText
          as="h3"
          value={product.title}
          onChange={(value) => patchProduct(product.id, { title: value })}
          onActivate={() => select(product.id, 'title')}
          selected={isTarget('title')}
          anchor={`${product.id}:title`}
          label="Título"
          placeholder="Nombre del producto"
          style={styleToCss(product.titleStyle)}
          clampLines={2} />
        

        <InlineText
          as="p"
          value={product.description}
          onChange={(value) => patchProduct(product.id, { description: value })}
          onActivate={() => select(product.id, 'description')}
          selected={isTarget('description')}
          anchor={`${product.id}:description`}
          label="Descripción"
          placeholder="Descripción breve"
          style={styleToCss(product.descriptionStyle)}
          clampLines={3} />
        

        <div className="mt-auto flex flex-col gap-4 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1" style={{ textAlign: product.priceStyle.align }}>
              <InlineText
                as="div"
                singleLine
                value={product.price}
                onChange={(value) => patchProduct(product.id, { price: value })}
                onActivate={() => select(product.id, 'price')}
                selected={isTarget('price')}
                anchor={`${product.id}:price`}
                label="Precio"
                placeholder="0,00 €"
                style={{ ...styleToCss(product.priceStyle), fontVariantNumeric: 'tabular-nums' }}
                clampLines={1} />
              
            </div>
          </div>

          <div
            className="relative"
            style={{
              textAlign: product.cta.align
            }}>
            
            {isTarget('cta') &&
            <span className="pointer-events-none absolute -top-2 left-0 z-20 -translate-y-full rounded-md bg-sel px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white">
                Botón
              </span>
            }
            <button
              type="button"
              data-editable={mode === 'edit' ? "true" : undefined}
              data-anchor={`${product.id}:cta`}
              onMouseDown={(event) => {
                event.stopPropagation();
                if (mode === 'edit') select(product.id, 'cta');
              }}
              onClick={(event) => {
                if (mode === 'preview') {
                  event.stopPropagation();
                  if (product.cta.link && product.cta.link.startsWith('http')) {
                    window.open(product.cta.link, '_blank');
                  } else {
                    editor.setViewingProductId(product.id);
                  }
                }
              }}
              style={ctaStyles}
              className={cn(
                ctaBase,
                mode === 'edit' && isTarget('cta') ?
                'ring-2 ring-sel ring-offset-2 ring-offset-white' :
                'hover:opacity-90'
              )}>
              
              <span className="truncate">{product.cta.text}</span>
            </button>
          </div>
        </div>
      </div>
    </article>);

}