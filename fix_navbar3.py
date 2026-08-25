import re

with open("src/components/navigation/DesktopNavbar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update height
content = content.replace("h-[72px]", "h-[76px]")

# Replace navItems array
pattern_navItems = r"const navItems: NavItem\[\] = \[.*?\];"
new_navItems = """const navItems = [
  { id: "home", label: "Inicio", to: "/", active: (pathname: string) => pathname === "/" },
  { id: "qrs", label: "Mis QR", to: "/editor", active: (pathname: string) => pathname === "/editor" },
  { id: "templates", label: "Biblioteca", to: "/template-bank", active: (pathname: string) => pathname === "/template-bank" },
  { id: "create", label: "Editor", to: "/template-builder", active: (pathname: string) => pathname === "/template-builder", emphasized: true },
  { id: "security", label: "Documentos Seguros", to: "/encrypted-documents", active: (pathname: string) => pathname === "/encrypted-documents" },
];"""
content = re.sub(pattern_navItems, new_navItems, content, flags=re.DOTALL)

# Remove the icon rendering
pattern_render = r"<HugeiconsIcon icon=\{item\.icon\} size=\{18\} strokeWidth=\{2\} />"
content = re.sub(pattern_render, "", content)

# Adjust padding/centering for links since icon is gone
pattern_link_class = r"\"flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500\""
new_link_class = "\"flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500\""
content = content.replace(pattern_link_class, new_link_class)

# Imports for admin
if "isUserAdmin" not in content:
    content = content.replace(
        'import { useEffect, type ReactNode } from "react";',
        'import { useEffect, useState, type ReactNode } from "react";'
    )
    content = content.replace(
        'import { getBrowserSupabaseClient } from "../lib/supabase/client";',
        'import { getBrowserSupabaseClient } from "../lib/supabase/client";\nimport { isUserAdmin, isAdminEmail } from "../lib/admin-check";'
    )
    content = content.replace(
        'import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";',
        'import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";\nimport Shield01Icon from "@hugeicons/core-free-icons/Shield01Icon";'
    )

# Add admin state
if "const [isAdmin" not in content:
    content = content.replace(
        "const [profileOpen, setProfileOpen] = useState(false);",
        "const [profileOpen, setProfileOpen] = useState(false);\n  const [isAdmin, setIsAdmin] = useState(false);"
    )
    # Fix the missing default false in the auth block
    content = content.replace(
        "setEntitlements(null);",
        "setEntitlements(null);\n          setIsAdmin(false);"
    )

# Update loadUser logic
pattern_loaduser = r"const \[loadedProfile, loadedEntitlements\] = await Promise\.all\(\[\s*profileService\.getProfileByUserId\(supabase, currentSession\.user\.id\)\.catch\(\(\) => null\),\s*getUserEntitlements\(currentSession\.user\.id\)\.catch\(\(\) => null\),\s*\]\);\s*if \(cancelled\) return;\s*setProfile\(loadedProfile\);\s*setEntitlements\(loadedEntitlements\);"
new_loaduser = """const [loadedProfile, loadedEntitlements, adminStatus] = await Promise.all([
          profileService.getProfileByUserId(supabase, currentSession.user.id).catch(() => null),
          getUserEntitlements(currentSession.user.id).catch(() => null),
          isUserAdmin(supabase, currentSession.user.id).catch(() => false),
        ]);
        if (cancelled) return;
        setProfile(loadedProfile);
        setEntitlements(loadedEntitlements);
        setIsAdmin(adminStatus || isAdminEmail(email));"""
content = re.sub(pattern_loaduser, new_loaduser, content)

# Add admin link to profile menu
admin_menu_item = """<div className="p-1.5">
                  {isAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => goTo("/admin")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-amber-500 transition-colors hover:bg-[#232734] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 mb-1"
                    >
                      <HugeiconsIcon icon={Shield01Icon} size={18} strokeWidth={1.8} />
                      Administración
                    </button>
                  )}"""
if "Administración" not in content:
    content = content.replace('<div className="p-1.5">', admin_menu_item, 1)

with open("src/components/navigation/DesktopNavbar.tsx", "w", encoding="utf-8") as f:
    f.write(content)
