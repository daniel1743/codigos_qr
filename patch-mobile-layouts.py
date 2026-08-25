import os
import re

# 1. Patch template-builder.html
file1 = 'public/template-builder.html'
with open(file1, 'r', encoding='utf-8') as f:
    content1 = f.read()

# Make the wrapper flex-col on mobile, flex-row on desktop
content1 = content1.replace('<div class="flex-1 flex overflow-hidden">', '<div class="flex-1 flex flex-col md:flex-row overflow-hidden">')

# Make the aside order-2 on mobile (bottom), order-1 on desktop, and give it full width on mobile
content1 = content1.replace(
    '<aside class="w-96 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 z-20 overflow-hidden">',
    '<aside class="w-full md:w-96 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 z-20 overflow-hidden order-2 md:order-1">'
)

# Make the main preview order-1 on mobile (top), order-2 on desktop
content1 = content1.replace(
    '<main class="flex-1 bg-slate-900/50 flex flex-col items-center justify-center p-6 relative overflow-y-auto">',
    '<main class="flex-1 bg-slate-900/50 flex flex-col items-center justify-center p-6 relative overflow-y-auto order-1 md:order-2">'
)

# Fix the phone container so it scales properly on very small screens instead of overflowing
content1 = content1.replace(
    '<div id="phone-container" class="phone-frame w-[390px] h-[780px] bg-slate-950 rounded-[48px] overflow-hidden relative flex flex-col my-auto border-4 border-slate-800">',
    '<div id="phone-container" class="phone-frame w-[390px] h-[780px] max-w-full max-h-[100%] shrink-0 bg-slate-950 rounded-[48px] overflow-hidden relative flex flex-col my-auto border-4 border-slate-800" style="transform-origin: top center; transform: scale(min(1, calc((100vw - 3rem) / 390)));">'
)

with open(file1, 'w', encoding='utf-8') as f:
    f.write(content1)

# 2. Patch encrypted-documents.tsx
file2 = 'src/routes/encrypted-documents.tsx'
with open(file2, 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = content2.replace(
    '<main className="mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-4 sm:px-4 sm:py-8">',
    '<main className="mx-auto w-full max-w-7xl overflow-x-hidden px-3 py-4 pb-28 sm:px-4 sm:py-8 sm:pb-8">'
)

with open(file2, 'w', encoding='utf-8') as f:
    f.write(content2)

# 3. Patch TemplateBankGallery.tsx
file3 = 'src/components/template-bank/TemplateBankGallery.tsx'
with open(file3, 'r', encoding='utf-8') as f:
    content3 = f.read()

content3 = content3.replace(
    '<div className="min-h-screen bg-[#121212] text-white">',
    '<div className="min-h-screen bg-[#121212] text-white pb-28 lg:pb-0">'
)

with open(file3, 'w', encoding='utf-8') as f:
    f.write(content3)

# 4. Patch MyProfilePage.tsx
file4 = 'src/components/profile/MyProfilePage.tsx'
with open(file4, 'r', encoding='utf-8') as f:
    content4 = f.read()

content4 = content4.replace(
    '<div className="mx-auto max-w-6xl space-y-6">',
    '<div className="mx-auto max-w-6xl space-y-6 pb-28 lg:pb-0">'
)

with open(file4, 'w', encoding='utf-8') as f:
    f.write(content4)

print("Patch applied to all 4 files!")
