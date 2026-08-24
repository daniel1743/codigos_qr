import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# 1. BUG-DUPLICATE-PROFILE-SIZE-IDS
occurrences = [m.start() for m in re.finditer(r'id="range-profile-size"', content)]
if len(occurrences) > 1:
    block_start = content.rfind('<div>', 0, occurrences[1])
    block_end = content.find('</div>', occurrences[1]) + 6
    content = content[:block_start] + content[block_end:]

# 2. UX-NO-ACTIVE-STATE for setAvatarShape
content = content.replace(
    "function setAvatarShape(radius) {",
    "function setAvatarShape(radius, btnElement) {\n            document.querySelectorAll('.avatar-shape-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));\n            if(btnElement) btnElement.classList.add('ring-2', 'ring-pink-500');"
)
content = content.replace(
    "onclick=\"setAvatarShape('50%')\"",
    "onclick=\"setAvatarShape('50%', this)\" class=\"avatar-shape-btn ring-2 ring-pink-500 "
)
content = content.replace(
    "onclick=\"setAvatarShape('24px')\"",
    "onclick=\"setAvatarShape('24px', this)\" class=\"avatar-shape-btn "
)
content = content.replace(
    "onclick=\"setAvatarShape('0px')\"",
    "onclick=\"setAvatarShape('0px', this)\" class=\"avatar-shape-btn "
)

# 3. UX-NO-ACTIVE-STATE for setBtnRadius
content = content.replace(
    "function setBtnRadius(radius) {",
    "function setBtnRadius(radius, btnElement) {\n            document.querySelectorAll('.btn-radius-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));\n            if(btnElement) btnElement.classList.add('ring-2', 'ring-pink-500');"
)
content = content.replace(
    "onclick=\"setBtnRadius('0px')\"",
    "onclick=\"setBtnRadius('0px', this)\" class=\"btn-radius-btn "
)
content = content.replace(
    "onclick=\"setBtnRadius('16px')\"",
    "onclick=\"setBtnRadius('16px', this)\" class=\"btn-radius-btn "
)
content = content.replace(
    "onclick=\"setBtnRadius('9999px')\"",
    "onclick=\"setBtnRadius('9999px', this)\" class=\"btn-radius-btn ring-2 ring-pink-500 "
)

# 4. RESPONSIVE-DESKTOP-CONFUSION
# Add desktop-view class logic
content = content.replace(
    "container.classList.add('w-[850px]', 'h-[780px]', 'rounded-3xl');",
    "container.classList.add('w-[850px]', 'h-[780px]', 'rounded-3xl', 'desktop-view');"
)
content = content.replace(
    "container.classList.remove('w-[850px]', 'h-[780px]', 'rounded-3xl');",
    "container.classList.remove('w-[850px]', 'h-[780px]', 'rounded-3xl', 'desktop-view');"
)

# Replace `#phone-container {` inside media queries with `:not(.desktop-view)`
content = content.replace(
    "            #phone-container {\n                width: min(390px, calc(100vw - 28rem)) !important;\n                height: min(780px, calc(100dvh - 7.5rem)) !important;",
    "            #phone-container:not(.desktop-view) {\n                width: min(390px, calc(100vw - 28rem)) !important;\n                height: min(780px, calc(100dvh - 7.5rem)) !important;\n            }\n            #phone-container.desktop-view {\n                max-width: 850px;\n                width: 100% !important;\n                height: auto !important;\n                aspect-ratio: 85 / 78;"
)
content = content.replace(
    "            #phone-container {\n                width: min(390px, calc(100vw - 2rem)) !important;\n                height: min(780px, calc(48dvh - 2rem)) !important;",
    "            #phone-container:not(.desktop-view) {\n                width: min(390px, calc(100vw - 2rem)) !important;\n                height: min(780px, calc(48dvh - 2rem)) !important;\n            }\n            #phone-container.desktop-view {\n                width: 100% !important;\n                height: auto !important;\n                aspect-ratio: 85 / 78;\n                margin-block: 0 !important;\n                border-radius: 20px !important;"
)
content = content.replace(
    "            #phone-container {\n                height: min(780px, calc(45dvh - 1.25rem)) !important;",
    "            #phone-container:not(.desktop-view) {\n                height: min(780px, calc(45dvh - 1.25rem)) !important;"
)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)

print("Modifications applied successfully.")
