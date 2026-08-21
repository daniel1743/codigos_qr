import re

with open('src/components/profile/PublicProfileView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_block = '''                      ) : premiumMediaLayout ? (
                        <PremiumMediaLinkCard
                          link={link as ProfileLink}
                          layout={premiumMediaLayout}
                          mainAvatarUrl={profile.avatar_url ?? null}
                          isPreview={isPreview}
                        />
                        <PremiumCustomLinkCard
                          link={link as ProfileLink}
                          buttonStyle={buttonStyle}
                          profile={profile}
                          isPreview={isPreview}
                        />
                      ) : profile.social_covers_enabled ? ('''

good_block = '''                      ) : premiumMediaLayout ? (
                        <PremiumMediaLinkCard
                          link={link as ProfileLink}
                          layout={premiumMediaLayout}
                          mainAvatarUrl={profile.avatar_url ?? null}
                          isPreview={isPreview}
                        />
                      ) : profile.social_covers_enabled ? ('''

content = content.replace(bad_block, good_block)

with open('src/components/profile/PublicProfileView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
