export interface ProductRecord {
  product_id: string;
  canonical_name: string;
  aliases: string[];
  category: string;
  price: string;
  short_description: string;
  details: string;
}

export const fuxionKnowledgeBase: ProductRecord[] = [
  {
    product_id: "prunex1",
    canonical_name: "Prunex1",
    aliases: ["prunex", "prunex 1", "prunex1"],
    category: "Limpieza Digestiva",
    price: "23.300 CLP",
    short_description: "T\u00e9 herbal con mezcla de fibras solubles y extracto de guind\u00f3n ideal para apoyar el tr\u00e1nsito intestinal lento y la limpieza del colon.",
    details: "Prunex1 es un t\u00e9 herbal en polvo del Sistema Base de FuXion dise\u00f1ado para personas con tr\u00e1nsito intestinal lento o que desean apoyar la limpieza del colon dentro de h\u00e1bitos saludables. Su f\u00f3rmula combina fibras solubles como psyllium, inulina de achicoria y muc\u00edlago de linaza con extracto de guind\u00f3n y kelp.  Estas fibras pueden aumentar el volumen del contenido intestinal y favorecer evacuaciones m\u00e1s regulares, mientras que el extracto de guind\u00f3n aporta un componente frutal tradicionalmente asociado al alivio del estre\u00f1imiento ocasional. Se disuelve en agua caliente y se suele tomar por la noche."
  },
  {
    product_id: "rexet",
    canonical_name: "Rexet",
    aliases: ["rexet", "reset"],
    category: "Limpieza Digestiva",
    price: "36.000 CLP",
    short_description: "Bebida efervescente sabor tuna ideal para apoyar la funci\u00f3n hep\u00e1tica y la desintoxicaci\u00f3n, combinando extractos vegetales y micronutrientes.",
    details: "Rexet es una bebida efervescente del Sistema Base de FuXion con sabor a tuna, orientada a quienes desean apoyar la funci\u00f3n hep\u00e1tica y la depuraci\u00f3n as\u00ed como mantener su cuerpo en equilibrio. Su f\u00f3rmula combina concentrados vegetales como alcachofa, perejil y clorofila con vitaminas del complejo B, vitamina C y zinc en mol\u00e9cula org\u00e1nica.  La marca indica que contribuye a proteger el h\u00edgado, promover su funci\u00f3n desintoxicante y mantener el cuerpo limpio de toxinas, especialmente como parte de programas de detox nutricional. Se disuelve en agua fr\u00eda y se bebe de inmediato para aprovechar la efervescencia."
  },
  {
    product_id: "flora_liv",
    canonical_name: "Flora Liv",
    aliases: ["flora liv", "floraliv"],
    category: "Limpieza Digestiva",
    price: "43.000 CLP",
    short_description: "Bebida probi\u00f3tica sabor granadilla y aguaymanto ideal para nutrir, reconstruir y equilibrar la flora intestinal y apoyar defensas.",
    details: "Flora Liv es una bebida funcional en polvo con sabor granadilla y aguaymanto que forma parte del Sistema Base de FuXion. Su f\u00f3rmula combina cultivos probi\u00f3ticos, fibra prebi\u00f3tica y extractos frutales, y se presenta como apoyo para regenerar y equilibrar la flora intestinal, necesaria para una correcta asimilaci\u00f3n de nutrientes y para la protecci\u00f3n inmunitaria.  Cada toma aporta un n\u00famero elevado de bacterias probi\u00f3ticas y la fibra necesaria para que se mantengan activas en el intestino."
  },
  {
    product_id: "liquid_fiber",
    canonical_name: "Liquid Fiber",
    aliases: ["liquid fiber", "liquidfiber", "fibra liquida"],
    category: "Limpieza Digestiva",
    price: "28.750 CLP",
    short_description: "Fibra soluble en bebida ideal para apoyar la frecuencia de evacuaciones y el balance de la flora intestinal de forma natural.",
    details: "Liquid Fiber es una bebida de fibra soluble del Sistema Base de FuXion dise\u00f1ada para mejorar la frecuencia de evacuaciones intestinales y favorecer un balance adecuado de la flora intestinal. La mezcla de fibra prebi\u00f3tica y micronutrientes se disuelve en agua y puede tomarse diariamente como parte de la rutina de limpieza digestiva.  La marca indica que ayuda a mejorar la puntualidad de las evacuaciones, promover una salud digestiva m\u00e1s estable y apoyar la flora intestinal."
  },
  {
    product_id: "balance",
    canonical_name: "Balance",
    aliases: ["balance", "alpha balance", "alfa balance"],
    category: "Limpieza Digestiva",
    price: "36.000 CLP",
    short_description: "Bebida alcalinizante con extractos de vegetales verdes ideal para apoyar la limpieza de toxinas y el equilibrio del pH corporal.",
    details: "Balance es una bebida en polvo de FuXion que combina extractos de vegetales verdes como alfalfa, chlorella, espirulina, pasto de trigo y espinaca con frutas como manzana verde y lim\u00f3n, adem\u00e1s de minerales como magnesio y zinc. La marca la describe como una bebida alcalinizante que ayuda a promover la limpieza de elementos t\u00f3xicos del organismo y a equilibrar el pH corporal.  Se suele usar dentro de programas de detox y alimentaci\u00f3n m\u00e1s vegetal, acompa\u00f1ando cambios de dieta y reducci\u00f3n de alimentos ultraprocesados. Balance puede considerarse una forma pr\u00e1ctica de consumir componentes vegetales concentrados, sin reemplazar la ingesta de verduras frescas ni tratamientos m\u00e9dicos."
  },
  {
    product_id: "berry_balance",
    canonical_name: "Berry Balance",
    aliases: ["berry balance", "berrybalance"],
    category: "Inmunidad",
    price: "46.500 CLP",
    short_description: "Bebida con concentrados de berries, probi\u00f3ticos y antioxidantes ideal para apoyar el equilibrio del tracto urinario y la retenci\u00f3n de l\u00edquidos.",
    details: "Berry Balance es una bebida en polvo de FuXion que combina concentrados de cranberry, camu camu, infusi\u00f3n de c\u00e1scara de pi\u00f1a, cultivos probi\u00f3ticos y antioxidantes."
  },
  {
    product_id: "protein_active",
    canonical_name: "Protein Active",
    aliases: ["protein active"],
    category: "Nutricion",
    price: "39.500 CLP",
    short_description: "Prote\u00edna activa 100% vegetal con germinados y algas ideal para complementar la alimentaci\u00f3n diaria y apoyar regeneraci\u00f3n y defensa antioxidante.",
    details: "Protein Active es la primera prote\u00edna activa de origen 100% vegetal de FuXion, con mezcla de prote\u00ednas de quinua germinada, arroz integral germinado, arveja y algas, acompa\u00f1adas de enzimas, vitaminas y \u00e1cidos grasos como DHA y ARA. Est\u00e1 orientada a personas de cualquier edad que desean complementar su dieta con una prote\u00edna vegetal de alta biodisponibilidad y digestibilidad, libre de al\u00e9rgenos l\u00e1cteos.  FuXion la presenta como una herramienta para mejorar la regeneraci\u00f3n celular, optimizar la nutrici\u00f3n de tejidos y proteger el sistema inmunol\u00f3gico y antioxidante."
  },
  {
    product_id: "vitaenergia",
    canonical_name: "Vitaenergia",
    aliases: ["vitaenergia", "vita energia"],
    category: "Energia",
    price: "36.000 CLP",
    short_description: "Bebida funcional multivitam\u00ednica sabor ma\u00edz morado ideal para apoyar energ\u00eda diaria, reducir fatiga y aportar antioxidantes.",
    details: "Vitaenergia es una bebida funcional multivitam\u00ednica de FuXion con sabor a refresco de ma\u00edz morado, que contiene amino\u00e1cidos, vitaminas, minerales, fibra prebi\u00f3tica, camu camu y lute\u00edna."
  },
  {
    product_id: "vita_xtra_t_plus",
    canonical_name: "Vita Xtra T+",
    aliases: ["vita xtra", "vitaxtra", "vita extra", "vita xtra t+", "vita xtra t", "vitaxtra t+"],
    category: "Energia",
    price: "36.000 CLP",
    short_description: "Bebida energizante con t\u00e9 verde, guayusa, cordyceps y vitaminas ideal para apoyar energ\u00eda f\u00edsica y antioxidantes sin exceso de az\u00facar.",
    details: "Vita Xtra T+ es una bebida funcional energizante de FuXion que combina extractos de guayusa, t\u00e9 verde, goji berry, micelio de cordyceps, fibra, vitaminas y minerales, con sabor a refresco de ma\u00edz morado."
  },
  {
    product_id: "nocarb_t",
    canonical_name: "Nocarb-T",
    aliases: ["nocarb", "no carb", "nocarb-t", "nocarb t"],
    category: "Control De Peso",
    price: "36.000 CLP",
    short_description: "T\u00e9 herbal sabor manzana y canela con mezcla de fibras solubles y t\u00e9 verde ideal para apoyar el control de glucosa y la reducci\u00f3n de la asimilaci\u00f3n de carbohidratos.",
    details: "Nocarb-T es un t\u00e9 herbal en polvo de FuXion, parte de la l\u00ednea Control de Peso y Medidas, con sabor manzana y canela. Combina fibras solubles de yac\u00f3n, acacia, achicoria y pectina de manzana con verdolaga, canela, t\u00e9 verde y cromo en mol\u00e9cula org\u00e1nica."
  },
  {
    product_id: "thermo_t3",
    canonical_name: "Thermo T3",
    aliases: ["thermo t3", "thermot3", "termo t3", "thermo", "te termogenico"],
    category: "Control De Peso",
    price: "36.000 CLP",
    short_description: "T\u00e9 sabor lim\u00f3n con mezcla de tres t\u00e9s, L-carnitina y cetonas de frambuesa ideal para acompa\u00f1ar programas de control de peso y energ\u00eda f\u00edsica.",
    details: "Thermo T3 es un t\u00e9 funcional sabor lim\u00f3n que combina extractos de t\u00e9 negro, rojo y verde con L-carnitina, cetonas de frambuesa, amino\u00e1cidos, vitamina B6 y cromo en mol\u00e9cula org\u00e1nica. FuXion lo comercializa como parte de la l\u00ednea Control de Peso y Medidas para acompa\u00f1ar programas de reducci\u00f3n de grasa corporal y medidas, promoviendo un efecto termog\u00e9nico que, junto con actividad f\u00edsica y dieta adecuada, ayudar\u00eda a convertir reservas de grasa en energ\u00eda."
  },
  {
    product_id: "cafe_and_cafe_fit_cappuccino",
    canonical_name: "Caf\u00e9 & Caf\u00e9 Fit Cappuccino",
    aliases: ["cafe fit", "caf\u00e9 fit", "cafe & cafe fit cappuccino", "caf\u00e9 & caf\u00e9 fit cappuccino", "cafe cafe fit"],
    category: "Control De Peso",
    price: "51.499 CLP",
    short_description: "Caf\u00e9 cappuccino gourmet con caf\u00e9 tostado, crema baja en calor\u00edas y leche descremada ideal para ayudar a controlar apetito y medidas dentro de planes de peso.",
    details: "Caf\u00e9 & Caf\u00e9 Fit Cappuccino es un caf\u00e9 cappuccino gourmet en polvo que combina caf\u00e9 tostado liofilizado, crema para caf\u00e9 baja en calor\u00edas y leche descremada, enriquecido con extracto de caf\u00e9 verde rico en \u00e1cidos clorog\u00e9nicos. FuXion lo comercializa como parte de la l\u00ednea Control de Peso y Medidas para ayudar a controlar el apetito y la ansiedad entre comidas, reducir la absorci\u00f3n de carbohidratos a nivel intestinal y apoyar programas de reducci\u00f3n de medidas."
  },
  {
    product_id: "protein_active_fit",
    canonical_name: "Protein Active Fit",
    aliases: ["protein active fit"],
    category: "Control De Peso",
    price: "41.500 CLP",
    short_description: "Batido proteico 100% vegetal a base de BioProtein Active ideal para apoyar reducci\u00f3n de grasa corporal, control de apetito y formaci\u00f3n de m\u00fasculos tonificados.",
    details: "Protein Active Fit es un batido proteico 100% vegetal de FuXion, basado en la f\u00f3rmula BioProtein Active, enriquecido con aceite de coco y enzimas."
  },
  {
    product_id: "youth_elixir",
    canonical_name: "Youth Elixir",
    aliases: ["youth elixir", "elixir"],
    category: "Belleza Antiedad",
    price: "36.000 CLP",
    short_description: "Bebida funcional sabor uva de vino con amino\u00e1cidos, resveratrol y antioxidantes ideal para acompa\u00f1ar bienestar hormonal, vitalidad y apariencia de la piel.",
    details: "Youth Elixir es una bebida funcional en polvo de FuXion con sabor a uva de vino que forma parte de la l\u00ednea Anti-Edad y Belleza. Su f\u00f3rmula incluye un mix de extractos frutales, amino\u00e1cidos, fibras, antioxidantes, selenio, zinc y resveratrol."
  },
  {
    product_id: "beauty_in",
    canonical_name: "Beauty-In",
    aliases: ["beauty in", "beauty-in", "beautyin", "colageno fuxion"],
    category: "Belleza Antiedad",
    price: "44.750 CLP",
    short_description: "Bebida funcional sabor guayaba con p\u00e9ptidos de col\u00e1geno bioactivo, vitamina C y biotina ideal para acompa\u00f1ar el cuidado de piel, cabello y u\u00f1as.",
    details: "Beauty-In es una bebida funcional de FuXion sabor guayaba, toronja y camu camu que contiene p\u00e9ptidos de col\u00e1geno bioactivo tipo I y III, vitamina C, biotina, coenzima Q10 y antioxidantes."
  },
  {
    product_id: "passion",
    canonical_name: "Passion",
    aliases: ["passion", "pasion"],
    category: "Bienestar Mental",
    price: "36.000 CLP",
    short_description: "Bebida funcional con guaran\u00e1, jalea real, maca y ginseng ideal para apoyar energ\u00eda, vigor sexual y bienestar general.",
    details: "Passion es una bebida funcional de FuXion que combina guaran\u00e1, jalea real, maca y ginseng, orientada al apoyo del vigor sexual, la l\u00edbido, la fertilidad y el nivel de energ\u00eda. Guaran\u00e1 aporta cafe\u00edna que puede aumentar energ\u00eda y alerta."
  },
  {
    product_id: "golden_flx",
    canonical_name: "Golden FLX",
    aliases: ["golden flx", "golden flex", "golden"],
    category: "Salud Articular",
    price: "39.250 CLP",
    short_description: "Bebida funcional inspirada en \u2018golden milk\u2019 con c\u00farcuma, jengibre, cardamomo, leche de coco y pimienta ideal para apoyar flexibilidad y bienestar articular.",
    details: "Golden FLX es una bebida funcional de FuXion inspirada en la tradicional \u2018golden milk\u2019 ayurv\u00e9dica, creada para mejorar la flexibilidad y movilidad articular y aliviar molestias asociadas al desgaste o ejercicio."
  },
  {
    product_id: "probal",
    canonical_name: "Probal",
    aliases: ["probal"],
    category: "Sin Categor\u00eda",
    price: "44.750 CLP",
    short_description: "Suplemento de nombre Probal asociado en fuentes externas a f\u00f3rmulas de bienestar.",
    details: "Probal aparece mencionado en algunos listados de productos FuXion, pero no se ha encontrado ficha oficial en Chile."
  },
  {
    product_id: "vera_plus",
    canonical_name: "Vera+",
    aliases: ["vera+", "vera +", "vera mas", "veramas", "vera plus"],
    category: "Inmunidad",
    price: "46.500 CLP",
    short_description: "T\u00e9 sabor menta con aloe vera, beta glucanos Wellmune, extracto de oliva y vitamina C como apoyo nutricional al funcionamiento normal del sistema inmunitario.",
    details: "Vera+ es un t\u00e9 funcional sabor menta de FuXion perteneciente a la l\u00ednea Inmunol\u00f3gica, que combina beta glucanos de levadura, concentrado de hoja de oliva, aloe vera y vitamina C procedente de amalaki."
  },
  {
    product_id: "nutraday",
    canonical_name: "Nutraday",
    aliases: ["nutraday", "nutra day"],
    category: "Nutricion Diaria",
    price: "36.000 CLP",
    short_description: "Refresco sabor fresa con moringa, superfrutas, 12 vitaminas y 5 minerales org\u00e1nicos ideal para complementar la nutrici\u00f3n diaria.",
    details: "Nutraday es una bebida nutrac\u00e9utica sabor fresa natural de FuXion, dise\u00f1ada para complementar la nutrici\u00f3n diaria de ni\u00f1os, j\u00f3venes y adultos."
  },
  {
    product_id: "on",
    canonical_name: "ON",
    aliases: ["on"],
    category: "Vigor Mental",
    price: "28.750 CLP",
    short_description: "Bebida funcional sabor mix frutal con yerba mate, GABA, taurina y vitaminas B ideal para apoyar alerta mental, enfoque y sensaci\u00f3n de energ\u00eda cerebral.",
    details: "ON es una bebida funcional en polvo sabor mix frutal que FuXion comercializa como \u2018vigorizante mental\u2019 para mejorar procesos neuronales como concentraci\u00f3n, memoria y enfoque."
  },
  {
    product_id: "no_stress",
    canonical_name: "No Stress",
    aliases: ["no stress", "nostress"],
    category: "Estres Relajacion",
    price: "39.750 CLP",
    short_description: "Bebida nutritiva sabor durazno mandarina con L-teanina, tript\u00f3fano, glicina, ashwagandha y magnesio ideal para apoyar relajaci\u00f3n, enfoque y resistencia frente al estr\u00e9s cotidiano.",
    details: "No Stress es una bebida nutritiva sabor durazno mandarina ideal para ayudar a manejar el estr\u00e9s cotidiano, mantener el enfoque en momentos de tensi\u00f3n y favorecer la relajaci\u00f3n mental sin producir somnolencia."
  },
  {
    product_id: "protein_active_sport",
    canonical_name: "Protein Active Sport",
    aliases: ["protein active sport"],
    category: "Proteina Deportiva",
    price: "No disponible (Revisar cat\u00e1logo local)",
    short_description: "Prote\u00edna activa 100% vegetal sabor vainilla y canela ideal para apoyar recuperaci\u00f3n y desarrollo saludable de masa muscular tras ejercicio intenso.",
    details: "Protein Active Sport es una variante deportiva de la prote\u00edna activa vegetal de FuXion."
  },
  {
    product_id: "pre_sport",
    canonical_name: "Pre Sport",
    aliases: ["pre sport", "presport"],
    category: "Pre Entrenamiento",
    price: "39.250 CLP",
    short_description: "Bebida isot\u00f3nica sabor lim\u00f3n con creatina, beta-alanina, citrulina, yerba mate y electrolitos.",
    details: "Pre Sport es una bebida funcional de FuXion sabor lim\u00f3n, descrita como bebida isot\u00f3nica rehidratante, energ\u00e9tica y termog\u00e9nica."
  },
  {
    product_id: "post_sport",
    canonical_name: "Post Sport",
    aliases: ["post sport", "postsport"],
    category: "Post Entrenamiento",
    price: "39.250 CLP",
    short_description: "Bebida deportiva sabor granada a base de amino\u00e1cidos, agua de coco y antioxidantes.",
    details: "Post Sport es una bebida deportiva en polvo sabor granada ideal para recuperar el cuerpo del deportista."
  },
  {
    product_id: "probix",
    canonical_name: "Probix",
    aliases: ["probix"],
    category: "Microbiota",
    price: "Consultar precio",
    short_description: "Micropolvo para espolvorear sobre la comida; FuXion lo comercializa como apoyo al metabolismo y la grasa visceral.",
    details: "Probix es un micropolvo funcional de FuXion que se espolvorea directamente sobre comidas fr\u00edas o calientes."
  },
  {
    product_id: "base_madre_roja",
    canonical_name: "Base Madre Roja",
    aliases: ["base madre roja"],
    category: "Gastronomia Funcional",
    price: "No disponible (Revisar cat\u00e1logo local)",
    short_description: "Base culinaria concentrada roja elaborada con vegetales y aj\u00edes peruanos.",
    details: "Base Madre Roja Q\u2019ocina en Casa es una base culinaria concentrada creada en colaboraci\u00f3n entre Gast\u00f3n Acurio y FuXion."
  },
  {
    product_id: "base_madre_verde",
    canonical_name: "Base Madre Verde",
    aliases: ["base madre verde"],
    category: "Gastronomia Funcional",
    price: "No disponible (Revisar cat\u00e1logo local)",
    short_description: "Base culinaria verde inspirada en recetas caseras peruanas.",
    details: "Base Madre Verde Q\u2019ocina en Casa forma parte de la familia de bases culinarias."
  },
  {
    product_id: "base_madre_amarilla",
    canonical_name: "Base Madre Amarilla",
    aliases: ["base madre amarilla"],
    category: "Gastronomia Funcional",
    price: "No disponible (Revisar cat\u00e1logo local)",
    short_description: "Base culinaria amarilla con vegetales y aj\u00ed amarillo.",
    details: "Base Madre Amarilla Q\u2019ocina en Casa completa la familia de bases culinarias desarrolladas por Gast\u00f3n Acurio & FuXion."
  },

];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Level 1 Exact Product Match
 * Returns EXACTLY ONE product if deterministic.
 * Returns null if ambiguous or no match.
 */
export function matchProduct(message: string): ProductRecord | null {
  const normMessage = normalizeText(message);
  
  // Agregamos un borde de palabra manual para buscar en el string
  // Pero como los alias pueden tener multiples palabras, es mejor buscar el alias entero
  // de forma que no se confunda "on" dentro de "con".
  
  let matchedProducts = new Set<ProductRecord>();

  for (const product of fuxionKnowledgeBase) {
    for (const alias of product.aliases) {
      const normAlias = normalizeText(alias);
      
      // Buscar el alias como palabra entera
      const regex = new RegExp(`(^|\\s)${normAlias}(\\s|$)`, 'i');
      if (regex.test(normMessage)) {
        matchedProducts.add(product);
        break; // ya encontr este producto, no busco ms alias del mismo
      }
    }
  }

  if (matchedProducts.size === 1) {
    return Array.from(matchedProducts)[0];
  }
  
  // Ambiguo (match > 1) o no match (0)
  return null;
}
