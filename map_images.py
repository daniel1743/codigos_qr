import re

file_path = "src/features/experimental-premium-editor/data/products-fuxion.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

image_map = {
    "fuxion_prunex1": "prunex-1.png",
    "fuxion_rexet": "rexet.png",
    "fuxion_flora_liv": "flora-liv.png",
    "fuxion_liquid_fiber": "liquid-fiber.png",
    "fuxion_balance": "alpha-balance.png", # Using alpha-balance.png as it seems to correspond
    "fuxion_berry_balance": "berry-balance.png",
    "fuxion_biopro_tect": "biopro+-tect.png",
    "fuxion_protein_active": "bioprotein-active.png", # Closest match
    "fuxion_vitaenergia": "vitaenergia.png",
    "fuxion_vita_xtra_t_plus": "vita-xtra-t+.png",
    "fuxion_nocarb_t": "nocarb-t.png",
    "fuxion_thermo_t3": "thermo-t3.png",
    "fuxion_biopro_fit": "biopro+-fit.png",
    "fuxion_protein_active_fit": "protein-active-fit.png",
    "fuxion_youth_elixir": "youth-elixir-hgh.png", # Match
    "fuxion_beauty_in": "beauty-in.png",
    "fuxion_passion": "passion.png",
    "fuxion_golden_flx": "golden-flx.png",
    "fuxion_probal": "probal.png",
    "fuxion_vera_plus": "vera+.png",
    "fuxion_nutraday": "nutraday.png",
    "fuxion_on": "on.png",
    "fuxion_no_stress": "no-stress.png",
    "fuxion_biopro_sport": "biopro+-sport.png",
    "fuxion_pre_sport": "pre-sport.png",
    "fuxion_post_sport": "post-sport.png",
    "fuxion_gano_cappuccino": "gano+-cappuccino.png"
}

# Apply the replacements
for product_id, filename in image_map.items():
    # We need to find the block for the product
    pattern = r'(id:\s*"' + product_id + r'",\s*)image:\s*null,\s*imageState:\s*"empty"'
    replacement = r'\1image: "/productos fuxion/productos/' + filename + '",\n    imageState: "ready"'
    content = re.sub(pattern, replacement, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Images mapped successfully.")
