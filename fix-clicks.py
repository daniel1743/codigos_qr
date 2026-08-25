import re
with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    c = f.read()

c = re.sub(r'onclick="addSocial', 'onclick="window.addSocial', c)
c = re.sub(r'onclick="removeSocial', 'onclick="window.removeSocial', c)
c = re.sub(r'onclick="toggleSocial', 'onclick="window.toggleSocial', c)
c = re.sub(r'oninput="updateSocialUrl', 'oninput="window.updateSocialUrl', c)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(c)
