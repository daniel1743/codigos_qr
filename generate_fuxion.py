import json
import re

with open('raw_message.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the first JSON block (CRIPQER_FUXION_CATALOG_SEED_V1)
match1 = re.search(r'(\{[\s\S]*?"project": "CRIPQER_FUXION_CATALOG_SEED_V1"[\s\S]*?\]\n\})', content)
match2 = re.search(r'(\{[\s\S]*?"project": "FUXION_CHILE_MASTER_RAW_BATCHES_1_7"[\s\S]*?\]\n\})', content)

if not match2:
    print("Could not find match2. Let's try to parse the entire text by splitting on '}{'")
    idx = content.find('}{')
    if idx != -1:
        json_str1 = content[content.find('{'):idx+1]
        json_str2 = content[idx+1:content.rfind('}')+1]
    else:
        # Maybe they are separated by newline?
        parts = content.split('\n{')
        json_str1 = parts[0][parts[0].find('{'):]
        json_str2 = '{' + parts[1][:parts[1].rfind('}')+1]
else:
    json_str1 = match1.group(1)
    json_str2 = match2.group(1)

seed_data = json.loads(json_str1)
master_data = json.loads(json_str2)

categories = seed_data.get("categories", [])
products = seed_data.get("products", [])

# Let's write products-fuxion.ts
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
    try:
        idx = categories.index(cat_name)
        return f"c-{idx}"
    except:
        return ""

for p in products:
    card = p.get('card', {})
    detail = p.get('detail', {})
    cat_id = get_category_id(card.get('category'))
    cat_arr = f'["{cat_id}"]' if cat_id else '[]'
    
    price_val = card.get('price_clp')
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
    out.append(f'    title: {json.dumps(card.get("name", ""))},')
    out.append('    titleStyle: titleStyle(),')
    out.append(f'    description: {json.dumps(card.get("short_description", ""))},')
    out.append('    descriptionStyle: text(),')
    out.append(f'    longDescription: {json.dumps(detail.get("long_description", ""))},')
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

print("products-fuxion.ts generated successfully!")
