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
  TypeIcon,
  BadgeCheckIcon,
  LayersIcon } from
'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { structureActions } from './structureActions';
import { socialStyleScope, type SocialStyle, type SocialLayout, type SocialShape, type SocialFill, type SocialSize } from './EditableSocial';
import { PanelSection } from './controls/PanelSection';
import { Segmented } from './controls/Segmented';
import { SizeStepper } from './controls/SizeStepper';
import { AlignGroup, alignOptions } from './controls/AlignGroup';
import { SwatchRow } from './controls/SwatchRow';
import { ImagePicker } from './controls/ImagePicker';
import { FreeCropControl, PositionPad } from './controls/PositionPad';
import { LinkEditor } from './controls/LinkEditor';
import { CtaStylePicker } from './controls/CtaStylePicker';
import { CtaTreatmentPicker } from './controls/CtaTreatmentPicker';
import { HeroVariantPicker } from './controls/HeroVariantPicker';
import { PlatformPicker } from './controls/PlatformPicker';
import { GalleryPhotosPicker } from './controls/GalleryPhotosPicker';
import { ToneGrid } from './controls/ToneGrid';
import { FontPicker } from './controls/FontPicker';
import { PalettePicker } from './controls/PalettePicker';
import { DecorationPicker } from './controls/DecorationPicker';
import { TypographyTreatmentPicker } from './controls/TypographyTreatmentPicker';
import { socialPlatforms } from '../../data/socialPlatforms';
import { familyForBlockType } from '../../data/cardFamilies';
import { CardLayoutPicker } from '../cards/CardLayoutPicker';
import { galleryLayouts } from '../blocks/GalleryGrid';
import { badgeActions, ctaAlignAction, familyCardActions, getCardContext, priceActions } from '../cards/cardActions';
import type { CardLayout } from '../../types/editor';
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
  const propId = sel.kind === 'image' && id.endsWith(':hero-image') ? id.slice(0, -':hero-image'.length) : id;
  const mediaShapeKey = sel.kind === 'image' && id.endsWith(':hero-image') ? 'mediaShape' : 'shape';
  const props = ed.doc.props[propId] ?? {};
  const el = ed.getElement(id);
  const set = (key: string, value: string) => ed.setProp(propId, key, value);

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


        },
        { key: 'typography', label: 'Tratamiento', icon: TypeIcon, showLabel: true, panel: <TypographyTreatmentPicker value={ts} onChange={(patch) => ed.setTextStyle(id, patch)} /> },
        { key: 'remove', label: 'Ocultar ' + sel.label.toLowerCase(), icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }];

      }

    case 'image':
      return [
      { key: 'replace', label: 'Reemplazar', icon: RefreshCwIcon, showLabel: true, panel: <ImagePicker value={props.src} onChange={(v) => set('src', v)} /> },
      {
        key: 'shape',
        label: 'Forma',
        icon: ShapesIcon,
        showLabel: true,
        panel: <PanelSection title="Forma de imagen">
          <Segmented ariaLabel="Forma de imagen" options={[
            { value: 'square', label: 'Cuadrada' },
            { value: 'rounded', label: 'Redondeada' },
            { value: 'circle', label: 'Círculo' },
            { value: 'oval', label: 'Óvalo' },
            { value: 'arch', label: 'Arco' },
            { value: 'bleed', label: 'A sangre' }
          ]} value={props[mediaShapeKey] ?? 'rounded'} onChange={(v) => set(mediaShapeKey, v)} />
        </PanelSection>
      },
      {
        key: 'crop',
        label: 'Recortar',
        icon: CropIcon,
        panel:
        <><PanelSection title="Encuadre libre">
          <FreeCropControl x={Number(props.cropX ?? 50)} y={Number(props.cropY ?? 50)} zoom={Number(props.zoom ?? 1)} onChange={set} />
        </PanelSection><PanelSection title="Zoom rápido" hint="Acerca la imagen dentro de su marco.">
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

            </PanelSection><PanelSection title="Posición rápida"><PositionPad value={props.pos ?? 'center'} onChange={(v) => set('pos', v)} /></PanelSection></>

      },
      {
        key: 'fit',
        label: 'Ajuste',
        icon: ScalingIcon,
        panel:
        <PanelSection title="Ajuste" hint="Rellenar recorta la imagen; Encajar la muestra completa.">
              <Segmented
            ariaLabel="Ajuste de imagen"
            options={[
            { value: 'cover', label: 'Rellenar' },
            { value: 'contain', label: 'Encajar' }]
            }
            value={props.fit ?? 'cover'}
            onChange={(v) => set('fit', v)} />

            </PanelSection>

      },
      { key: 'position', label: 'Posición', icon: MoveIcon, panel: <PositionPad value={props.pos ?? 'center'} onChange={(v) => set('pos', v)} /> },
      { key: 'overlay', label: 'Overlay', icon: LayersIcon, panel: <PanelSection title="Intensidad del overlay"><Segmented ariaLabel="Overlay de imagen" options={[{ value: 'none', label: 'Sin' }, { value: 'soft', label: 'Suave' }, { value: 'medium', label: 'Medio' }, { value: 'intense', label: 'Intenso' }]} value={props.overlay ?? 'none'} onChange={(v) => set('overlay', v)} /></PanelSection> },
      ...(sel.label === 'Vídeo' ? [{ key: 'video-url', label: 'Enlace', icon: Link2Icon, showLabel: true, panel: <LinkEditor value={props.href ?? ''} onChange={(v) => set('href', v)} /> } as EditorAction] : []),
      { key: 'remove', label: 'Quitar', icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }];


    case 'avatar':{
        const ringOn = (props.ring ?? 'on') === 'on';
        return [
        { key: 'replace', label: 'Reemplazar', icon: RefreshCwIcon, showLabel: true, panel: <ImagePicker value={props.src} onChange={(v) => set('src', v)} /> },
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
            { value: 'rounded', label: 'Redondeado' },
            { value: 'square', label: 'Cuadrado' },
            { value: 'arch', label: 'Arco' }]
            }
            value={props.shape ?? el?.dataset.shape as string ?? 'circle'}
            onChange={(v) => set('shape', v)} />


        },
        { key: 'ring', label: 'Borde', icon: CircleDashedIcon, active: ringOn, onClick: () => set('ring', ringOn ? 'off' : 'on') },
        { key: 'crop', label: 'Encuadre', icon: CropIcon, panel: <><PanelSection title="Encuadre libre"><FreeCropControl x={Number(props.cropX ?? 50)} y={Number(props.cropY ?? 50)} zoom={Number(props.zoom ?? 1)} onChange={set} /></PanelSection><PanelSection title="Zoom rápido"><Segmented ariaLabel="Zoom del avatar" options={[{ value: '1', label: '100%' }, { value: '1.15', label: '115%' }, { value: '1.3', label: '130%' }, { value: '1.5', label: '150%' }]} value={props.zoom ?? '1'} onChange={(v) => set('zoom', v)} /></PanelSection><PanelSection title="Posición rápida"><PositionPad value={props.pos ?? 'center'} onChange={(v) => set('pos', v)} /></PanelSection></> },
        { key: 'overlay', label: 'Overlay', icon: LayersIcon, panel: <PanelSection title="Overlay del avatar"><Segmented ariaLabel="Overlay del avatar" options={[{ value: 'none', label: 'Sin' }, { value: 'soft', label: 'Suave' }, { value: 'medium', label: 'Medio' }, { value: 'intense', label: 'Intenso' }]} value={props.overlay ?? 'none'} onChange={(v) => set('overlay', v)} /></PanelSection> },
        { key: 'verified', label: 'Verificado', icon: BadgeCheckIcon, active: props.badge === 'on', panel: <><PanelSection title="Badge verificado"><Segmented ariaLabel="Mostrar badge" options={[{ value: 'off', label: 'Oculto' }, { value: 'on', label: 'Visible' }]} value={props.badge ?? 'on'} onChange={(v) => set('badge', v)} /><SwatchRow colors={t.swatches} value={props.badgeColor} onChange={(v) => set('badgeColor', v ?? t.accent)} /></PanelSection><PanelSection title="Junto al nombre"><Segmented ariaLabel="Verificado junto al nombre" options={[{ value: 'off', label: 'No' }, { value: 'on', label: 'Sí' }]} value={props.badgeByName ?? 'off'} onChange={(v) => set('badgeByName', v)} /></PanelSection></> },
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


        }, { key: 'remove', label: 'Ocultar ' + sel.label.toLowerCase(), icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }];

      }

    case 'hero':
      return [
      { key: 'media', label: 'Imagen', icon: ImageIcon, showLabel: true, panel: <ImagePicker value={props.src} onChange={(v) => set('src', v)} /> },
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
      { key: 'bg', label: 'Fondo', icon: PaintBucketIcon, panel: <ToneGrid tones={t.tones} value={props.bg} onChange={(v) => set('bg', v)} /> },
      { key: 'crop', label: 'Encuadre', icon: CropIcon, panel: <><PanelSection title="Encuadre libre"><FreeCropControl x={Number(props.cropX ?? 50)} y={Number(props.cropY ?? 50)} zoom={Number(props.zoom ?? 1)} onChange={set} /></PanelSection><PanelSection title="Posición rápida"><PositionPad value={props.pos ?? 'center'} onChange={(v) => set('pos', v)} /></PanelSection></> },
      { key: 'overlay', label: 'Overlay', icon: LayersIcon, panel: <><PanelSection title="Intensidad"><Segmented ariaLabel="Overlay de portada" options={[{ value: 'none', label: 'Sin' }, { value: 'soft', label: 'Suave' }, { value: 'medium', label: 'Medio' }, { value: 'intense', label: 'Intenso' }]} value={props.overlay ?? 'none'} onChange={(v) => set('overlay', v)} /></PanelSection><PanelSection title="Color"><SwatchRow colors={t.swatches} value={props.overlayColor} onChange={(v) => set('overlayColor', v ?? '#111318')} /></PanelSection></> },
      { key: 'fusion', label: 'Fusión', icon: PaintbrushIcon, panel: <PanelSection title="Portada + fondo"><Segmented ariaLabel="Fusión de portada y fondo" options={[{ value: 'none', label: 'Sin' }, { value: 'fade', label: 'Fade' }, { value: 'dominant', label: 'Color' }, { value: 'halo', label: 'Halo' }, { value: 'organic', label: 'Orgánica' }]} value={props.fusion ?? 'none'} onChange={(v) => set('fusion', v)} /></PanelSection> }];


    case 'familyCard':{
        const ctx = getCardContext(ed, id, sel.blockKey);
        return ctx ? familyCardActions(ed, ctx) : [];
      }

    case 'price':
      return priceActions(ed, t, id, getCardContext(ed, id, sel.blockKey), el);

    case 'badge':
      return badgeActions(ed, id, getCardContext(ed, id, sel.blockKey), el);

    case 'cta':
      return [
      ...(getCardContext(ed, id, sel.blockKey) ? [ctaAlignAction(ed, id)] : []),
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
      },
      {
        key: 'treatment',
        label: 'Forma y tamaño',
        icon: ShapesIcon,
        showLabel: true,
        panel: <CtaTreatmentPicker
          shape={props.shape as 'square' | 'soft' | 'pill' | 'circle' | undefined}
          size={props.size as 'sm' | 'md' | 'lg' | 'full' | undefined}
          iconPosition={props.iconPosition as 'none' | 'left' | 'right' | undefined}
          kind={props.kind as 'standard' | 'card' | undefined}
          onChange={(key, value) => set(key, value)} />
      },
      { key: 'remove', label: 'Eliminar', icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }];


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
          <div className="space-y-4"><PanelSection title="Estilo de iconos" hint="Se aplica a todos los iconos de este grupo.">
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
            <PanelSection title="Distribución"><Segmented ariaLabel="Distribución social" options={[{ value: 'row', label: 'Fila' }, { value: 'column', label: 'Columna' }, { value: 'arc', label: 'Arco' }, { value: 'cluster', label: 'Grupo' }]} value={ed.doc.props[scope]?.socialLayout as SocialLayout ?? 'row'} onChange={(v) => ed.setProp(scope, 'socialLayout', v)} /></PanelSection>
            <PanelSection title="Forma"><Segmented ariaLabel="Forma social" options={[{ value: 'circle', label: 'Círculo' }, { value: 'rounded', label: 'Suave' }, { value: 'square', label: 'Cuadrado' }]} value={ed.doc.props[scope]?.socialShape as SocialShape ?? 'circle'} onChange={(v) => ed.setProp(scope, 'socialShape', v)} /></PanelSection>
            <PanelSection title="Relleno"><Segmented ariaLabel="Relleno social" options={[{ value: 'filled', label: 'Relleno' }, { value: 'outline', label: 'Contorno' }, { value: 'plain', label: 'Plano' }]} value={ed.doc.props[scope]?.socialFill as SocialFill ?? 'filled'} onChange={(v) => ed.setProp(scope, 'socialFill', v)} /></PanelSection>
            <PanelSection title="Tamaño"><Segmented ariaLabel="Tamaño social" options={[{ value: 'sm', label: 'S' }, { value: 'md', label: 'M' }, { value: 'lg', label: 'L' }]} value={ed.doc.props[scope]?.socialSize as SocialSize ?? 'md'} onChange={(v) => ed.setProp(scope, 'socialSize', v)} /></PanelSection>
          </div>

        },
        { key: 'remove', label: 'Quitar', icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }];

      }

    case 'card':{
        if (sel.label === 'Vídeo') {
          return [
            { key: 'video-url', label: 'Enlace', icon: Link2Icon, showLabel: true, panel: <LinkEditor value={props.href ?? ''} onChange={(v) => set('href', v)} /> },
            { key: 'replace', label: 'Portada', icon: ImageIcon, panel: <ImagePicker value={props.src} onChange={(v) => set('src', v)} /> },
            { key: 'crop', label: 'Encuadre', icon: CropIcon, panel: <><PanelSection title="Encuadre libre"><FreeCropControl x={Number(props.cropX ?? 50)} y={Number(props.cropY ?? 50)} zoom={Number(props.zoom ?? 1)} onChange={set} /></PanelSection><PanelSection title="Posición rápida"><PositionPad value={props.pos ?? 'center'} onChange={(v) => set('pos', v)} /></PanelSection></> }
          ];
        }
        const imgId = `${id}.img`;
        const hasImage = !!ed.getElement(imgId);
        const actions: EditorAction[] = [
        { key: 'edit', label: 'Editar texto', icon: PenLineIcon, showLabel: true, onClick: () => ed.select(`${id}.title`) }];

        if (hasImage) {
          actions.push({
            key: 'image',
            label: 'Imagen',
            icon: ImageIcon,
            panel: <ImagePicker value={ed.doc.props[imgId]?.src} onChange={(v) => ed.setProp(imgId, 'src', v)} />
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
            options={galleryLayouts}
            value={props.layout ?? el?.dataset.layout as string ?? 'fila'}
            onChange={(v) => set('layout', v)} />


        }, { key: 'remove', label: 'Ocultar ' + sel.label.toLowerCase(), icon: Trash2Icon, danger: true, onClick: () => ed.removeElement(id, sel.label) }];

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
        const family = block ? familyForBlockType(block.type) : undefined;
        if (family) {
          actions.push({
            key: 'variant',
            label: 'Variante',
            icon: LayoutTemplateIcon,
            showLabel: true,
            panel:
            <PanelSection title={`${family.label} · variante`} hint="Se aplica a todas las tarjetas del bloque. Cada tarjeta puede cambiar su diseño por separado.">
              <CardLayoutPicker
                options={family.variants.map((v) => ({ value: v.id as CardLayout, label: v.label }))}
                value={(props.variant ?? family.variants[0].id) as CardLayout}
                onChange={(v) => set('variant', v)}
                thumbFor={(v) => family.variants.find((x) => x.id === v)?.layout ?? 'left'} />

            </PanelSection>

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
      {
        key: 'palette',
        label: 'Paleta',
        icon: PaletteIcon,
        showLabel: true,
        panel: <PalettePicker value={ed.doc.props['page']?.['palette']} onChange={(v) => ed.setProp('page', 'palette', v)} />
      },
      {
        key: 'decorations',
        label: 'Decoración',
        icon: ShapesIcon,
        panel: <PanelSection title="Elementos decorativos" hint="No interfieren con la selección ni con los clics.">
          <DecorationPicker values={ed.doc.props.page ?? {}} onChange={(key, value) => ed.setProp('page', key, value)} />
        </PanelSection>
      },
      { key: 'settings', label: 'Ajustes', icon: Settings2Icon, showLabel: true, onClick: () => ed.setSettingsOpen(true) }];


    default:
      return [];
  }
}
