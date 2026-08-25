import re

file = 'src/routes/editor.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure useRouterState is imported
if 'useRouterState' not in content:
    content = content.replace('import { Link, createFileRoute } from "@tanstack/react-router";', 'import { Link, createFileRoute, useRouterState } from "@tanstack/react-router";')

# Replace the broken useEffect with the reactive one
old_effect = """  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") !== "qr") return;

    setActiveTab("qr");
    setSelectedEditorTarget({ type: "qr" });
    setPanelOpen(true);
    setBottomSheetOpen(true);
  }, []);"""

new_effect = """  const search = useRouterState({ select: (state) => state.location.search as any });
  
  useEffect(() => {
    if (search && search.tab === "qr") {
      setActiveTab("qr");
      setSelectedEditorTarget({ type: "qr" });
      setPanelOpen(true);
      setBottomSheetOpen(true);
    }
  }, [search.tab]);"""

content = content.replace(old_effect, new_effect)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Reactive search params patch applied!")
