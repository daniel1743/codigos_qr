import re

file = 'src/routes/editor.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<div className="relative flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-background font-sans">',
    '<div className="relative flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-background font-sans pb-20 md:pb-0">'
)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch applied to editor.tsx!")
