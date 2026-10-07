import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import { SignatureBorder, type SignatureMode } from '../brand/SignatureBorder';
import { CripqerMark } from '../brand/CripqerLogo';

interface ComposerProps {
  size: 'lg' | 'md';
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  processing: boolean;
  footer?: ReactNode;
  autoFocus?: boolean;
  placeholder?: string;
}

export const COMPOSER_ID = 'cripqer-composer';

export function Composer({ size, value, onChange, onSubmit, processing, footer, autoFocus, placeholder = 'Cuéntame qué quieres crear…' }: ComposerProps) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const wasProcessing = useRef(processing);
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (wasProcessing.current && !processing) {
      wasProcessing.current = processing;
      setFinishing(true);
      const t = window.setTimeout(() => setFinishing(false), 1300);
      return () => window.clearTimeout(t);
    }
    wasProcessing.current = processing;
    return undefined;
  }, [processing]);

  useEffect(() => {
    if (autoFocus) textarea.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, [value, size]);

  const mode: SignatureMode = processing ? 'processing' : finishing ? 'finish' : focus ? 'listening' : hover ? 'hover' : 'idle';
  const lg = size === 'lg';
  const radius = lg ? 28 : 24;
  const canSend = value.trim().length > 0 && !processing;

  const submit = () => {
    if (canSend) onSubmit(value.trim());
  };

  const sendButton =
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      submit();
    }}
    disabled={!canSend}
    aria-label="Enviar"
    className={`flex shrink-0 items-center justify-center rounded-full transition-[background-color,transform,color] duration-150 ease-out active:scale-95 ${lg ? 'h-12 w-12' : 'h-10 w-10'} ${
    canSend ? 'bg-brand-blue text-white hover:bg-brand-blue-deep' : 'bg-subtle text-muted/60'}`
    }>
    
      <ArrowUpIcon className="h-[18px] w-[18px]" strokeWidth={2.25} />
    </button>;


  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => textarea.current?.focus()}
      className={`relative cursor-text bg-white shadow-[0_0_0_1px_rgba(15,26,46,0.08),0_1px_2px_rgba(15,26,46,0.04),0_24px_50px_-28px_rgba(15,26,46,0.28)] ${lg ? 'rounded-[28px]' : 'rounded-[24px]'}`}>
      
      <SignatureBorder mode={mode} radius={radius} />
      <label htmlFor={COMPOSER_ID} className="sr-only">
        Cuéntale a Cripqer qué quieres crear
      </label>

      {lg ?
      <div className="relative flex min-h-[112px] items-stretch gap-3 py-4 pl-5 pr-4 md:min-h-[124px] md:pl-6">
          <CripqerMark size={20} className="mt-[7px] shrink-0" />
          <textarea
          id={COMPOSER_ID}
          ref={textarea}
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="block min-h-[56px] flex-1 resize-none bg-transparent text-[17px] leading-relaxed text-ink placeholder:text-muted/80 focus:outline-none md:text-[18px]" />
        
          <div className="flex flex-col justify-end">{sendButton}</div>
        </div> :

      <>
          <textarea
          id={COMPOSER_ID}
          ref={textarea}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="relative block min-h-[30px] w-full resize-none bg-transparent px-5 pt-4 text-[15.5px] leading-relaxed text-ink placeholder:text-muted/80 focus:outline-none" />
        
          <div className="relative flex items-center justify-between gap-3 px-3 pb-3 pt-1.5">
            <div className="min-w-0 flex-1">{footer}</div>
            {sendButton}
          </div>
        </>
      }
    </div>);

}