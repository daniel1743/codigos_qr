import re

# 1. Update DesktopNavbar.tsx
navbar_path = "src/components/navigation/DesktopNavbar.tsx"
with open(navbar_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update height
content = content.replace("h-[72px]", "h-[76px]")

# Update navItems
old_nav_items = """const navItems: NavItem[] = [
    { id: "home", label: "Inicio", to: "/", icon: Home01Icon, active: (pathname) => pathname === "/" },
    {
      id: "qrs",
      label: "Mis QRs",
      to: "/editor",
      icon: QrCodeIcon,
      active: (pathname) => pathname === "/editor",
    },
    {
      id: "create",
      label: "Crear",
      to: "/template-builder",
      icon: AddCircleIcon,
      active: (pathname) => pathname === "/template-builder",
      emphasized: true,
    },
    {
      id: "templates",
      label: "Plantillas",
      to: "/template-bank",
      icon: AiTemplateIcon,
      active: (pathname) => pathname === "/template-bank",
    },
  ];"""

new_nav_items = """const navItems = [
    { id: "home", label: "Inicio", to: "/", active: (pathname: string) => pathname === "/" },
    {
      id: "qrs",
      label: "Mis QR",
      to: "/editor",
      active: (pathname: string) => pathname === "/editor",
    },
    {
      id: "templates",
      label: "Biblioteca",
      to: "/template-bank",
      active: (pathname: string) => pathname === "/template-bank",
    },
    {
      id: "create",
      label: "Editor",
      to: "/template-builder",
      active: (pathname: string) => pathname === "/template-builder",
      emphasized: true,
    },
    {
      id: "security",
      label: "Documentos Seguros",
      to: "/encrypted-documents",
      active: (pathname: string) => pathname === "/encrypted-documents",
    },
  ];"""

content = content.replace(old_nav_items, new_nav_items)

# Remove the icon rendering from navItems map
old_render = """                  >
                    <HugeiconsIcon icon={item.icon} size={18} strokeWidth={2} />
                    <span>{item.label}</span>
                  </a>"""
new_render = """                  >
                    <span>{item.label}</span>
                  </a>"""
content = content.replace(old_render, new_render)

# Add admin logic
if "isAdmin" not in content:
    content = content.replace("import { useEffect, type ReactNode } from \\"react\\";", "import { useEffect, useState, type ReactNode } from \\"react\\";")
    content = content.replace("import { getBrowserSupabaseClient } from \\"../lib/supabase/client\\";", "import { getBrowserSupabaseClient } from \\"../lib/supabase/client\\";\\nimport { isUserAdmin, isAdminEmail } from \\"../lib/admin-check\\";")
    content = content.replace("import Shield01Icon from \\"@hugeicons/core-free-icons/Shield01Icon\\";", "")
    content = content.replace("import Search01Icon from \\"@hugeicons/core-free-icons/Search01Icon\\";", "import Search01Icon from \\"@hugeicons/core-free-icons/Search01Icon\\";\\nimport Shield01Icon from \\"@hugeicons/core-free-icons/Shield01Icon\\";")
    
    admin_state = """  const [isAdmin, setIsAdmin] = useState(false);"""
    content = content.replace("const [profileOpen, setProfileOpen] = useState(false);", "const [profileOpen, setProfileOpen] = useState(false);\\n" + admin_state)
    
    admin_check = """      const loadUser = async () => {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(currentSession);
  
        if (!currentSession) {
          setProfile(null);
          setEntitlements(null);
          setIsAdmin(false);
          return;
        }
  
        const email = currentSession.user.email || "";
        const [loadedProfile, loadedEntitlements, adminStatus] = await Promise.all([
          profileService.getProfileByUserId(supabase, currentSession.user.id).catch(() => null),
          getUserEntitlements(currentSession.user.id).catch(() => null),
          isUserAdmin(supabase, currentSession.user.id).catch(() => false),
        ]);
        if (cancelled) return;
        setProfile(loadedProfile);
        setEntitlements(loadedEntitlements);
        setIsAdmin(adminStatus || isAdminEmail(email));
      };"""
    
    # We need to replace the old loadUser
    import re
    old_loaduser_pattern = r"      const loadUser = async \(\) => \{.*?        \]\);\n        if \(cancelled\) return;\n        setProfile\(loadedProfile\);\n        setEntitlements\(loadedEntitlements\);\n      \};"
    content = re.sub(old_loaduser_pattern, admin_check, content, flags=re.DOTALL)
    
    # Add Admin link in dropdown
    admin_link = """                <div className="p-1.5">
                  {isAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => goTo("/admin")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 mb-1"
                    >
                      <HugeiconsIcon icon={Shield01Icon} size={18} strokeWidth={1.8} />
                      Administración
                    </button>
                  )}"""
    content = content.replace("<div className=\\"p-1.5\\">", admin_link, 1)

with open(navbar_path, "w", encoding="utf-8") as f:
    f.write(content)
print("DesktopNavbar updated")


