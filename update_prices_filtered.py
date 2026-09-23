import json

# Price overrides
prices = {
  "REXET": 36000,
  "PRUNEX1": 23300,
  "FLORA LIV": 43000,
  "LIQUID FIBER": 28750,
  "BERRY BALANCE": 46500,
  "BALANCE": 36000,
  "BIOPRO+ TECT": 34000,
  "PROTEIN ACTIVE": 39500,
  "VITAENERGIA": 36000,
  "VITA XTRA T+": 36000,
  "NUTRADAY": 36000,
  "VERA+": 46500,
  "GANO+ CAPPUCCINO": 23250,
  "THERMO T3": 36000,
  "NOCARB-T": 36000,
  "CAF & CAF FIT CAPPUCCINO": 51500,
  "BIOPRO+ FIT": 30250,
  "PROTEIN ACTIVE FIT": 41500,
  "YOUTH ELIXIR": 36000,
  "BEAUTY-IN": 44750,
  "PASSION": 36000,
  "GOLDEN FLX": 39250,
  "PROBAL": 44750,
  "ON": 28750,
  "NO STRESS": 39750,
  "BIOPRO+ SPORT": 37750,
  "PRE SPORT": 39250,
  "POST SPORT": 39250
}

variants_text = {
    "PROTEIN ACTIVE": "\\nPrecios por variante:\\n- Vainilla y canela: 39.500 CLP\\n- Chocolate con avellanas: 40.000 CLP",
    "PROTEIN ACTIVE FIT": "\\nPrecios por variante:\\n- Vainilla y canela: 41.500 CLP\\n- Chocolate con avellanas: 41.750 CLP"
}

not_priced = [
  "PROBIX",
]

to_remove = [
  "fuxion_base_madre_roja",
  "fuxion_base_madre_verde",
  "fuxion_base_madre_amarilla",
  "fuxion_protein_active_sport",
  "fuxion_cafe_cafe_fit_cappuccino" # Wait, user didn't ask to remove cappuccino... Ah, wait!
]

with open("fuxion_seed.json", "r", encoding="utf-8") as f:
    master_data = json.load(f)

products = master_data.get("products", [])

# Filter products
products = [p for p in products if p.get("product_id") not in [
  "fuxion_base_madre_roja",
  "fuxion_base_madre_verde",
  "fuxion_base_madre_amarilla",
  "fuxion_protein_active_sport"
]]

# Add GANO+ CAPPUCCINO if it doesn't exist
has_gano = any(p.get("name", "").upper() == "GANO+ CAPPUCCINO" for p in products)
if not has_gano:
    products.append({
        "product_id": "fuxion_gano_cappuccino",
        "name": "Gano+ Cappuccino",
        "category": "Inmunolgica y Nutricin",
        "short_description": "Caf cappuccino con Ganoderma lucidum.",
        "long_description": "Bebida a base de extracto de Ganoderma lucidum, con sabor a cappuccino.",
        "price": { "current_clp": 23250 }
    })

categories = [
    "Anti-Edad y Belleza",
    "Articulaciones y Movilidad",
    "Control de Peso y Medidas",
    "Energa y Vitalidad",
    "Gastronoma",
    "Inmunolgica y Nutricin",
    "Microbiota",
    "Por verificar",
    "Sistema Base",
    "Sport",
    "Vigor Mental y Bienestar"
]

cat_map = {
    "limpieza_digestiva": "Sistema Base",
    "inmunidad": "Inmunolgica y Nutricin",
    "nutricion": "Inmunolgica y Nutricin",
    "energia": "Energa y Vitalidad",
    "control_de_peso": "Control de Peso y Medidas",
    "belleza_antiedad": "Anti-Edad y Belleza",
    "bienestar_mental": "Vigor Mental y Bienestar",
    "salud_articular": "Articulaciones y Movilidad",
    "proteina_deportiva": "Sport",
    "pre_entrenamiento": "Sport",
    "post_entrenamiento": "Sport",
    "microbiota": "Microbiota",
    "gastronomia_funcional": "Gastronoma",
    "estres_relajacion": "Vigor Mental y Bienestar",
    "Inmunolgica y Nutricin": "Inmunolgica y Nutricin"
}

out = []
out.append('import { Product, TextStyle, Category } from "../types/editor";')
out.append('')
out.append('const text = (over: Partial<TextStyle> = {}): TextStyle => ({')
out.append('  font: "Inter, system-ui, sans-serif", size: 15, color: "#4A443C",')
out.append('  weight: 400, italic: false, underline: false, align: "left", ...over,')
out.append('});')
out.append('const titleStyle = (over: Partial<TextStyle> = {}): TextStyle => text({ font: "Marcellus, Georgia, serif", size: 24, color: "#17140F", weight: 400, ...over });')
out.append('const priceStyle = (over: Partial<TextStyle> = {}): TextStyle => text({ font: "Inter, system-ui, sans-serif", size: 20, color: "#17140F", weight: 600, ...over });')
out.append('const chrome = { background: "#FFFFFF", border: "#E6E1DA", radius: 18 };')
out.append('const cta = (over: Partial<Product["cta"]> = {}): Product["cta"] => ({')
out.append('  text: "Ver producto", link: "/producto", color: "#1E4D44", variant: "solid", align: "left", ...over,')
out.append('});')
out.append('const defaultOverrides = { title: false, description: false, price: false, cta: false, card: false };')
out.append('')

out.append('export const INITIAL_CATEGORIES: Category[] = [')
colors = [
  {"bg": "#F5F2ED", "text": "#17140F"},
  {"bg": "#E9E3D9", "text": "#17140F"},
  {"bg": "#EAECE9", "text": "#17140F"},
  {"bg": "#DFE6DF", "text": "#17140F"},
  {"bg": "#F7EEE4", "text": "#17140F"},
]
for i, cat in enumerate(categories):
    color = colors[i % len(colors)]
    out.append('  {')
    out.append(f'    id: "c-{i}",')
    out.append(f'    label: {json.dumps(cat)},')
    out.append(f'    style: {{ backgroundColor: "{color["bg"]}", textColor: "{color["text"]}", font: "Inter, system-ui, sans-serif", size: 11.5, radius: 999 }},')
    out.append('  },')
out.append('];')
out.append('')

out.append('export const INITIAL_PRODUCTS: Product[] = [')

def get_category_id(cat_name):
    real_label = cat_map.get(cat_name)
    if not real_label:
        real_label = "Por verificar"
    try:
        idx = categories.index(real_label)
        return f"c-{idx}"
    except:
        return ""

for p in products:
    name_upper = p.get("name", "").upper()
    cat_id = get_category_id(p.get('category'))
    cat_arr = f'["{cat_id}"]' if cat_id else '[]'
    
    price_val = None
    if name_upper in prices:
        price_val = prices[name_upper]
    elif name_upper in not_priced:
        price_val = None
    else:
        # Default fallback
        price_val = p.get('price', {}).get('current_clp')
        
    price_str = f'"{price_val} CLP"' if price_val else '"Consultar precio"'
    
    long_desc = p.get("long_description", "")
    if name_upper in variants_text:
        long_desc += variants_text[name_upper]
    
    out.append('  {')
    out.append(f'    id: {json.dumps(p.get("product_id"))},')
    out.append('    image: null,')
    out.append('    imageState: "empty",')
    out.append('    imageOrigin: "own",')
    out.append('    imageFocus: "center",')
    out.append('    imageCrop: "4/3",')
    out.append(f'    categoryIds: {cat_arr},')
    out.append('    tags: [],')
    out.append(f'    title: {json.dumps(p.get("name", ""))},')
    out.append('    titleStyle: titleStyle(),')
    out.append(f'    description: {json.dumps(p.get("short_description", ""))},')
    out.append('    descriptionStyle: text(),')
    out.append(f'    longDescription: {json.dumps(long_desc)},')
    out.append(f'    price: {price_str},')
    out.append('    priceStyle: priceStyle(),')
    out.append('    cta: cta(),')
    out.append('    card: { ...chrome },')
    out.append('    footerNote: "",')
    out.append('    overrides: { ...defaultOverrides },')
    out.append('  },')

out.append('];')

with open("src/features/experimental-premium-editor/data/products-fuxion.ts", "w", encoding="utf-8") as f:
    f.write('\n'.join(out))

print("products-fuxion.ts updated successfully with removed products and relative URL!")

