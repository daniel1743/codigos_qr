import React from 'react';
import { ArrowRightIcon, ArrowUpRightIcon, MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon, PlayIcon, StarIcon } from 'lucide-react';
import { cardRadius, headingStyle } from '../../utils/templateStyle';
import { serviceIcons } from './serviceIcons';
import type { PageContent, Section, TemplateFamily } from '../../types/cripqer';

interface TemplateBlockProps {
  section: Section;
  template: TemplateFamily;
  content: PageContent;
}

const POS = ['50% 50%', '30% 40%', '70% 60%', '50% 25%'];

export function TemplateBlock({ section, template: t, content: c }: TemplateBlockProps) {
  const r = cardRadius(t);
  const surface = 'bg-[var(--t-surface)] border border-[color:var(--t-border)]';
  const title = (fallback: string) =>
  <h2 className="mb-5 text-[22px] leading-tight" style={headingStyle(t)}>
      {section.block === 'services' && c.servicesTitle || section.title || fallback}
    </h2>;


  switch (section.block) {
    case 'services':{
        if (section.layout === 'icons') {
          return (
            <section className="px-5 pt-10">
            <div className="grid grid-cols-4 gap-2">
              {c.services.slice(0, 4).map((s) => {
                  const Icon = serviceIcons[s.icon];
                  return (
                    <div key={s.title} className="flex flex-col items-center gap-2 py-2 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--t-surface)] text-[color:var(--t-accent)] border border-[color:var(--t-border)]">
                      <Icon className="h-5 w-5" strokeWidth={1.6} />
                    </span>
                    <span className="text-[11.5px] font-medium leading-tight">{s.title}</span>
                  </div>);

                })}
            </div>
          </section>);

        }
        if (section.layout === 'cards') {
          return (
            <section className="px-5 pt-10">
            <div className="grid grid-cols-3 gap-2">
              {c.services.slice(0, 3).map((s) => {
                  const Icon = serviceIcons[s.icon];
                  return (
                    <div key={s.title} className={`flex flex-col items-center gap-2 px-2 py-4 text-center ${surface}`} style={{ borderRadius: r }}>
                    <Icon className="h-5 w-5 text-[color:var(--t-accent)]" strokeWidth={1.6} />
                    <span className="text-[11.5px] font-medium leading-tight">{s.title}</span>
                    {s.price && <span className="text-[11px] text-[color:var(--t-muted)]">{s.price}</span>}
                  </div>);

                })}
            </div>
          </section>);

        }
        if (section.layout === 'rule') {
          return (
            <section className="px-6 pt-12">
            {title('Servicios')}
            <ul className="border-t border-[color:var(--t-border)]">
              {c.services.map((s) =>
                <li key={s.title} className="flex items-baseline gap-4 border-b border-[color:var(--t-border)] py-4">
                  <span className="w-6 shrink-0 text-[12px] font-semibold text-[color:var(--t-accent)]">{s.price}</span>
                  <div>
                    <p className="text-[15px] font-semibold">{s.title}</p>
                    <p className="mt-0.5 text-[13px] text-[color:var(--t-muted)]">{s.detail}</p>
                  </div>
                </li>
                )}
            </ul>
          </section>);

        }
        return (
          <section className="px-6 pt-10">
          {title('Servicios')}
          <ul className="flex flex-col">
            {c.services.map((s) =>
              <li key={s.title} className="flex items-baseline justify-between gap-4 py-3">
                <div>
                  <p className="text-[16px]" style={{ fontFamily: t.font.heading, fontWeight: 600 }}>
                    {s.title}
                  </p>
                  <p className="text-[12.5px] text-[color:var(--t-muted)]">{s.detail}</p>
                </div>
                <span className="text-[14px] font-semibold text-[color:var(--t-accent)]">{s.price}</span>
              </li>
              )}
          </ul>
        </section>);

      }

    case 'reviews':
      if (section.layout === 'quote') {
        const rv = c.reviews[0]!;
        return (
          <section className="px-7 pt-12 text-center">
            <div className="flex justify-center gap-0.5 text-[color:var(--t-accent)]">
              {[0, 1, 2, 3, 4].map((i) =>
              <StarIcon key={i} className="h-3.5 w-3.5 fill-current" />
              )}
            </div>
            <blockquote className="mt-4 text-[22px] italic leading-snug" style={{ fontFamily: t.font.heading }}>
              “{rv.quote}”
            </blockquote>
            <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-[color:var(--t-muted)]">{rv.author}</p>
          </section>);

      }
      return (
        <section className="px-6 pt-12">
          {title('Lo que dicen')}
          <div className="flex flex-col gap-3">
            {c.reviews.map((rv) =>
            <figure key={rv.author} className={`p-5 ${surface}`} style={{ borderRadius: r }}>
                <div className="flex gap-0.5 text-[color:var(--t-accent)]">
                  {[0, 1, 2, 3, 4].map((i) =>
                <StarIcon key={i} className="h-3.5 w-3.5 fill-current" />
                )}
                </div>
                <blockquote className="mt-3 text-[14.5px] leading-relaxed">“{rv.quote}”</blockquote>
                <figcaption className="mt-3 text-[12px] text-[color:var(--t-muted)]">{rv.author}</figcaption>
              </figure>
            )}
          </div>
        </section>);


    case 'whatsapp':
      return (
        <section className="px-6 pt-12">
          <div className={`p-6 text-center ${surface}`} style={{ borderRadius: r }}>
            <p className="text-[21px] leading-snug" style={headingStyle(t)}>
              ¿Hablamos?
            </p>
            <p className="mt-1 text-[13px] text-[color:var(--t-muted)]">Respondemos en minutos.</p>
            <span className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--t-accent)] text-[14px] font-semibold text-[color:var(--t-accent-text)]">
              <MessageCircleIcon className="h-4 w-4" />
              {c.cta}
            </span>
          </div>
        </section>);


    case 'imageCards':
      if (section.layout === 'row') {
        return (
          <section className="pt-12">
            <div className="px-6">{title('Destacados')}</div>
            <div className="flex gap-3 overflow-hidden pl-6">
              {c.imageCards.map((card, i) =>
              <article key={card.title} className="w-[180px] shrink-0">
                  <img src={card.image} alt="" className="h-[220px] w-full object-cover" style={{ borderRadius: r, objectPosition: POS[i % 4] }} />
                  <p className="mt-3 text-[15px]" style={{ fontFamily: t.font.heading, fontWeight: 600 }}>
                    {card.title}
                  </p>
                  <p className="text-[12.5px] text-[color:var(--t-muted)]">{card.detail}</p>
                </article>
              )}
            </div>
          </section>);

      }
      return (
        <section className="px-5 pt-10">
          <div className="grid grid-cols-2 gap-2.5">
            {c.imageCards.slice(0, 2).map((card, i) =>
            <article key={card.title} className="relative h-[190px] overflow-hidden" style={{ borderRadius: r }}>
                <img src={card.image} alt="" className="h-full w-full object-cover" style={{ objectPosition: POS[(i + 1) % 4] }} />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 text-white">
                  <span>
                    <span className="block text-[13px] font-semibold" style={t.font.uppercase ? { textTransform: 'uppercase', letterSpacing: '0.06em' } : undefined}>
                      {card.title}
                    </span>
                    <span className="block text-[11px] text-white/80">{card.detail}</span>
                  </span>
                  <ArrowUpRightIcon className="h-4 w-4" />
                </div>
              </article>
            )}
          </div>
        </section>);


    case 'social':
      return (
        <section className="px-6 pt-12">
          <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[color:var(--t-muted)]">Síguenos</p>
          <div className="flex flex-wrap gap-2">
            {c.social.map((s) =>
            <span
              key={s}
              className={`inline-flex h-10 items-center px-4 text-[13px] font-medium ${
              section.layout === 'solid' ? 'bg-[var(--t-accent)] text-[color:var(--t-accent-text)]' : surface}`
              }
              style={{ borderRadius: t.cardStyle === 'sharp' ? 0 : 999 }}>
              
                {s}
              </span>
            )}
          </div>
        </section>);


    case 'gallery':{
        const imgs = c.images.gallery;
        const layout = section.layout ?? 'row';
        if (layout === 'mosaic') {
          return (
            <section className="px-6 pt-12">
            {title('Galería')}
            <div className="grid grid-cols-2 grid-rows-2 gap-2" style={{ height: 300 }}>
              <img src={imgs[0]} alt="" className="row-span-2 h-full w-full object-cover" style={{ borderRadius: r }} />
              <img src={imgs[1] ?? imgs[0]} alt="" className="h-full w-full object-cover" style={{ borderRadius: r }} />
              <img src={imgs[2] ?? imgs[0]} alt="" className="h-full w-full object-cover" style={{ borderRadius: r }} />
            </div>
          </section>);

        }
        if (layout === 'editorial') {
          return (
            <section className="px-7 pt-14">
            <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-[color:var(--t-muted)]">Proyectos seleccionados</p>
            <img src={imgs[0]} alt="" className="h-[240px] w-full object-cover" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <img src={imgs[1] ?? imgs[0]} alt="" className="col-span-2 h-[150px] w-full object-cover" />
              <img src={imgs[2] ?? imgs[0]} alt="" className="h-[150px] w-full object-cover" />
            </div>
          </section>);

        }
        if (layout === 'stacked') {
          return (
            <section className="px-5 pt-10">
            <div className="grid grid-cols-2 gap-2">
              {imgs.slice(0, 3).map((src, i) =>
                <img
                  key={i}
                  src={src}
                  alt=""
                  className={`w-full object-cover ${i === 0 ? 'col-span-2 h-[220px]' : 'h-[150px]'}`}
                  style={{ objectPosition: POS[i % 4], borderRadius: r }} />

                )}
            </div>
          </section>);

        }
        if (layout === 'carousel') {
          return (
            <section className="pt-12">
            <div className="flex gap-2 overflow-hidden pl-6">
              {imgs.map((src, i) =>
                <img key={i} src={src} alt="" className="h-[280px] w-[230px] shrink-0 object-cover" style={{ borderRadius: r }} />
                )}
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
              {imgs.map((_, i) =>
                <span key={i} className={`h-1.5 rounded-full ${i === 0 ? 'w-5 bg-[var(--t-text)]' : 'w-1.5 bg-[var(--t-border)]'}`} />
                )}
            </div>
          </section>);

        }
        return (
          <section className="px-5 pt-8">
          <div className="grid grid-cols-3 gap-2">
            {imgs.slice(0, 3).map((src, i) =>
              <img key={i} src={src} alt="" className="h-[120px] w-full object-cover" style={{ borderRadius: Math.min(r, 14), objectPosition: POS[i % 4] }} />
              )}
          </div>
        </section>);

      }

    case 'location':
      return (
        <section className="px-6 pt-12">
          {title('Visítanos')}
          <div className={`overflow-hidden ${surface}`} style={{ borderRadius: r }}>
            <svg viewBox="0 0 340 140" className="block h-[140px] w-full" aria-hidden>
              <rect width="340" height="140" fill="var(--t-bg)" />
              <path d="M0 48 H340 M0 104 H340 M92 0 V140 M226 0 V140" stroke="var(--t-border)" strokeWidth="10" />
              <path d="M0 18 L340 132" stroke="var(--t-border)" strokeWidth="6" />
              <circle cx="160" cy="72" r="14" fill="var(--t-accent)" />
              <circle cx="160" cy="72" r="5" fill="var(--t-accent-text)" />
            </svg>
            <div className="flex items-start justify-between gap-3 p-4">
              <div>
                <p className="flex items-center gap-1.5 text-[14px] font-semibold">
                  <MapPinIcon className="h-4 w-4 text-[color:var(--t-accent)]" />
                  {c.location.address}
                </p>
                <p className="mt-1 text-[12px] text-[color:var(--t-muted)]">{c.location.hours}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-[color:var(--t-accent)]">
                Google Maps <ArrowUpRightIcon className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </section>);


    case 'profile':
      return (
        <section className="px-6 pt-12">
          <div className="flex items-start gap-4">
            <img src={c.images.portrait} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover object-top" />
            <div>
              <p className="text-[16px] font-semibold">{c.name}</p>
              <p className="text-[12px] text-[color:var(--t-muted)]">{c.role}</p>
              <p className="mt-3 text-[14px] leading-relaxed">{c.about}</p>
            </div>
          </div>
        </section>);


    case 'links':
      return (
        <section className="px-6 pt-10">
          <div className="flex flex-col gap-2.5">
            {c.links.map((l, i) =>
            <span
              key={l}
              className={`flex h-14 items-center justify-between rounded-[16px] px-5 text-[14.5px] font-semibold ${
              i === 0 ? 'bg-[var(--t-accent)] text-[color:var(--t-accent-text)]' : surface}`
              }>
              
                {l}
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            )}
          </div>
        </section>);


    case 'video':
      return (
        <section className="px-6 pt-10">
          <div className="relative h-[200px] overflow-hidden" style={{ borderRadius: r }}>
            <img src={c.images.gallery[1] ?? c.images.hero} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
            <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#111]">
              <PlayIcon className="ml-0.5 h-5 w-5 fill-current" />
            </span>
            <span className="absolute bottom-3 left-3 text-[13px] font-semibold text-white">{c.videoTitle}</span>
            <span className="absolute bottom-3 right-3 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">YouTube</span>
          </div>
        </section>);


    case 'separator':{
        const s = section.layout;
        return (
          <div className="flex items-center justify-center gap-3 px-10 pt-10" aria-hidden>
          {s === 'double' ?
            <div className="flex w-full flex-col gap-[3px]">
              <span className="h-px bg-[var(--t-border)]" />
              <span className="h-px bg-[var(--t-border)]" />
            </div> :
            s === 'minimal' ?
            <span className="h-px w-full bg-[var(--t-border)]" /> :

            <>
              <span className="h-px flex-1 bg-[var(--t-border)]" />
              <span className={s === 'luxury' ? 'h-1.5 w-1.5 rotate-45 bg-[var(--t-accent)]' : 'h-1 w-1 rounded-full bg-[var(--t-accent)]'} />
              <span className="h-px flex-1 bg-[var(--t-border)]" />
            </>
            }
        </div>);

      }

    case 'cta':
      return (
        <section className="px-6 pt-12">
          <div className="bg-[var(--t-accent)] p-7 text-[color:var(--t-accent-text)]" style={{ borderRadius: r }}>
            <p className="text-[24px] leading-tight" style={headingStyle(t)}>
              {c.tagline}
            </p>
            <span className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--t-accent-text)] px-5 text-[13px] font-semibold text-[color:var(--t-accent)]">
              {c.cta}
              <ArrowRightIcon className="h-4 w-4" />
            </span>
          </div>
        </section>);


    case 'text':
      return (
        <section className="px-7 pt-12">
          <p className="text-[17px] leading-relaxed">{c.about}</p>
        </section>);


    case 'contact':
      return (
        <section className="px-7 pt-12">
          <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-[color:var(--t-muted)]">Contacto</p>
          <div className="border-t border-[color:var(--t-border)]">
            {[
            { icon: MailIcon, label: `hola@${c.name.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.com` },
            { icon: PhoneIcon, label: '+56 9 8765 4321' },
            { icon: MapPinIcon, label: c.location.address }].
            map(({ icon: Icon, label }) =>
            <p key={label} className="flex items-center gap-3 border-b border-[color:var(--t-border)] py-4 text-[14px]">
                <Icon className="h-4 w-4 text-[color:var(--t-muted)]" />
                {label}
              </p>
            )}
          </div>
          <span className="mt-6 inline-flex h-12 items-center gap-2 bg-[var(--t-accent)] px-6 text-[13px] font-semibold text-[color:var(--t-accent-text)]" style={{ borderRadius: r ? 999 : 0 }}>
            {c.cta}
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        </section>);

  }
}