import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# We need to replace the fade logic.
old_fade_logic = """            let mask = 'none';
            if (banner.fusionPreset !== 'none') {
                const strength = banner.fusionStrength / 100;
                let startFade = 100;
                let endFade = 100;
                if (banner.fusionPreset === 'soft') {
                    startFade = 100 - (30 * strength);
                    endFade = 100 - (70 * strength);
                } else if (banner.fusionPreset === 'medium') {
                    startFade = 100 - (50 * strength);
                    endFade = 100 - (90 * strength);
                } else if (banner.fusionPreset === 'deep') {
                    startFade = 100 - (70 * strength);
                    endFade = 100 - (100 * strength);
                }
                
                // e.g. linear-gradient(to bottom, rgba(0,0,0,1) startFade%, rgba(0,0,0,0) endFade%)
                mask = `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${startFade}%, rgba(0,0,0,0) ${endFade}%)`;
            }"""

new_fade_logic = """            let mask = 'none';
            if (banner.fusionPreset !== 'none') {
                const strength = banner.fusionStrength / 100; // 0 to 1
                let startFade = 100; // Where the gradient begins to fade to transparent
                let endFade = 100;   // Where the gradient becomes fully transparent
                
                // We ALWAYS fade to transparent at 100% (the bottom edge).
                // The strength controls how high up the banner the fade starts.
                if (banner.fusionPreset === 'soft') {
                    startFade = 100 - (30 * strength);
                } else if (banner.fusionPreset === 'medium') {
                    startFade = 100 - (60 * strength);
                } else if (banner.fusionPreset === 'deep') {
                    startFade = 100 - (90 * strength);
                }
                
                // e.g. linear-gradient(to bottom, black 0%, black 50%, transparent 100%)
                mask = `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${startFade}%, rgba(0,0,0,0) ${endFade}%)`;
            }"""

content = content.replace(old_fade_logic, new_fade_logic)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
