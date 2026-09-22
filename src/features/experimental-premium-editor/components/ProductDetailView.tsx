import React from 'react';
import { ArrowLeftIcon } from 'lucide-react';
import { useEditor } from '../contexts/EditorContext';
import { cn } from '../utils/cn';

export function ProductDetailView() {
  const { products, viewingProductId, setViewingProductId } = useEditor();
  
  if (!viewingProductId) return null;
  const product = products.find(p => p.id === viewingProductId);
  if (!product) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-canvas overflow-y-auto" id="workspace-scroll-container">
      <div className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <button
          type="button"
          onClick={() => setViewingProductId(null)}
          className="mb-8 flex items-center gap-2 text-[14px] font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="h-4 w-4" strokeWidth={2} />
          Volver al catálogo
        </button>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_400px]">
          {/* Left Column: Image */}
          <div>
            <div className="overflow-hidden rounded-3xl border border-hairline bg-surface shadow-sm">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-[#EAE5DE]" />
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="flex flex-col">
            {product.category && (
              <span className="mb-4 inline-flex items-center self-start rounded-full bg-surface px-3 py-1 text-[12.5px] font-medium tracking-wide text-muted shadow-sm">
                {product.category.label}
              </span>
            )}
            
            <h1 className="font-display text-[32px] leading-tight text-ink sm:text-[40px]">
              {product.title}
            </h1>
            
            <p className="mt-4 text-[24px] font-medium text-ink">
              {product.price}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {product.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-lg bg-[#EAE7E1] px-2.5 py-1 text-[13px] text-body"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-8 text-[15.5px] leading-relaxed text-body">
              {product.longDescription || product.description}
            </p>

            <div className="mt-10">
              <button
                type="button"
                onClick={() => {
                  if (product.cta.link) window.open(product.cta.link, '_blank');
                }}
                className={cn(
                  'flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-medium transition-transform active:scale-[0.98]',
                  product.cta.variant === 'solid' && 'text-white',
                  product.cta.variant === 'outline' && 'border-2 border-current bg-transparent',
                  product.cta.variant === 'ghost' && 'bg-transparent underline underline-offset-4'
                )}
                style={{
                  backgroundColor: product.cta.variant === 'solid' ? product.cta.color : undefined,
                  color: product.cta.variant === 'solid' ? '#FFFFFF' : product.cta.color
                }}
              >
                {product.cta.text}
              </button>
            </div>
            
            {product.footerNote && (
              <p className="mt-6 text-center text-[12.5px] text-muted">
                {product.footerNote}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
