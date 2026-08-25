import re

file = 'src/routes/editor.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: bottom sheet open on QR load
content = content.replace('setBottomSheetOpen(false);', 'setBottomSheetOpen(true);', 1)

# Fix 2: padding for overlapping navbars
content = content.replace(
    '<div className="relative flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-background font-sans">',
    '<div className="relative flex h-[100dvh] w-full flex-col overflow-hidden overscroll-none bg-background font-sans pb-20 md:pb-0">'
)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)
print("Safe patch applied to editor.tsx")
