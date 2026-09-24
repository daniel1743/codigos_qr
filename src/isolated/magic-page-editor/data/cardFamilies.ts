import { images } from "./images";
import type { BlockType, CardFamily, CardFamilyDef } from "../types/editor";

/**
 * Five structured card families sharing one card shell.
 * Only `visible: true` families appear in the production block picker.
 */
export const cardFamilies: Record<CardFamily, CardFamilyDef> = {
  catalog: {
    id: "catalog",
    blockType: "catalog",
    label: "Catálogo",
    subtitle: "Productos, servicios, precios y tarjetas",
    visible: true,
    heading: "Catálogo",
    sub: "Productos y servicios seleccionados, con precio y reserva directa.",
    badgeOnImage: true,
    badgePresets: ["Nuevo", "Más reservado", "Destacado", "Edición limitada", "Agotado"],
    variants: [
      { id: "left", label: "Imagen izquierda", layout: "left", ratio: "25" },
      { id: "right", label: "Imagen derecha", layout: "right", ratio: "25" },
      { id: "top", label: "Imagen arriba", layout: "top" },
      { id: "bottom", label: "Imagen abajo", layout: "bottom" },
      { id: "editorial", label: "Editorial", layout: "editorial" },
      { id: "compact", label: "Compacta", layout: "compact" },
    ],

    items: [
      {
        image: images.bizFacial,
        title: "Tratamiento facial luminoso",
        description: "Limpieza profunda, exfoliación suave y mascarilla de vitamina C. 60 minutos.",
        price: "90 €",
        badge: "Más reservado",
        cta: "Reservar",
      },
      {
        image: images.productMug,
        title: "Taza de gres artesanal",
        description: "Torneada a mano en La Bisbal. Esmalte mate, apta para lavavajillas.",
        price: "28 €",
        badge: "Nuevo",
        cta: "Consultar",
      },
      {
        image: images.productCandle,
        title: "Vela de eucalipto",
        description: "Cera de soja y mecha de algodón. Unas 45 horas de combustión.",
        price: "24 €",
        cta: "Ver detalle",
      },
    ],
  },
  page: {
    id: "page",
    blockType: "cardPage",
    label: "Página",
    subtitle: "Información, destacados y contenido editorial",
    visible: false,
    heading: "Lo que debes saber",
    sub: "Novedades, información práctica y lo que nos hace distintos.",
    badgeOnImage: false,
    badgePresets: ["Novedad", "Importante", "Promoción"],
    variants: [
      { id: "left", label: "Contenido · imagen izquierda", layout: "left", ratio: "35" },
      { id: "right", label: "Contenido · imagen derecha", layout: "right", ratio: "35" },
      { id: "top", label: "Imagen arriba", layout: "top" },
      { id: "editorial", label: "Historia editorial", layout: "editorial" },
      { id: "highlight", label: "Información destacada", layout: "highlight" },
      { id: "compact", label: "Información compacta", layout: "compact" },
    ],

    items: [
      {
        image: images.bioStill,
        eyebrow: "Nuestra filosofía",
        title: "Cuidado, sin prisas",
        description: "Cada visita empieza con una conversación. Escuchamos antes de proponer nada.",
        cta: "Leer más",
      },
      {
        image: images.bizClinic,
        eyebrow: "Novedad",
        title: "Abrimos los sábados",
        description: "Desde octubre, sábados de 10:00 a 14:00 con cita previa.",
        cta: "Ver horarios",
      },
      {
        image: images.bioTable,
        eyebrow: "Promoción",
        title: "Tarjetas regalo",
        description: "Elige importe o tratamiento y la enviamos por email en el momento.",
        cta: "Regalar",
      },
    ],
  },
  portfolio: {
    id: "portfolio",
    blockType: "cardPortfolio",
    label: "Portafolio",
    subtitle: "Proyectos, casos y antes / después",
    visible: false,
    heading: "Trabajos recientes",
    sub: "Una selección de proyectos terminados este año.",
    badgeOnImage: false,
    badgePresets: ["Premiado", "En curso", "Publicado"],
    variants: [
      { id: "left", label: "Proyecto · imagen izquierda", layout: "left", ratio: "35" },
      { id: "right", label: "Proyecto · imagen derecha", layout: "right", ratio: "35" },
      { id: "top", label: "Imagen arriba", layout: "top" },
      { id: "editorial", label: "Proyecto editorial", layout: "editorial" },
      { id: "beforeAfter", label: "Antes / después", layout: "beforeAfter" },
      { id: "compact", label: "Proyecto compacto", layout: "compact" },
    ],

    items: [
      {
        image: images.roomAfter,
        imageBefore: images.roomBefore,
        eyebrow: "Interiorismo",
        meta: "2025",
        title: "Piso Almagro",
        description: "Reforma integral de 90 m² con cal, roble y lino.",
        cta: "Ver proyecto",
      },
      {
        image: images.pfVilla,
        imageBefore: images.pfHero,
        eyebrow: "Arquitectura",
        meta: "2026",
        title: "Casa Albar",
        description: "Vivienda unifamiliar frente al mar en Menorca.",
        cta: "Ver proyecto",
      },
      {
        image: images.pfArch,
        imageBefore: images.pfStair,
        eyebrow: "Fotografía",
        meta: "2025",
        title: "Estudio Cal",
        description: "Serie para un estudio de interiorismo en Madrid.",
        cta: "Ver proyecto",
      },
    ],
  },
  menu: {
    id: "menu",
    blockType: "cardMenu",
    label: "Menú",
    subtitle: "Platos, bebidas y precios",
    visible: false,
    heading: "La carta",
    sub: "Cocina de temporada. Cambiamos la carta cada seis semanas.",
    badgeOnImage: false,
    badgePresets: ["Popular", "Nuevo", "Recomendado", "Vegano", "Picante"],
    variants: [
      { id: "left", label: "Plato · imagen izquierda", layout: "left", ratio: "25" },
      { id: "right", label: "Plato · imagen derecha", layout: "right", ratio: "25" },
      { id: "top", label: "Plato · imagen arriba", layout: "top" },
      { id: "compact", label: "Fila de carta", layout: "compact" },
      { id: "featured", label: "Plato destacado", layout: "editorial" },
      { id: "editorialMenu", label: "Carta editorial", layout: "balanced" },
    ],

    items: [
      {
        image: images.dishBurrata,
        eyebrow: "Entrantes",
        title: "Burrata con tomates de temporada",
        description: "Albahaca fresca, aceite arbequina y sal en escamas.",
        price: "14 €",
        badge: "Popular",
      },
      {
        image: images.dishFish,
        eyebrow: "Principales",
        title: "Lubina a la brasa",
        description: "Alcaparras, limón asado y verduras de la huerta.",
        price: "24 €",
        badge: "Recomendado",
      },
      {
        image: images.dishDessert,
        eyebrow: "Postres",
        title: "Tarta de queso vasca",
        description: "Horneada cada mañana. Con un vermut de la casa.",
        price: "8 €",
        badge: "Nuevo",
      },
    ],
  },
  store: {
    id: "store",
    blockType: "cardStore",
    label: "Tienda",
    subtitle: "Productos con precio, oferta y compra",
    visible: false,
    heading: "Tienda",
    sub: "Piezas hechas a mano en pequeñas tiradas.",
    badgeOnImage: true,
    badgePresets: ["-25%", "Oferta", "Nuevo", "Últimas unidades", "Agotado"],
    variants: [
      { id: "left", label: "Producto · imagen izquierda", layout: "left", ratio: "35" },
      { id: "right", label: "Producto · imagen derecha", layout: "right", ratio: "35" },
      { id: "top", label: "Producto · imagen arriba", layout: "top" },
      { id: "grid", label: "Cuadrícula", layout: "top", dense: true },
      { id: "sale", label: "Oferta", layout: "top", sale: true },
      { id: "featured", label: "Producto destacado", layout: "editorial" },
    ],

    items: [
      {
        image: images.productTote,
        title: "Bolso de lino natural",
        description: "Lino lavado y asas de piel curtida vegetal.",
        price: "49 €",
        previousPrice: "65 €",
        badge: "-25%",
        cta: "Comprar",
      },
      {
        image: images.productMug,
        title: "Taza de gres",
        description: "Pieza única, torneada a mano.",
        price: "28 €",
        previousPrice: "32 €",
        badge: "Oferta",
        cta: "Comprar",
      },
      {
        image: images.productCandle,
        title: "Vela de eucalipto",
        description: "Cera de soja, 45 horas.",
        price: "24 €",
        badge: "Nuevo",
        cta: "Comprar",
      },
    ],
  },
};

export const cardFamilyOrder: CardFamily[] = ["catalog", "page", "portfolio", "menu", "store"];

export function familyForBlockType(type: BlockType): CardFamilyDef | undefined {
  return cardFamilyOrder.map((f) => cardFamilies[f]).find((f) => f.blockType === type);
}
