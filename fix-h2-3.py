import re

with open('premium_sidebar_mobile (5).html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: snap-back early return
content = content.replace("function setMenuState(open, animate = true) {", "function setMenuState(open, animate = true, forceSnap = false) {")
content = content.replace("if (isOpen === open && gestureState === 'IDLE') return;", "if (isOpen === open && gestureState === 'IDLE' && !forceSnap) return;")
content = content.replace("setMenuState(shouldOpen, true);", "setMenuState(shouldOpen, true, true);")

# Fix 2: touch-action scoping
# We remove `touch-action: pan-y;` from #app-container and #main-scroll-view.
# We add `overscroll-behavior-x: none;` to #app-container to prevent history navigation without breaking inner touch-action.

content = re.sub(r'touch-action:\s*pan-y;\s*', '', content)

overscroll_css = """
        body, html {
            overscroll-behavior-x: none;
        }
        #app-container {
            overscroll-behavior-x: none;
            touch-action: pan-y; /* Default for most of the app */
        }
        
        /* Specific override for horizontal scroll areas */
        [data-drawer-gesture="ignore"],
        [data-drawer-gesture="ignore"] * {
            touch-action: auto !important;
        }
"""

content = content.replace("#app-container {\n            position: relative;", overscroll_css + "\n        #app-container {\n            position: relative;")

with open('premium_sidebar_mobile (5).html', 'w', encoding='utf-8') as f:
    f.write(content)
