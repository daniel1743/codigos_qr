import React from 'react';

interface SystemSectionProps {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}

export function SystemSection({ id, title, intro, children }: SystemSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-12">
      <h2 className="text-[26px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {intro && <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-mute">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>);

}