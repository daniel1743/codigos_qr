import React from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { GlobeIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { miniGalleryVariants, pageFamilyVariants, templates } from '../../data/templates';
import { cardFamilies } from '../../data/cardFamilies';
import { PanelSection } from './controls/PanelSection';
import { TextField } from './controls/TextField';
import { FontPicker } from './controls/FontPicker';
import { ToneGrid } from './controls/ToneGrid';
import { Toggle } from './controls/Toggle';
import { cx } from '../../utils/cx';
import { applyCardFamilyVariant } from '../../utils/cardOps';

interface PageSettingsProps {
  variant: 'drawer' | 'sheet';
}

const ease = [0.23, 1, 0.32, 1] as const;

/** Advanced, page-wide settings. Deliberately one step away: never needed for everyday editing. */
export function PageSettings({ variant }: PageSettingsProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const meta = templates[ed.templateId];
  const isSheet = variant === 'sheet';
  const open = ed.settingsOpen && isSheet === ed.isMobile;
  const page = ed.doc.props.page ?? {};
  const pageFamily = String(page.family ?? ed.templateId);
  const catalogBlockKey = ed.doc.blocks.find((block) => block.type === 'catalog')?.key ?? 'catalog';
  const familyVariants = pageFamily === 'catalog' ? cardFamilies.catalog.variants : pageFamily === 'gallery' ? miniGalleryVariants : pageFamilyVariants[ed.templateId];
  const selectedFamilyVariant = pageFamily === 'catalog'
    ? ed.doc.props[`block:${catalogBlockKey}`]?.variant ?? familyVariants[0].id
    : page.familyVariant ?? familyVariants[0].id;
  const set = (key: string, value: string) => ed.setProp('page', key, value);

  return (
    <AnimatePresence>
      {open &&
      <motion.div
        key="settings"
        className={cx(isSheet ? 'absolute inset-0' : 'fixed inset-0 top-14', 'z-[60] bg-[#0B0D12]/25')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => ed.setSettingsOpen(false)}>
        
          <motion.aside
          role="dialog"
          aria-label="Ajustes de página"
          onClick={(e) => e.stopPropagation()}
          initial={isSheet ? { y: '100%' } : { x: '100%' }}
          animate={isSheet ? { y: 0 } : { x: 0 }}
          exit={isSheet ? { y: '100%' } : { x: '100%' }}
          transition={{ duration: 0.26, ease }}
          className={cx(
            'absolute flex flex-col bg-white text-ink',
            isSheet ? 'inset-x-0 bottom-0 max-h-[86%] rounded-t-[24px]' : 'bottom-0 right-0 top-0 w-[380px] border-l border-line shadow-toolbar'
          )}>
          
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold">Ajustes de página</h2>
                <p className="text-[12.5px] text-mute">Opciones avanzadas · {meta.short}</p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => ed.setSettingsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[#F2F3F5]">
                <XIcon className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              <PanelSection title="Página">
                <TextField label="Título de la página" value={page.title ?? meta.name} onCommit={(v) => set('title', v)} />
                <TextField label="Dirección" prefix="cripqer.com/" value={page.slug ?? meta.slug} onCommit={(v) => set('slug', v)} />
              </PanelSection>
              <PanelSection title="Tipografía">
                <FontPicker fonts={t.fonts} value={page.font ?? t.fonts[0].id} onChange={(v) => set('font', v)} />
              </PanelSection>
              <PanelSection title="Fondo de página">
                <ToneGrid 
                  tones={t.tones.filter((x) => t.pageTones.includes(x.id))} 
                  value={page.bgOverride ?? page.bg ?? t.pageTones[0]} 
                  onChange={(v) => {
                    set('bg', v);
                    set('bgOverride', v);
                  }} 
                  allowDefault={false} 
                />
              </PanelSection>
              {!ed.canonicalDocument && (
                <PanelSection title={`${meta.short} · variante visual`} hint="Cambia el ritmo visual sin borrar tu contenido.">
                <div className="grid grid-cols-2 gap-2">
                  {familyVariants.map((item, index) => {
                    const active = selectedFamilyVariant === item.id;
                    return <button key={item.id} type="button" aria-pressed={active} onClick={() => pageFamily === 'catalog' ? ed.updateDoc((doc) => applyCardFamilyVariant(doc, catalogBlockKey, item.id)) : set('familyVariant', item.id)} className={cx('rounded-xl border p-2 text-left', active ? 'border-select bg-select-soft' : 'border-line')}><span className={cx('mb-2 block h-12 overflow-hidden rounded-lg bg-[#EEF0F3]', index % 2 === 1 && 'p-2')}><span className={cx('block bg-[#C9CED6]', index % 4 === 0 ? 'h-full w-2/3' : index % 4 === 1 ? 'h-5 w-full' : index % 4 === 2 ? 'mx-auto h-full w-1/2 rounded-t-full' : 'mt-5 h-2 w-full')} /></span><span className="text-[12px] font-semibold text-ink">{item.label}</span></button>;
                  })}
                </div>
                </PanelSection>
              )}
              {pageFamily === 'gallery' && (
                <PanelSection title="Mini página galería" hint="Cinco composiciones completas centradas en fotografía.">
                <div className="grid grid-cols-2 gap-2">
                  {miniGalleryVariants.map((item, index) => {
                    const active = page.familyVariant === item.id;
                    return <button key={item.id} type="button" aria-pressed={active} onClick={() => set('familyVariant', item.id)} className={cx('rounded-xl border p-2 text-left', active ? 'border-select bg-select-soft' : 'border-line')}><span className="mb-2 grid h-12 grid-cols-3 gap-1 overflow-hidden rounded-lg bg-[#EEF0F3] p-1">{Array.from({ length: index + 3 }).slice(0, 5).map((_, cell) => <span key={cell} className={cx('bg-[#C9CED6]', index === 0 && cell === 0 && 'col-span-2', index === 1 && cell === 1 && 'row-span-2', index === 2 && 'min-w-7', index === 4 && cell % 2 === 0 && 'translate-y-1 rotate-[-3deg]')} />)}</span><span className="text-[12px] font-semibold text-ink">{item.label}</span></button>;
                  })}
                </div>
                </PanelSection>
              )}
              <PanelSection title="Buscadores y redes" hint="Cómo aparece tu página en Google y al compartirla.">
                <TextField label="Descripción" multiline value={page.seo ?? meta.description} onCommit={(v) => set('seo', v)} />
              </PanelSection>
              <PanelSection title="Dominio">
                <button
                type="button"
                onClick={() => toast('Conectar dominio', { description: 'Disponible en el plan Pro.' })}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left transition-colors duration-150 hover:bg-[#F7F8FA]">
                
                  <GlobeIcon className="h-4 w-4 text-mute" />
                  <span className="text-[13px] font-medium">Conectar un dominio propio</span>
                </button>
              </PanelSection>
              <PanelSection title="Privacidad">
                <Toggle label="Mostrar en buscadores" checked={(page.index ?? 'on') === 'on'} onChange={(v) => set('index', v ? 'on' : 'off')} />
                <Toggle label="Estadísticas de visitas" checked={(page.analytics ?? 'on') === 'on'} onChange={(v) => set('analytics', v ? 'on' : 'off')} />
              </PanelSection>
            </div>
          </motion.aside>
        </motion.div>
      }
    </AnimatePresence>);

}
