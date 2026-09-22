import { Product, TextStyle } from "../types/editor";

const text = (over: Partial<TextStyle> = {}): TextStyle => ({
  font: "Inter, system-ui, sans-serif",
  size: 15,
  color: "#4A443C",
  weight: 400,
  italic: false,
  underline: false,
  align: "left",
  ...over,
});

const titleStyle = (over: Partial<TextStyle> = {}): TextStyle =>
  text({ font: "Marcellus, Georgia, serif", size: 24, color: "#17140F", weight: 400, ...over });

const priceStyle = (over: Partial<TextStyle> = {}): TextStyle =>
  text({ font: "Inter, system-ui, sans-serif", size: 20, color: "#17140F", weight: 600, ...over });

const chrome = { background: "#FFFFFF", border: "#E6E1DA", radius: 18 };

const cta = (over: Partial<Product["cta"]> = {}): Product["cta"] => ({
  text: "Ver producto",
  link: "https://cripqer.com/producto",
  color: "#1E4D44",
  variant: "solid",
  align: "left",
  ...over,
});

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p-sofa",
    image: "/3b8c5f7e-d5df-477f-b03e-4dfa2662180e.jpg",
    imageState: "ready",
    imageOrigin: "reference",
    imageFocus: "center",
    imageCrop: "4/3",
    badge: "Nuevo",
    tags: ["Bouclé crema", "Modular", "3 plazas"],
    title: "Sofá modular Lienzo",
    titleStyle: titleStyle(),
    description: "Tapizado en bouclé natural con módulos reconfigurables y base de roble macizo.",
    descriptionStyle: text(),
    longDescription:
      "El sofá modular Lienzo se compone de tres módulos independientes que puedes recolocar según el espacio. El tapizado en bouclé de algodón natural es desenfundable y la estructura interior combina roble macizo con espuma de alta resiliencia. Entrega en 4–6 semanas con montaje incluido.",
    price: "2.480 €",
    priceStyle: priceStyle(),
    cta: cta(),
    card: { ...chrome },
    footerNote: "Envío y montaje incluidos · 4–6 semanas",
  },
  {
    id: "p-armchair",
    image: "/aa9c9c64-ccdb-444c-a72f-87ca31398218.jpg",
    imageState: "ready",
    imageOrigin: "reference",
    imageFocus: "center",
    imageCrop: "4/3",
    badge: null,
    tags: ["Lana gris", "Roble claro"],
    title: "Butaca Clásica",
    titleStyle: titleStyle(),
    description: "Silueta de media altura en lana peinada, con patas cónicas de roble.",
    descriptionStyle: text(),
    longDescription:
      "Una butaca de lectura con respaldo envolvente, tapizada en lana peinada gris carbón. Las patas cónicas de roble claro se atornillan en obra y el asiento incorpora suspensión de cintas elásticas para un apoyo firme y duradero.",
    price: "735 €",
    priceStyle: priceStyle(),
    cta: cta({ text: "Ver butaca" }),
    card: { ...chrome },
    footerNote: "Tapizado a medida disponible",
  },
  {
    id: "p-sideboard",
    image: "/050cab65-6eb0-400a-b7cc-845e50f48dcc.jpg",
    imageState: "ready",
    imageOrigin: "reference",
    imageFocus: "center",
    imageCrop: "4/3",
    badge: "Edición limitada",
    tags: ["Nogal", "Tiradores latón"],
    title: "Aparador Nogal 180",
    titleStyle: titleStyle(),
    description: "Puertas correderas de nogal con tiradores de latón cepillado y cable oculto.",
    descriptionStyle: text(),
    longDescription:
      "Aparador de 180 cm con dos puertas correderas en chapa de nogal, interior en arce y paso de cables trasero. Los tiradores son de latón cepillado macizo y desarrollan pátina con el uso. Serie de 40 unidades numeradas.",
    price: "1.960 €",
    priceStyle: priceStyle(),
    cta: cta({ text: "Reservar unidad" }),
    card: { ...chrome },
    footerNote: "40 unidades numeradas",
  },
  {
    id: "p-table",
    image: "/7ece7743-74cc-45d8-a252-c347df26992d.jpg",
    imageState: "ready",
    imageOrigin: "reference",
    imageFocus: "center",
    imageCrop: "4/3",
    badge: "Hecho a medida",
    tags: ["Roble macizo", "6–8 comensales", "Acabado mate"],
    title: "Mesa de comedor ovalada Roble Macizo edición taller",
    titleStyle: titleStyle(),
    description:
      "Tablero ovalado de roble macizo con acabado mate al agua, canto redondeado a mano y estructura atornillada para poder desmontarla; disponible en tres longitudes y cuatro tonos de acabado.",
    descriptionStyle: text(),
    longDescription:
      "Cada tablero se selecciona por veta y se termina a mano en el taller con aceite mate al agua. Disponible en 180, 220 y 260 cm, con cuatro tonos de acabado. La estructura se atornilla al tablero, lo que permite desmontarla para mudanzas.",
    price: "3.145,50 € / desde",
    priceStyle: priceStyle(),
    cta: cta({ text: "Solicitar presupuesto a medida" }),
    card: { ...chrome },
    footerNote: "Fabricación 8–10 semanas · Muestras de acabado gratuitas",
  },
  {
    id: "p-lamp",
    image: null,
    imageState: "empty",
    imageOrigin: "own",
    imageFocus: "center",
    imageCrop: "4/3",
    badge: null,
    tags: ["Lino", "Acero negro"],
    title: "Lámpara de arco Lino",
    titleStyle: titleStyle(),
    description: "Pantalla de lino natural sobre brazo de acero pavonado y base de travertino.",
    descriptionStyle: text(),
    longDescription:
      "Lámpara de pie con brazo en arco de acero pavonado, pantalla cilíndrica de lino natural y base de travertino de 22 cm. Incluye regulador de intensidad en el cable y bombilla LED cálida.",
    price: "410 €",
    priceStyle: priceStyle(),
    cta: cta({ text: "Ver lámpara" }),
    card: { ...chrome },
    footerNote: "Regulador de intensidad incluido",
  },
  {
    id: "p-bench",
    image: "/f55ca5d1-364a-427c-a6a5-a5dff0640b1a.jpg",
    imageState: "error",
    imageOrigin: "own",
    imageFocus: "center",
    imageCrop: "4/3",
    badge: null,
    tags: ["Travertino", "Acero"],
    title: "Mesa auxiliar Travertino",
    titleStyle: titleStyle(),
    description: "Sobre de travertino sin pulir con pie de acero fino y tope de fieltro.",
    descriptionStyle: text(),
    longDescription:
      "Mesa auxiliar de 42 cm de diámetro con sobre de travertino sin pulir, tratado con sellador mate. El pie de acero de 12 mm termina en topes de fieltro para no marcar el suelo.",
    price: "295 €",
    priceStyle: priceStyle(),
    cta: cta({ text: "Ver mesa" }),
    card: { ...chrome },
    footerNote: "Piedra natural: la veta varía en cada pieza",
  },
];

export const IMAGE_LIBRARY = [
  {
    id: "lib-sofa",
    name: "Salón bouclé",
    url: "/3b8c5f7e-d5df-477f-b03e-4dfa2662180e.jpg",
    origin: "reference" as const,
  },
  {
    id: "lib-armchair",
    name: "Butaca gris",
    url: "/aa9c9c64-ccdb-444c-a72f-87ca31398218.jpg",
    origin: "reference" as const,
  },
  {
    id: "lib-sideboard",
    name: "Aparador nogal",
    url: "/050cab65-6eb0-400a-b7cc-845e50f48dcc.jpg",
    origin: "reference" as const,
  },
  {
    id: "lib-table",
    name: "Comedor roble",
    url: "/7ece7743-74cc-45d8-a252-c347df26992d.jpg",
    origin: "own" as const,
  },
  {
    id: "lib-lamp",
    name: "Lámpara de arco",
    url: "/f55ca5d1-364a-427c-a6a5-a5dff0640b1a.jpg",
    origin: "own" as const,
  },
];
