import json
import re

file_path = "src/features/experimental-premium-editor/data/products-fuxion.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We can use regex to remove each product block from the INITIAL_PRODUCTS array.
# Each block starts with `{` and ends with `  },`
# The safest way is to find the IDs and remove their corresponding objects.

ids_to_remove = [
    "fuxion_base_madre_roja",
    "fuxion_base_madre_verde",
    "fuxion_base_madre_amarilla",
    "fuxion_protein_active_sport"
]

for pid in ids_to_remove:
    # Match from `{` containing the `id: "pid"` to the next `  },`
    pattern = r'\{\s*id:\s*"' + pid + r'"[\s\S]*?\},?'
    content = re.sub(pattern, '', content)

# Clean up any blank lines left behind (optional, just to keep it neat)
content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Products removed successfully.")
