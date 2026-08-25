import re

with open("src/components/navigation/DesktopNavbar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

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

with open("src/components/navigation/DesktopNavbar.tsx", "w", encoding="utf-8") as f:
    f.write(content)
