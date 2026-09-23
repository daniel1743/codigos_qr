import React from 'react';
import {
  BoldIcon,
  CircleDashedIcon,
  CropIcon,
  ImageIcon,
  ImagesIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  Link2Icon,
  MoveIcon,
  PaintBucketIcon,
  PaintbrushIcon,
  PaletteIcon,
  PenLineIcon,
  PlusIcon,
  RefreshCwIcon,
  ScalingIcon,
  Settings2Icon,
  ShapesIcon,
  Trash2Icon,
  TypeIcon } from
'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { structureActions } from './structureActions';
import { socialStyleScope, type SocialStyle } from './EditableSocial';
import { PanelSection } from './controls/PanelSection';
import { Segmented } from './controls/Segmented';
import { SizeStepper } from './controls/SizeStepper';
import { AlignGroup, alignOptions } from './controls/AlignGroup';
import { SwatchRow } from './controls/SwatchRow';
import { ImagePicker } from './controls/ImagePicker';
import { PositionPad } from './controls/PositionPad';
import { LinkEditor } from './controls/LinkEditor';
import { CtaStylePicker } from './controls/CtaStylePicker';
import { HeroVariantPicker } from './controls/HeroVariantPicker';
import { PlatformPicker } from './controls/PlatformPicker';
import { GalleryPhotosPicker } from './controls/GalleryPhotosPicker';
import { ToneGrid } from './controls/ToneGrid';
import { FontPicker } from './controls/FontPicker';
import { socialPlatforms } from '../../data/socialPlatforms';
import type { EditorAction } from './editorAction';
import type { CtaVariant } from './EditableCTA';
import type { HeroVariant, SocialPlatform, TextAlign } from '../../types/editor';

/** The universal editing contract, per element kind. Same list feeds the desktop toolbar and the mobile sheet. */
export function useSelectionActions(): EditorAction[] {
  const ed = useEditor();
  const t = useThemeTokens();
  const sel = ed.selection;
  if (!sel) return [];

  const id = sel.id;
  const props = ed.doc.props[id] ?? {};
  const el = ed.getElement(id);
  const set = (key: string, value: string) => ed.setProp(id, key, value);

  switch (sel.kind) {
    case 'text':{
        const ts = ed.doc.textStyles[id] ?? {};
        const cs = el ? window.getComputedStyle(el) : null;
        const size = ts.size ?? Math.round(parseFloat(cs?.fontSize ?? '16'));
        const bold = ts.bold ?? (cs ? parseInt(cs.fontWeight, 10) >= 600 : false);
        const rawAlign = ts.align ?? cs?.textAlign ?? 'left';
        const align: TextAlign = rawAlign === 'center' ? 'center' : rawAlign === 'right' || rawAlign === 'end' ? 'right' : 'left';
        const AlignIcon = alignOptions.find((o) => o.value === align)?.icon ?? alignOptions[0].icon;
        return [
        { key: 'edit', label: 'Escribir', icon: PenLineIcon, mobileOnly: true, onClick: () => {ed.setEditingId(id);ed.setKeyboard(true);} },
        {
          key: 'size',
          label: 'Tamaño',
          icon: TypeIcon,
          inline: <SizeStepper value={size} onChange={(v) => ed.setTextStyle(id, { size: v })} />,
          panel: <SizeStepper large value={size} onChange={(v) => ed.setTextStyle(id, { size: v })} />
        },
        { key: 'bold', label: 'Negrita', icon: BoldIcon, active: bold, onClick: () => ed.setTextStyle(id, { bold: !bold }) },
        {
          key: 'color',
          label: 'Color',
          icon: PaletteIcon,
          swatch: ts.color ?? cs?.color,
          panel: <SwatchRow colors={t.swatches} value={ts.color} onChange={(c) => ed.setTextStyle(id, { color: c })} />
        },
        {
          key: 'align',
          label: 'Alinear',
          icon: AlignIcon,
          inline: <AlignGroup value={align} onChange={(v) => ed.setTextStyle(id, { align: v })} />,
          panel:
          <Segmented
            ariaLabel="Alineación"
            options={alignOptions.map((o) => ({ value: o.value, label: o.label, icon: o.icon }))}
            value={align}
            onChange={(v) => ed.setTextStyle(id, { align: v })} />


        }];

      }

    case 'image':
      return [
      { key: 'replace', label: 'Reemplazar', icon: RefreshCwIcon, showLabel: true, panel: <ImagePicker value={props.src} onChange={(v) => set('src', v)} onUpload={ed.uploadAsset} /> },
      {
        key: 'crop',
        label: 'Recortar',
        icon: CropIcon,
        panel:
        <PanelSection title="Zoom" hint="Acerca la imagen dentro de su marco.">
              <Segmented
            ariaLabel="Zoom"
            options={[
            { value: '1', label: 'Original' },
            { value: '1.15', label: '115%' },
            { value: '1.3', label: '130%' },
            { value: '1.5', label: '150%' }]
            }
            value={props.zoom ?? '1'}
            onChange={(v) => set('zoom', v)} />
          
            </PanelSection>

      },
      { key: 'position', label: 'Posición', icon: MoveIcon, panel: <PositionPad value={props.pos ?? 'center'} onChange={(v) => set('pos', v)} /> },
      { key: 'remove', label: 'Quitar', icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }];


    case 'avatar':{
        const ringOn = (props.ring ?? 'on') === 'on';
        return [
        { key: 'replace', label: 'Reemplazar', icon: RefreshCwIcon, showLabel: true, panel: <ImagePicker value={props.src} onChange={(v) => set('src', v)} onUpload={ed.uploadAsset} /> },
        {
          key: 'shape',
          label: 'Forma',
          icon: ShapesIcon,
          showLabel: true,
          panel:
          <Segmented
            ariaLabel="Forma del avatar"
            options={[
            { value: 'circle', label: 'Círculo' },
            { value: 'arch', label: 'Arco' },
            { value: 'rounded', label: 'Redondeado' }]
            }
            value={props.shape ?? el?.dataset.shape as string ?? 'circle'}
            onChange={(v) => set('shape', v)} />


        },
        { key: 'ring', label: 'Borde', icon: CircleDashedIcon, active: ringOn, onClick: () => set('ring', ringOn ? 'off' : 'on') },
        {
          key: 'size',
          label: 'Tamaño',
          icon: ScalingIcon,
          panel:
          <Segmented
            ariaLabel="Tamaño del avatar"
            options={[
            { value: 'S', label: 'Pequeño' },
            { value: 'M', label: 'Mediano' },
            { value: 'L', label: 'Grande' }]
            }
            value={props.size ?? 'M'}
            onChange={(v) => set('size', v)} />


        }];

      }

    case 'hero':
      return [
      { key: 'media', label: 'Imagen', icon: ImageIcon, showLabel: true, panel: <ImagePicker value={props.src} onChange={(v) => set('src', v)} onUpload={ed.uploadAsset} /> },
      {
        key: 'variant',
        label: 'Variante',
        icon: LayoutTemplateIcon,
        showLabel: true,
        panel: <HeroVariantPicker value={props.variant as HeroVariant ?? el?.querySelector('[data-hero]')?.getAttribute('data-hero') as HeroVariant ?? 'centered'} onChange={(v) => set('variant', v)} />
      },
      {
        key: 'shape',
        label: 'Forma',
        icon: ShapesIcon,
        panel:
        <Segmented
          ariaLabel="Forma de la portada"
          options={[
          { value: 'curve', label: 'Curva' },
          { value: 'straight', label: 'Recta' },
          { value: 'inset', label: 'Enmarcada' }]
          }
          value={props.shape ?? el?.querySelector('[data-hero]')?.getAttribute('data-shape') as string ?? 'curve'}
          onChange={(v) => set('shape', v)} />


      },
      { key: 'bg', label: 'Fondo', icon: PaintBucketIcon, panel: <ToneGrid tones={t.tones} value={props.bg} onChange={(v) => set('bg', v)} /> }];


    case 'cta':
      return [
      {
        key: 'label',
        label: 'Texto',
        icon: TypeIcon,
        showLabel: true,
        onClick: () => {
          ed.setEditingId(`${id}.label`);
          if (ed.isMobile) ed.setKeyboard(true);
        }
      },
      { key: 'url', label: 'Enlace', icon: Link2Icon, showLabel: true, panel: <LinkEditor value={props.href ?? el?.getAttribute('href') ?? ''} onChange={(v) => set('href', v)} /> },
      {
        key: 'style',
        label: 'Estilo',
        icon: PaintbrushIcon,
        showLabel: true,
        panel: <CtaStylePicker value={props.variant as CtaVariant ?? el?.dataset.variant as CtaVariant ?? 'solid'} onChange={(v) => set('variant', v)} />
      }];


    case 'social':{
        const scope = socialStyleScope(sel.blockKey, sel.parentId);
        const platform = props.platform as SocialPlatform ?? socialPlatforms.find((p) => p.label === sel.label)?.id ?? 'web';
        const current = ed.doc.props[scope]?.iconStyle as SocialStyle ?? el?.dataset.style as SocialStyle ?? 'circle';
        return [
        { key: 'platform', label: 'Red', icon: ShapesIcon, showLabel: true, panel: <PlatformPicker value={platform} onChange={(v) => set('platform', v)} /> },
        { key: 'url', label: 'Destino', icon: Link2Icon, showLabel: true, panel: <LinkEditor value={props.href ?? el?.getAttribute('href') ?? ''} onChange={(v) => set('href', v)} /> },
        {
          key: 'style',
          label: 'Estilo',
          icon: PaintbrushIcon,
          panel:
          <PanelSection title="Estilo de iconos" hint="Se aplica a todos los iconos de este grupo.">
              <Segmented
              ariaLabel="Estilo de iconos"
              options={[
              { value: 'circle', label: 'Círculo' },
              { value: 'square', label: 'Relleno' },
              { value: 'plain', label: 'Solo icono' }]
              }
              value={current}
              onChange={(v) => ed.setProp(scope, 'iconStyle', v)} />
            
            </PanelSection>

        },
        { key: 'remove', label: 'Quitar', icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }];

      }

    case 'card':{
        const imgId = `${id}.img`;
        const hasImage = !!ed.getElement(imgId);
        const actions: EditorAction[] = [
        { key: 'edit', label: 'Editar texto', icon: PenLineIcon, showLabel: true, onClick: () => ed.select(`${id}.title`) }];

        if (hasImage) {
          actions.push({
            key: 'image',
            label: 'Imagen',
            icon: ImageIcon,
            panel: <ImagePicker value={ed.doc.props[imgId]?.src} onChange={(v) => ed.setProp(imgId, 'src', v)} onUpload={ed.uploadAsset} />
          });
        }
        actions.push(
          { key: 'link', label: 'Enlace', icon: Link2Icon, panel: <LinkEditor value={props.href ?? ''} onChange={(v) => set('href', v)} /> },
          { key: 'remove', label: 'Quitar', icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }
        );
        return actions;
      }

    case 'gallery':{
        const current = props.items ? props.items.split('|') : Array.from(el?.querySelectorAll('img') ?? []).map((img) => img.getAttribute('src') ?? '');
        return [
        { key: 'photos', label: 'Fotos', icon: ImagesIcon, showLabel: true, panel: <GalleryPhotosPicker value={current} onChange={(v) => set('items', v.join('|'))} /> },
        {
          key: 'layout',
          label: 'Diseño',
          icon: LayoutGridIcon,
          showLabel: true,
          panel:
          <Segmented
            ariaLabel="Diseño de galería"
            options={[
            { value: 'fila', label: 'Fila' },
            { value: 'mosaico', label: 'Mosaico' },
            { value: 'carrusel', label: 'Carrusel' }]
            }
            value={props.layout ?? el?.dataset.layout as string ?? 'fila'}
            onChange={(v) => set('layout', v)} />


        }];

      }

    case 'section':{
        const bg: EditorAction = { key: 'bg', label: 'Fondo', icon: PaintBucketIcon, showLabel: true, panel: <ToneGrid tones={t.tones} value={props.bg} onChange={(v) => set('bg', v)} /> };
        if (!sel.blockKey) return [bg];
        const key = sel.blockKey;
        const block = ed.doc.blocks.find((b) => b.key === key);
        const actions: EditorAction[] = [bg];
        if (block?.type === 'collection') {
          actions.push({
            key: 'layout',
            label: 'Diseño',
            icon: LayoutGridIcon,
            panel:
            <Segmented
              ariaLabel="Presentación de la colección"
              options={[
              { value: 'lista', label: 'Lista' },
              { value: 'grid', label: 'Cuadrícula' }]
              }
              value={props.layout ?? el?.querySelector('[data-collection]')?.getAttribute('data-collection') as string ?? 'lista'}
              onChange={(v) => set('layout', v)} />


          });
        }
        actions.push({ key: 'add', label: 'Añadir debajo', icon: PlusIcon, mobileOnly: true, onClick: () => ed.openPicker(key) });
        return [...actions, ...structureActions(ed, key)];
      }

    case 'page':
      return [
      {
        key: 'bg',
        label: 'Fondo',
        icon: PaintBucketIcon,
        showLabel: true,
        panel:
        <ToneGrid
          tones={t.tones.filter((x) => t.pageTones.includes(x.id))}
          value={ed.doc.props.page?.bg ?? t.pageTones[0]}
          onChange={(v) => ed.setProp('page', 'bg', v)}
          allowDefault={false} />


      },
      {
        key: 'font',
        label: 'Tipografía',
        icon: TypeIcon,
        showLabel: true,
        panel: <FontPicker fonts={t.fonts} value={ed.doc.props.page?.font ?? t.fonts[0].id} onChange={(v) => ed.setProp('page', 'font', v)} />
      },
      { key: 'settings', label: 'Ajustes', icon: Settings2Icon, showLabel: true, onClick: () => ed.setSettingsOpen(true) }];


    default:
      return [];
  }
}
