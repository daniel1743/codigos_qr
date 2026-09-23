import json
import re

file_path = "src/features/experimental-premium-editor/data/products-fuxion.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

canonical_categories = [
    "Limpia tu cuerpo",
    "Regenera tus células",
    "Revitaliza tu energía",
    "Inmunológica",
    "Control de Peso",
    "Anti-Edad",
    "Vigor Mental",
    "Sport"
]

cat_colors = [
    {"bg": "#F5F2ED", "text": "#17140F"},
    {"bg": "#E9E3D9", "text": "#17140F"},
    {"bg": "#EAECE9", "text": "#17140F"},
    {"bg": "#DFE6DF", "text": "#17140F"},
    {"bg": "#F7EEE4", "text": "#17140F"},
]

cat_str_list = []
for i, cat in enumerate(canonical_categories):
    color = cat_colors[i % len(cat_colors)]
    cat_str_list.append('  {')
    cat_str_list.append(f'    id: "c-{i}",')
    cat_str_list.append(f'    label: "{cat}",') # Use simple quotes instead of json.dumps to avoid unicode escapes
    cat_str_list.append(f'    style: {{ backgroundColor: "{color["bg"]}", textColor: "{color["text"]}", font: "Inter, system-ui, sans-serif", size: 11.5, radius: 999 }},')
    cat_str_list.append('  },')
categories_replacement = "export const INITIAL_CATEGORIES: Category[] = [\n" + "\n".join(cat_str_list) + "\n];"

content = re.sub(r'export const INITIAL_CATEGORIES: Category\[\] = \[[\s\S]*?\];', lambda m: categories_replacement, content)

product_category_map = {
    "REXET": "Limpia tu cuerpo",
    "PRUNEX1": "Limpia tu cuerpo",
    "FLORA LIV": "Limpia tu cuerpo",
    "LIQUID FIBER": "Limpia tu cuerpo",
    "BERRY BALANCE": "Limpia tu cuerpo",
    "BALANCE": "Limpia tu cuerpo",
    "BIOPRO+ TECT": "Regenera tus células",
    "PROTEIN ACTIVE": "Regenera tus células",
    "VITAENERGIA": "Revitaliza tu energía",
    "VITA XTRA T+": "Revitaliza tu energía",
    "NUTRADAY": "Revitaliza tu energía",
    "VERA+": "Inmunológica",
    "GANO+ CAPPUCCINO": "Inmunológica",
    "THERMO T3": "Control de Peso",
    "NOCARB-T": "Control de Peso",
    "CAFÉ & CAFÉ FIT CAPPUCCINO": "Control de Peso",
    "BIOPRO+ FIT": "Control de Peso",
    "PROTEIN ACTIVE FIT": "Control de Peso",
    "YOUTH ELIXIR": "Anti-Edad",
    "BEAUTY-IN": "Anti-Edad",
    "PASSION": "Anti-Edad",
    "GOLDEN FLX": "Anti-Edad",
    "PROBAL": "Anti-Edad",
    "ON": "Vigor Mental",
    "NO STRESS": "Vigor Mental",
    "BIOPRO+ SPORT": "Sport",
    "PRE SPORT": "Sport",
    "POST SPORT": "Sport"
}

def get_cat_id(cat_name):
    if not cat_name: return ""
    try:
        return f'c-{canonical_categories.index(cat_name)}'
    except ValueError:
        return ""

def replacer(match):
    prod_block = match.group(0)
    title_match = re.search(r'title:\s*"([^"]+)"', prod_block)
    if title_match:
        title = title_match.group(1).upper()
        # manual decode since json.dumps might have used \u00e9
        title = title.replace('\\U00E9', 'É').replace('É', 'É')
        title = title.replace('CAF\\U00C9 & CAF\\U00C9 FIT CAPPUCCINO', 'CAFÉ & CAFÉ FIT CAPPUCCINO')
        
        mapped_cat = None
        for key in product_category_map:
            key_norm = key.replace('É', 'E').replace('Ó', 'O')
            title_norm = title.replace('É', 'E').replace('Ó', 'O')
            if key_norm in title_norm or title_norm in key_norm:
                mapped_cat = product_category_map[key]
                break
        
        cat_id = get_cat_id(mapped_cat)
        cat_str = f'["{cat_id}"]' if cat_id else '[]'
        prod_block = re.sub(r'categoryIds:\s*\[.*?\]', f'categoryIds: {cat_str}', prod_block)
    return prod_block

content = re.sub(r'\{\s*id:\s*"[^"]*"[\s\S]*?overrides: \{ \.\.\.defaultOverrides \},\s*\}', replacer, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Categories updated successfully!")
