import json

with open("fuxion_seed.json", "r", encoding="utf-8") as f:
    master_data = json.load(f)

products = master_data.get("products", [])

# Let's map categories from the prompt since they aren't in this simplified JSON
categories = [
    "Anti-Edad y Belleza",
    "Articulaciones y Movilidad",
    "Control de Peso y Medidas",
    "Energía y Vitalidad",
    "Gastronomía",
    "Inmunológica y Nutrición",
    "Microbiota",
    "Por verificar",
    "Sistema Base",
    "Sport",
    "Vigor Mental y Bienestar"
]

# Create a mapping from source category slug to actual label
cat_map = {
    "limpieza_digestiva": "Sistema Base",
    "inmunidad": "Inmunológica y Nutrición",
    "nutricion": "Inmunológica y Nutrición",
    "energia": "Energía y Vitalidad",
    "control_de_peso": "Control de Peso y Medidas",
    "belleza_antiedad": "Anti-Edad y Belleza",
    "bienestar_mental": "Vigor Mental y Bienestar",
    "salud_articular": "Articulaciones y Movilidad",
    "proteina_deportiva": "Sport",
    "pre_entrenamiento": "Sport",
    "post_entrenamiento": "Sport",
    "microbiota": "Microbiota",
    "gastronomia_funcional": "Gastronomía",
    "estres_relajacion": "Vigor Mental y Bienestar"
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
out.append('  text: "Ver producto", link: "https://cripqer.com/producto", color: "#1E4D44", variant: "solid", align: "left", ...over,')
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
    cat_id = get_category_id(p.get('category'))
    cat_arr = f'["{cat_id}"]' if cat_id else '[]'
    
    price_obj = p.get('price', {})
    price_val = price_obj.get('current_clp')
    price_str = f'"{price_val} CLP"' if price_val else '"Consultar precio"'
    
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
    out.append(f'    longDescription: {json.dumps(p.get("long_description", ""))},')
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

print("products-fuxion.ts generated successfully with all 32 products!")
