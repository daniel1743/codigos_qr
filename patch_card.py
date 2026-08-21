import re

with open('src/components/profile/PremiumCustomLinkCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className={"flex flex-col sm:flex-row h-full "}', 
                          'className={lex flex-col sm:flex-row h-full }')

with open('src/components/profile/PremiumCustomLinkCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
