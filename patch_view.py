import re

with open('src/components/profile/PublicProfileView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_stmt = 'import { PremiumCustomLinkCard } from "./PremiumCustomLinkCard";\n'
if import_stmt not in content:
    content = content.replace('import { PremiumDecorativeLayer } from "./PremiumDecorativeLayer";', 
                              import_stmt + 'import { PremiumDecorativeLayer } from "./PremiumDecorativeLayer";')

# Add rendering logic
branch_to_replace = '''                      ) : profile.social_covers_enabled ? (
                        <SocialCover
                          link={link as ProfileLink}
                          variant="cover"
                          coverStyle={profile.social_cover_style}
                          coverHeight={profile.social_cover_height}
                          // Modified by Codex - SOCIAL-BADGES-IMAGE-MODE
                          avatarUrl={profile.avatar_url}
                          className="w-full mb-3 last:mb-0"
                          onClick={(e) => {
                            if (isPreview) e.preventDefault();
                          }}
                        />
                      ) : (
                        <a'''

new_branch = '''                      ) : profile.social_covers_enabled ? (
                        <SocialCover
                          link={link as ProfileLink}
                          variant="cover"
                          coverStyle={profile.social_cover_style}
                          coverHeight={profile.social_cover_height}
                          // Modified by Codex - SOCIAL-BADGES-IMAGE-MODE
                          avatarUrl={profile.avatar_url}
                          className="w-full mb-3 last:mb-0"
                          onClick={(e) => {
                            if (isPreview) e.preventDefault();
                          }}
                        />
                      ) : buttonStyle.startsWith("premium_") ? (
                        <PremiumCustomLinkCard
                          link={link as ProfileLink}
                          buttonStyle={buttonStyle}
                          profile={profile}
                          isPreview={isPreview}
                        />
                      ) : (
                        <a'''

content = content.replace(branch_to_replace, new_branch)

with open('src/components/profile/PublicProfileView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
