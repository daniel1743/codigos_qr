import re

navbar_path = 'src/components/navigation/DesktopNavbar.tsx'
with open(navbar_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update height
content = content.replace('h-[72px]', 'h-[76px]')

old_nav_items = '''const navItems: NavItem[] = [
  { id: \
home\, label: \Inicio\, to: \/\, icon: Home01Icon, active: (pathname) => pathname === \/\ },
  {
    id: \qrs\,
    label: \Mis
QRs\,
    to: \/editor\,
    icon: QrCodeIcon,
    active: (pathname) => pathname === \/editor\,
  },
  {
    id: \create\,
    label: \Crear\,
    to: \/template-builder\,
    icon: AddCircleIcon,
    active: (pathname) => pathname === \/template-builder\,
    emphasized: true,
  },
  {
    id: \templates\,
    label: \Plantillas\,
    to: \/template-bank\,
    icon: AiTemplateIcon,
    active: (pathname) => pathname === \/template-bank\,
  },
];'''
# Wait, format of code might differ in spaces. Let's use regex!

import re

