with open('src/components/profile/PremiumCustomLinkCard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'className={"flex flex-col' in line and '!isRight' in line:
        lines[i] = '        className={lex flex-col sm:flex-row h-full }>\n'

with open('src/components/profile/PremiumCustomLinkCard.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
