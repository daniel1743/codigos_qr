import re

with open("src/features/experimental-premium-editor/contexts/EditorContext.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'export function EditorProvider({ children }: { children: React.ReactNode }) {',
    'import { INITIAL_PRODUCTS as FUXION_PRODUCTS, INITIAL_CATEGORIES as FUXION_CATEGORIES } from "../data/products-fuxion";\nexport function EditorProvider({ children, pageId }: { children: React.ReactNode, pageId?: string }) {'
)
content = content.replace(
    'const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);',
    'const [products, setProducts] = useState<Product[]>(pageId === "fuxion-catalog" ? FUXION_PRODUCTS : INITIAL_PRODUCTS);'
)
content = content.replace(
    'const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);',
    'const [categories, setCategories] = useState<Category[]>(pageId === "fuxion-catalog" ? FUXION_CATEGORIES : INITIAL_CATEGORIES);'
)

with open("src/features/experimental-premium-editor/contexts/EditorContext.tsx", "w", encoding="utf-8") as f:
    f.write(content)
