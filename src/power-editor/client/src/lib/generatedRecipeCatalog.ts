/* Este archivo se genera con: npm run templates:power:catalog. No editar a mano. */
import type { PageConfig } from "./editorCandidateModel";

export type GeneratedRecipe = {
  id: string;
  name: string;
  category: string;
  archetype: string;
  pageConfig: PageConfig;
};

export const GENERATED_RECIPE_CATALOG_VERSION = "premium-assets-v3";
export const generatedRecipes: readonly GeneratedRecipe[] = [
  {
    "id": "power-golden-atelier",
    "name": "Golden Atelier",
    "category": "gold",
    "archetype": "golden-atelier",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Cinzel",
        "titleColor": "#fff7e8",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#e6bd72",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#17130f",
        "gradientEnd": "#755329",
        "gradient": true,
        "angle": 135,
        "pattern": "geometric",
        "patternColor": "#fff7e8",
        "patternOpacity": 8,
        "texture": "metallic",
        "light": "flare"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-01.jpg",
            "imageOpacity": 100,
            "overlayColor": "#17130f",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 0,
                "gap": 9,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#e6bd72",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e6bd72",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Golden Atelier",
            "avatarUrl": "/power-editor-samples/avatar-01.jpg",
            "initials": "GA",
            "size": 76,
            "shape": "rounded",
            "borderWidth": 2,
            "borderColor": "#e6bd72",
            "shadow": 22,
            "align": "center",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "center",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Golden Atelier",
            "align": "center",
            "fontFamily": "Cinzel",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#fff7e8",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "uppercase",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una presencia que transforma una visita en una conversación.",
            "align": "center",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#fff7e8",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 1,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-0-a",
                "label": "Reservar una conversación",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "premium",
                  "color": "#e6bd72",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-0-b",
                "label": "Explorar colección",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "gradient",
                  "color": "#e6bd72",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e6bd72",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "video-0",
          "type": "video",
          "order": 5,
          "enabled": true,
          "name": "video",
          "props": {
            "layout": "full",
            "aspectRatio": "16:9",
            "color": "#fff7e8",
            "items": [
              {
                "id": "video-0-a",
                "title": "Presentación principal",
                "url": "https://example.com/video"
              },
              {
                "id": "video-0-b",
                "title": "Detrás del proceso",
                "url": "https://example.com/process"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "services-0",
          "type": "services",
          "order": 6,
          "enabled": true,
          "name": "services",
          "props": {
            "layout": 1,
            "items": [
              {
                "id": "service-0-a",
                "title": "Dirección creativa",
                "description": "Sistema visual con intención.",
                "cta": "Explorar",
                "url": "https://example.com",
                "icon": "sparkles",
                "imageUrl": "/power-editor-samples/banner-07.jpg"
              },
              {
                "id": "service-0-b",
                "title": "Estrategia",
                "description": "Decisiones claras para crecer.",
                "cta": "Conocer",
                "url": "https://example.com",
                "icon": "star",
                "imageUrl": "/power-editor-samples/banner-08.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "booking-0",
          "type": "booking",
          "order": 7,
          "enabled": true,
          "name": "booking",
          "props": {
            "title": "Agenda una sesión",
            "description": "Elige un momento para conversar.",
            "cta": "Reservar ahora",
            "url": "https://example.com/booking",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "spacer-0",
          "type": "spacer",
          "order": 8,
          "enabled": true,
          "name": "spacer",
          "props": {
            "height": 24,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 15,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#e6bd72",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e6bd72",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ring-0",
          "type": "ring",
          "order": 9,
          "enabled": true,
          "name": "ring",
          "props": {
            "color": "#e6bd72",
            "thickness": 2,
            "size": 132,
            "partial": true,
            "position": "bottom-left",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ornament-0",
          "type": "ornament",
          "order": 10,
          "enabled": true,
          "name": "ornament",
          "props": {
            "preset": "art-deco",
            "position": "top-left",
            "insetX": 16,
            "insetY": 16,
            "size": 56,
            "thickness": 2,
            "color": "#e6bd72",
            "opacity": 78,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "particles-0",
          "type": "particles",
          "order": 11,
          "enabled": true,
          "name": "particles",
          "props": {
            "preset": "soft-dots",
            "quantity": 18,
            "size": 3,
            "opacity": 42,
            "speed": 9,
            "direction": "up",
            "color": "#e6bd72",
            "randomness": 70,
            "blur": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 12,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "center",
            "gap": 12,
            "size": 18,
            "color": "#e6bd72",
            "socialStyle": "simple",
            "items": [
              {
                "id": "instagram-0",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-0",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-0",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 13,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "center",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#fff7e8",
            "opacity": 62,
            "divider": true,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "hero-composition",
            "kind": "overlay",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              },
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile",
                "style": {
                  "position": {
                    "positionMode": "anchored",
                    "anchor": "bottom-center",
                    "offsetY": 26,
                    "zIndex": 8,
                    "width": 72
                  }
                }
              }
            ],
            "style": {
              "minHeight": 230,
              "overflow": "visible"
            }
          },
          {
            "id": "hero-followup",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              },
              {
                "id": "ref-booking-0",
                "kind": "block",
                "enabled": true,
                "blockId": "booking-0",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading"
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-video-0",
                "kind": "block",
                "enabled": true,
                "blockId": "video-0"
              },
              {
                "id": "ref-services-0",
                "kind": "block",
                "enabled": true,
                "blockId": "services-0",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-spacer-0",
                "kind": "block",
                "enabled": true,
                "blockId": "spacer-0",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-ring-0",
                "kind": "block",
                "enabled": true,
                "blockId": "ring-0",
                "style": {
                  "placement": 3
                }
              },
              {
                "id": "ref-ornament-0",
                "kind": "block",
                "enabled": true,
                "blockId": "ornament-0",
                "style": {
                  "placement": 4
                }
              },
              {
                "id": "ref-particles-0",
                "kind": "block",
                "enabled": true,
                "blockId": "particles-0",
                "style": {
                  "placement": 5
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 6
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 7
                }
              }
            ],
            "style": {
              "gap": 16,
              "padding": 28
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-platinum-editorial",
    "name": "Platinum Editorial",
    "category": "platinum",
    "archetype": "platinum-editorial",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Bodoni Moda",
        "titleColor": "#ffffff",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#dbe8ef",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#18222d",
        "gradientEnd": "#63788b",
        "gradient": true,
        "angle": 146,
        "pattern": "lines",
        "patternColor": "#ffffff",
        "patternOpacity": 8,
        "texture": "metallic",
        "light": "spotlight"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-02.jpg",
            "imageOpacity": 100,
            "overlayColor": "#18222d",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 12,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#dbe8ef",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Platinum Editorial",
            "avatarUrl": "/power-editor-samples/avatar-02.jpg",
            "initials": "PE",
            "size": 76,
            "shape": "circle",
            "borderWidth": 2,
            "borderColor": "#dbe8ef",
            "shadow": 22,
            "align": "left",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "left",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Platinum Editorial",
            "align": "left",
            "fontFamily": "Bodoni Moda",
            "fontSize": 34,
            "fontWeight": 800,
            "color": "#ffffff",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "none",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una experiencia digital con ritmo, materia y propósito.",
            "align": "left",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#ffffff",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#dbe8ef",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 2,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-1-a",
                "label": "Conocer",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "glass",
                  "color": "#dbe8ef",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-1-b",
                "label": "Agenda",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "outline",
                  "color": "#dbe8ef",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "image-1",
          "type": "image",
          "order": 5,
          "enabled": true,
          "name": "image",
          "props": {
            "label": "Detalle de marca",
            "url": "/power-editor-samples/banner-07.jpg",
            "alt": "Detalle visual de plantilla",
            "height": 188,
            "fit": "cover",
            "radius": 18,
            "positionX": 50,
            "positionY": 50,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "gallery-1",
          "type": "gallery",
          "order": 6,
          "enabled": true,
          "name": "gallery",
          "props": {
            "layout": 3,
            "gap": 8,
            "radius": 14,
            "aspectRatio": "1:1",
            "items": [
              {
                "id": "gallery-1-0",
                "url": "/power-editor-samples/banner-02.jpg"
              },
              {
                "id": "gallery-1-1",
                "url": "/power-editor-samples/banner-03.jpg"
              },
              {
                "id": "gallery-1-2",
                "url": "/power-editor-samples/banner-04.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "separator-1",
          "type": "separator",
          "order": 7,
          "enabled": true,
          "name": "separator",
          "props": {
            "dividerStyle": "double",
            "color": "#dbe8ef",
            "width": 1,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#dbe8ef",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "frame-1",
          "type": "frame",
          "order": 8,
          "enabled": true,
          "name": "frame",
          "props": {
            "preset": "double",
            "inset": 12,
            "thickness": 1,
            "color": "#dbe8ef",
            "opacity": 44,
            "radius": 24,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "shape-1",
          "type": "shape",
          "order": 9,
          "enabled": true,
          "name": "shape",
          "props": {
            "shape": "blob",
            "color": "#dbe8ef",
            "stroke": "#ffffff",
            "opacity": 36,
            "size": 104,
            "rotation": 18,
            "position": "top-right",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ring-1",
          "type": "ring",
          "order": 10,
          "enabled": true,
          "name": "ring",
          "props": {
            "color": "#dbe8ef",
            "thickness": 2,
            "size": 132,
            "partial": true,
            "position": "bottom-left",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 11,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "left",
            "gap": 12,
            "size": 18,
            "color": "#dbe8ef",
            "socialStyle": "glass",
            "items": [
              {
                "id": "instagram-1",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-1",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-1",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 12,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "left",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#ffffff",
            "opacity": 62,
            "divider": false,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "editorial-cover",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              },
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 3
                }
              },
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              }
            ],
            "style": {
              "padding": 28,
              "gap": 14,
              "minHeight": 180,
              "verticalAlign": "center"
            }
          },
          {
            "id": "editorial-actions",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-separator-1",
                "kind": "block",
                "enabled": true,
                "blockId": "separator-1"
              },
              {
                "id": "ref-frame-1",
                "kind": "block",
                "enabled": true,
                "blockId": "frame-1",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-shape-1",
                "kind": "block",
                "enabled": true,
                "blockId": "shape-1",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-ring-1",
                "kind": "block",
                "enabled": true,
                "blockId": "ring-1",
                "style": {
                  "placement": 3
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 4
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 5
                }
              }
            ],
            "style": {
              "gap": 16,
              "padding": 26
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-obsidian-creator",
    "name": "Obsidian Creator",
    "category": "obsidian",
    "archetype": "obsidian-creator",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Space Grotesk",
        "titleColor": "#f6f2f8",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#e7b8f0",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#101114",
        "gradientEnd": "#322234",
        "gradient": true,
        "angle": 157,
        "pattern": "noise",
        "patternColor": "#f6f2f8",
        "patternOpacity": 8,
        "texture": "grain",
        "light": "ambient"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-03.jpg",
            "imageOpacity": 100,
            "overlayColor": "#101114",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 15,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#e7b8f0",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e7b8f0",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Obsidian Creator",
            "avatarUrl": "/power-editor-samples/avatar-03.jpg",
            "initials": "OC",
            "size": 76,
            "shape": "circle",
            "borderWidth": 2,
            "borderColor": "#e7b8f0",
            "shadow": 22,
            "align": "left",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "left",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e7b8f0",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Obsidian Creator",
            "align": "left",
            "fontFamily": "Space Grotesk",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#f6f2f8",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "none",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e7b8f0",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una presencia que transforma una visita en una conversación.",
            "align": "left",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#f6f2f8",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e7b8f0",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 2,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-2-a",
                "label": "Conocer",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "premium",
                  "color": "#e7b8f0",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-2-b",
                "label": "Agenda",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "outline",
                  "color": "#e7b8f0",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e7b8f0",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "video-2",
          "type": "video",
          "order": 5,
          "enabled": true,
          "name": "video",
          "props": {
            "layout": "full",
            "aspectRatio": "16:9",
            "color": "#f6f2f8",
            "items": [
              {
                "id": "video-2-a",
                "title": "Presentación principal",
                "url": "https://example.com/video"
              },
              {
                "id": "video-2-b",
                "title": "Detrás del proceso",
                "url": "https://example.com/process"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e7b8f0",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "cards-2",
          "type": "cards",
          "order": 6,
          "enabled": true,
          "name": "cards",
          "props": {
            "layout": 2,
            "items": [
              {
                "id": "card-2-a",
                "title": "Selección curada",
                "description": "Un recorrido breve por lo esencial.",
                "cta": "Descubrir",
                "ctaUrl": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-09.jpg"
              },
              {
                "id": "card-2-b",
                "title": "Próximo paso",
                "description": "Reserva una conversación.",
                "cta": "Reservar",
                "ctaUrl": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-10.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e7b8f0",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "particles-2",
          "type": "particles",
          "order": 8,
          "enabled": true,
          "name": "particles",
          "props": {
            "preset": "soft-dots",
            "quantity": 18,
            "size": 3,
            "opacity": 42,
            "speed": 9,
            "direction": "up",
            "color": "#e7b8f0",
            "randomness": 70,
            "blur": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e7b8f0",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "shape-2",
          "type": "shape",
          "order": 9,
          "enabled": true,
          "name": "shape",
          "props": {
            "shape": "circle",
            "color": "#e7b8f0",
            "stroke": "#f6f2f8",
            "opacity": 36,
            "size": 104,
            "rotation": 18,
            "position": "top-right",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e7b8f0",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 10,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "left",
            "gap": 12,
            "size": 18,
            "color": "#e7b8f0",
            "socialStyle": "simple",
            "items": [
              {
                "id": "instagram-2",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-2",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-2",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e7b8f0",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 11,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "left",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#f6f2f8",
            "opacity": 62,
            "divider": true,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e7b8f0",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e7b8f0",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f6f2f8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101114",
                "middle": "#322234",
                "end": "#101114",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "split-layout",
            "kind": "row",
            "enabled": true,
            "children": [
              {
                "id": "split-left",
                "kind": "column",
                "enabled": true,
                "children": [
                  {
                    "id": "ref-banner",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "banner"
                  }
                ],
                "style": {
                  "gap": 16
                }
              },
              {
                "id": "split-right",
                "kind": "column",
                "enabled": true,
                "children": [
                  {
                    "id": "ref-links",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "links"
                  },
                  {
                    "id": "ref-profile",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "profile"
                  },
                  {
                    "id": "ref-heading",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "heading",
                    "style": {
                      "placement": 1
                    }
                  },
                  {
                    "id": "ref-subtitle",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "subtitle",
                    "style": {
                      "placement": 2
                    }
                  }
                ],
                "style": {
                  "gap": 16,
                  "justify": "center"
                }
              }
            ],
            "style": {
              "split": {
                "direction": "row",
                "tracks": [
                  40,
                  60
                ],
                "collapse": "stack",
                "minColumnWidth": 180
              },
              "responsive": {
                "mobile": {
                  "gap": 18
                },
                "tablet": {
                  "gap": 20
                },
                "desktop": {
                  "gap": 24
                }
              },
              "padding": 22
            }
          },
          {
            "id": "split-tail",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-cards-2",
                "kind": "block",
                "enabled": true,
                "blockId": "cards-2"
              },
              {
                "id": "ref-particles-2",
                "kind": "block",
                "enabled": true,
                "blockId": "particles-2",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-shape-2",
                "kind": "block",
                "enabled": true,
                "blockId": "shape-2",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 3
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 4
                }
              }
            ],
            "style": {
              "gap": 16,
              "padding": 24
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-emerald-concierge",
    "name": "Emerald Concierge",
    "category": "emerald",
    "archetype": "emerald-concierge",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Marcellus",
        "titleColor": "#f2f6ef",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#e2c27d",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#102d29",
        "gradientEnd": "#39745d",
        "gradient": true,
        "angle": 168,
        "pattern": "waves",
        "patternColor": "#f2f6ef",
        "patternOpacity": 8,
        "texture": "paper",
        "light": "radial"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-04.jpg",
            "imageOpacity": 100,
            "overlayColor": "#102d29",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 0,
                "gap": 9,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#e2c27d",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Emerald Concierge",
            "avatarUrl": "/power-editor-samples/avatar-04.jpg",
            "initials": "EC",
            "size": 76,
            "shape": "rounded",
            "borderWidth": 2,
            "borderColor": "#e2c27d",
            "shadow": 22,
            "align": "center",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "center",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e2c27d",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Emerald Concierge",
            "align": "center",
            "fontFamily": "Marcellus",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#f2f6ef",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "uppercase",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una experiencia digital con ritmo, materia y propósito.",
            "align": "center",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#f2f6ef",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 1,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-3-a",
                "label": "Reservar una conversación",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "glass",
                  "color": "#e2c27d",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-3-b",
                "label": "Explorar colección",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "gradient",
                  "color": "#e2c27d",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "services-3",
          "type": "services",
          "order": 5,
          "enabled": true,
          "name": "services",
          "props": {
            "layout": 2,
            "items": [
              {
                "id": "service-3-a",
                "title": "Dirección creativa",
                "description": "Sistema visual con intención.",
                "cta": "Explorar",
                "url": "https://example.com",
                "icon": "sparkles",
                "imageUrl": "/power-editor-samples/banner-09.jpg"
              },
              {
                "id": "service-3-b",
                "title": "Estrategia",
                "description": "Decisiones claras para crecer.",
                "cta": "Conocer",
                "url": "https://example.com",
                "icon": "star",
                "imageUrl": "/power-editor-samples/banner-10.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e2c27d",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "booking-3",
          "type": "booking",
          "order": 6,
          "enabled": true,
          "name": "booking",
          "props": {
            "title": "Agenda una sesión",
            "description": "Elige un momento para conversar.",
            "cta": "Reservar ahora",
            "url": "https://example.com/booking",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "faq-3",
          "type": "faq",
          "order": 7,
          "enabled": true,
          "name": "faq",
          "props": {
            "layout": 1,
            "items": [
              {
                "id": "faq-3-a",
                "title": "¿Cómo empezamos?",
                "description": "Con una conversación breve y objetivos claros."
              },
              {
                "id": "faq-3-b",
                "title": "¿Qué incluye?",
                "description": "Una experiencia diseñada alrededor de tu marca."
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "contact-3",
          "type": "contact",
          "order": 8,
          "enabled": true,
          "name": "contact",
          "props": {
            "title": "Hablemos",
            "description": "Cuéntame qué quieres construir.",
            "email": "hola@example.com",
            "cta": "Enviar mensaje",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ornament-3",
          "type": "ornament",
          "order": 9,
          "enabled": true,
          "name": "ornament",
          "props": {
            "preset": "gold-corner",
            "position": "top-left",
            "insetX": 16,
            "insetY": 16,
            "size": 56,
            "thickness": 2,
            "color": "#e2c27d",
            "opacity": 78,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e2c27d",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 10,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "center",
            "gap": 12,
            "size": 18,
            "color": "#e2c27d",
            "socialStyle": "glass",
            "items": [
              {
                "id": "instagram-3",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-3",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-3",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e2c27d",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 11,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "center",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#f2f6ef",
            "opacity": 62,
            "divider": false,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "fixed-hero",
            "kind": "overlay",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              },
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile",
                "style": {
                  "position": {
                    "positionMode": "anchored",
                    "anchor": "bottom-center",
                    "offsetY": 22,
                    "zIndex": 7,
                    "width": 70
                  }
                }
              }
            ],
            "style": {
              "minHeight": 220,
              "overflow": "visible"
            }
          },
          {
            "id": "fixed-cta",
            "kind": "fixed",
            "enabled": true,
            "children": [
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              },
              {
                "id": "ref-booking-3",
                "kind": "block",
                "enabled": true,
                "blockId": "booking-3",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-contact-3",
                "kind": "block",
                "enabled": true,
                "blockId": "contact-3",
                "style": {
                  "placement": 2
                }
              }
            ],
            "style": {
              "fixed": {
                "edge": "bottom",
                "inset": 14,
                "zIndex": 16,
                "safeArea": true,
                "maxWidth": 340,
                "reserveSpace": true
              }
            }
          },
          {
            "id": "fixed-body",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading"
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-services-3",
                "kind": "block",
                "enabled": true,
                "blockId": "services-3"
              },
              {
                "id": "ref-faq-3",
                "kind": "block",
                "enabled": true,
                "blockId": "faq-3",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-ornament-3",
                "kind": "block",
                "enabled": true,
                "blockId": "ornament-3",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 3
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 4
                }
              }
            ],
            "style": {
              "gap": 16,
              "padding": 28
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-cobalt-product-studio",
    "name": "Cobalt Product Studio",
    "category": "cobalt",
    "archetype": "cobalt-product-studio",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Outfit",
        "titleColor": "#eef5ff",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#9cc7ff",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#101a40",
        "gradientEnd": "#315ea2",
        "gradient": true,
        "angle": 179,
        "pattern": "grid",
        "patternColor": "#eef5ff",
        "patternOpacity": 8,
        "texture": "grain",
        "light": "spotlight"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-05.jpg",
            "imageOpacity": 100,
            "overlayColor": "#101a40",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 12,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#9cc7ff",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#9cc7ff",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Cobalt Product Studio",
            "avatarUrl": "/power-editor-samples/avatar-05.jpg",
            "initials": "CP",
            "size": 76,
            "shape": "circle",
            "borderWidth": 2,
            "borderColor": "#9cc7ff",
            "shadow": 22,
            "align": "right",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "right",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Cobalt Product Studio",
            "align": "right",
            "fontFamily": "Outfit",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#eef5ff",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "none",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una presencia que transforma una visita en una conversación.",
            "align": "right",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#eef5ff",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 2,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-4-a",
                "label": "Conocer",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "premium",
                  "color": "#9cc7ff",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-4-b",
                "label": "Agenda",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "outline",
                  "color": "#9cc7ff",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#9cc7ff",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "products-4",
          "type": "products",
          "order": 5,
          "enabled": true,
          "name": "products",
          "props": {
            "layout": 2,
            "items": [
              {
                "id": "product-4-a",
                "title": "Edición selecta",
                "description": "Acceso a una experiencia principal.",
                "price": "$ —",
                "cta": "Ver detalles",
                "url": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-10.jpg"
              },
              {
                "id": "product-4-b",
                "title": "Colección privada",
                "description": "Una opción complementaria.",
                "price": "$ —",
                "cta": "Explorar",
                "url": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-11.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "gallery-4",
          "type": "gallery",
          "order": 6,
          "enabled": true,
          "name": "gallery",
          "props": {
            "layout": 2,
            "gap": 8,
            "radius": 14,
            "aspectRatio": "1:1",
            "items": [
              {
                "id": "gallery-4-0",
                "url": "/power-editor-samples/banner-02.jpg"
              },
              {
                "id": "gallery-4-1",
                "url": "/power-editor-samples/banner-03.jpg"
              },
              {
                "id": "gallery-4-2",
                "url": "/power-editor-samples/banner-04.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "cards-4",
          "type": "cards",
          "order": 7,
          "enabled": true,
          "name": "cards",
          "props": {
            "layout": 2,
            "items": [
              {
                "id": "card-4-a",
                "title": "Selección curada",
                "description": "Un recorrido breve por lo esencial.",
                "cta": "Descubrir",
                "ctaUrl": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-12.jpg"
              },
              {
                "id": "card-4-b",
                "title": "Próximo paso",
                "description": "Reserva una conversación.",
                "cta": "Reservar",
                "ctaUrl": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-01.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "frame-4",
          "type": "frame",
          "order": 8,
          "enabled": true,
          "name": "frame",
          "props": {
            "preset": "single",
            "inset": 12,
            "thickness": 1,
            "color": "#9cc7ff",
            "opacity": 44,
            "radius": 24,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#9cc7ff",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ring-4",
          "type": "ring",
          "order": 9,
          "enabled": true,
          "name": "ring",
          "props": {
            "color": "#9cc7ff",
            "thickness": 2,
            "size": 132,
            "partial": true,
            "position": "bottom-left",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 10,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "right",
            "gap": 12,
            "size": 18,
            "color": "#9cc7ff",
            "socialStyle": "simple",
            "items": [
              {
                "id": "instagram-4",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-4",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-4",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 11,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "right",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#eef5ff",
            "opacity": 62,
            "divider": true,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "grid-cover",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              }
            ],
            "style": {
              "padding": 0,
              "minHeight": 190,
              "overflow": "hidden"
            }
          },
          {
            "id": "grid-intro",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              },
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile"
              },
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 2
                }
              }
            ],
            "style": {
              "gap": 12,
              "padding": 24
            }
          },
          {
            "id": "grid-gallery",
            "kind": "grid",
            "enabled": true,
            "children": [
              {
                "id": "ref-products-4",
                "kind": "block",
                "enabled": true,
                "blockId": "products-4",
                "style": {
                  "placement": {
                    "columnStart": 1,
                    "columnSpan": 1
                  }
                }
              },
              {
                "id": "ref-cards-4",
                "kind": "block",
                "enabled": true,
                "blockId": "cards-4",
                "style": {
                  "placement": {
                    "columnStart": 2,
                    "columnSpan": 1
                  }
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": {
                    "columnStart": 3,
                    "columnSpan": 1
                  }
                }
              }
            ],
            "style": {
              "grid": {
                "columns": 3,
                "autoFlow": "row"
              },
              "responsive": {
                "mobile": {
                  "grid": {
                    "columns": 1
                  },
                  "gap": 12
                },
                "tablet": {
                  "grid": {
                    "columns": 2
                  },
                  "gap": 16
                },
                "desktop": {
                  "grid": {
                    "columns": 3
                  },
                  "gap": 18
                }
              },
              "padding": 24
            }
          },
          {
            "id": "grid-tail",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-frame-4",
                "kind": "block",
                "enabled": true,
                "blockId": "frame-4"
              },
              {
                "id": "ref-ring-4",
                "kind": "block",
                "enabled": true,
                "blockId": "ring-4",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 2
                }
              }
            ],
            "style": {
              "gap": 14,
              "padding": 24
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-rose-ceremony",
    "name": "Rose Ceremony",
    "category": "rose",
    "archetype": "rose-ceremony",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Italiana",
        "titleColor": "#fff5f7",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#ffd6dd",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#3d1d30",
        "gradientEnd": "#9f617b",
        "gradient": true,
        "angle": 190,
        "pattern": "diagonal",
        "patternColor": "#fff5f7",
        "patternOpacity": 8,
        "texture": "paper",
        "light": "flare"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-06.jpg",
            "imageOpacity": 100,
            "overlayColor": "#3d1d30",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 15,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#ffd6dd",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Rose Ceremony",
            "avatarUrl": "/power-editor-samples/avatar-06.jpg",
            "initials": "RC",
            "size": 76,
            "shape": "circle",
            "borderWidth": 2,
            "borderColor": "#ffd6dd",
            "shadow": 22,
            "align": "center",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "center",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Rose Ceremony",
            "align": "center",
            "fontFamily": "Italiana",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#fff5f7",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "none",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una experiencia digital con ritmo, materia y propósito.",
            "align": "center",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#fff5f7",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#ffd6dd",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 1,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-5-a",
                "label": "Reservar una conversación",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "glass",
                  "color": "#ffd6dd",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-5-b",
                "label": "Explorar colección",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "outline",
                  "color": "#ffd6dd",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "booking-5",
          "type": "booking",
          "order": 5,
          "enabled": true,
          "name": "booking",
          "props": {
            "title": "Agenda una sesión",
            "description": "Elige un momento para conversar.",
            "cta": "Reservar ahora",
            "url": "https://example.com/booking",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "image-5",
          "type": "image",
          "order": 6,
          "enabled": true,
          "name": "image",
          "props": {
            "label": "Detalle de marca",
            "url": "/power-editor-samples/banner-12.jpg",
            "alt": "Detalle visual de plantilla",
            "height": 188,
            "fit": "cover",
            "radius": 18,
            "positionX": 50,
            "positionY": 50,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "gallery-5",
          "type": "gallery",
          "order": 7,
          "enabled": true,
          "name": "gallery",
          "props": {
            "layout": 3,
            "gap": 8,
            "radius": 14,
            "aspectRatio": "1:1",
            "items": [
              {
                "id": "gallery-5-0",
                "url": "/power-editor-samples/banner-03.jpg"
              },
              {
                "id": "gallery-5-1",
                "url": "/power-editor-samples/banner-04.jpg"
              },
              {
                "id": "gallery-5-2",
                "url": "/power-editor-samples/banner-05.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#ffd6dd",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "separator-5",
          "type": "separator",
          "order": 8,
          "enabled": true,
          "name": "separator",
          "props": {
            "dividerStyle": "double",
            "color": "#ffd6dd",
            "width": 1,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ornament-5",
          "type": "ornament",
          "order": 9,
          "enabled": true,
          "name": "ornament",
          "props": {
            "preset": "gold-corner",
            "position": "top-left",
            "insetX": 16,
            "insetY": 16,
            "size": 56,
            "thickness": 2,
            "color": "#ffd6dd",
            "opacity": 78,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "particles-5",
          "type": "particles",
          "order": 10,
          "enabled": true,
          "name": "particles",
          "props": {
            "preset": "sparkle",
            "quantity": 18,
            "size": 3,
            "opacity": 42,
            "speed": 9,
            "direction": "down",
            "color": "#ffd6dd",
            "randomness": 70,
            "blur": 0,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 11,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "center",
            "gap": 12,
            "size": 18,
            "color": "#ffd6dd",
            "socialStyle": "glass",
            "items": [
              {
                "id": "instagram-5",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-5",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-5",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 12,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "center",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#fff5f7",
            "opacity": 62,
            "divider": false,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#ffd6dd",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#ffd6dd",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff5f7",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#3d1d30",
                "middle": "#9f617b",
                "end": "#3d1d30",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "hero-composition",
            "kind": "overlay",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              },
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile",
                "style": {
                  "position": {
                    "positionMode": "free",
                    "x": 50,
                    "y": 84,
                    "zIndex": 9,
                    "width": 70
                  }
                }
              }
            ],
            "style": {
              "minHeight": 244,
              "overflow": "visible"
            }
          },
          {
            "id": "hero-followup",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              },
              {
                "id": "ref-booking-5",
                "kind": "block",
                "enabled": true,
                "blockId": "booking-5",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading"
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-image-5",
                "kind": "block",
                "enabled": true,
                "blockId": "image-5"
              },
              {
                "id": "ref-gallery-5",
                "kind": "block",
                "enabled": true,
                "blockId": "gallery-5",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-separator-5",
                "kind": "block",
                "enabled": true,
                "blockId": "separator-5",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-ornament-5",
                "kind": "block",
                "enabled": true,
                "blockId": "ornament-5",
                "style": {
                  "placement": 3
                }
              },
              {
                "id": "ref-particles-5",
                "kind": "block",
                "enabled": true,
                "blockId": "particles-5",
                "style": {
                  "placement": 4
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 5
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 6
                }
              }
            ],
            "style": {
              "gap": 16,
              "padding": 28
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-terracotta-maker",
    "name": "Terracotta Maker",
    "category": "terracotta",
    "archetype": "terracotta-maker",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "DM Serif Display",
        "titleColor": "#fff7ed",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#f7d6b4",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#392117",
        "gradientEnd": "#b56548",
        "gradient": true,
        "angle": 201,
        "pattern": "dots",
        "patternColor": "#fff7ed",
        "patternOpacity": 8,
        "texture": "paper",
        "light": "ambient"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-07.jpg",
            "imageOpacity": 100,
            "overlayColor": "#392117",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 0,
                "gap": 9,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#f7d6b4",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Terracotta Maker",
            "avatarUrl": "/power-editor-samples/avatar-07.jpg",
            "initials": "TM",
            "size": 76,
            "shape": "rounded",
            "borderWidth": 2,
            "borderColor": "#f7d6b4",
            "shadow": 22,
            "align": "left",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "left",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Terracotta Maker",
            "align": "left",
            "fontFamily": "DM Serif Display",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#fff7ed",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "uppercase",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#f7d6b4",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una presencia que transforma una visita en una conversación.",
            "align": "left",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#fff7ed",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 2,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-6-a",
                "label": "Conocer",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "premium",
                  "color": "#f7d6b4",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-6-b",
                "label": "Agenda",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "gradient",
                  "color": "#f7d6b4",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "services-6",
          "type": "services",
          "order": 5,
          "enabled": true,
          "name": "services",
          "props": {
            "layout": 1,
            "items": [
              {
                "id": "service-6-a",
                "title": "Dirección creativa",
                "description": "Sistema visual con intención.",
                "cta": "Explorar",
                "url": "https://example.com",
                "icon": "sparkles",
                "imageUrl": "/power-editor-samples/banner-12.jpg"
              },
              {
                "id": "service-6-b",
                "title": "Estrategia",
                "description": "Decisiones claras para crecer.",
                "cta": "Conocer",
                "url": "https://example.com",
                "icon": "star",
                "imageUrl": "/power-editor-samples/banner-01.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "video-6",
          "type": "video",
          "order": 6,
          "enabled": true,
          "name": "video",
          "props": {
            "layout": "full",
            "aspectRatio": "16:9",
            "color": "#fff7ed",
            "items": [
              {
                "id": "video-6-a",
                "title": "Presentación principal",
                "url": "https://example.com/video"
              },
              {
                "id": "video-6-b",
                "title": "Detrás del proceso",
                "url": "https://example.com/process"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#f7d6b4",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "map-6",
          "type": "map",
          "order": 7,
          "enabled": true,
          "name": "map",
          "props": {
            "title": "Estudio",
            "address": "Ubicación por definir",
            "cta": "Ver ubicación",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "shape-6",
          "type": "shape",
          "order": 8,
          "enabled": true,
          "name": "shape",
          "props": {
            "shape": "circle",
            "color": "#f7d6b4",
            "stroke": "#fff7ed",
            "opacity": 36,
            "size": 104,
            "rotation": 18,
            "position": "top-right",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ring-6",
          "type": "ring",
          "order": 9,
          "enabled": true,
          "name": "ring",
          "props": {
            "color": "#f7d6b4",
            "thickness": 2,
            "size": 132,
            "partial": true,
            "position": "bottom-left",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 10,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "left",
            "gap": 12,
            "size": 18,
            "color": "#f7d6b4",
            "socialStyle": "simple",
            "items": [
              {
                "id": "instagram-6",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-6",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-6",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#f7d6b4",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 11,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "left",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#fff7ed",
            "opacity": 62,
            "divider": true,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#f7d6b4",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#f7d6b4",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7ed",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#392117",
                "middle": "#b56548",
                "end": "#392117",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "split-layout",
            "kind": "row",
            "enabled": true,
            "children": [
              {
                "id": "split-left",
                "kind": "column",
                "enabled": true,
                "children": [
                  {
                    "id": "ref-banner",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "banner"
                  }
                ],
                "style": {
                  "gap": 16
                }
              },
              {
                "id": "split-right",
                "kind": "column",
                "enabled": true,
                "children": [
                  {
                    "id": "ref-links",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "links"
                  },
                  {
                    "id": "ref-profile",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "profile"
                  },
                  {
                    "id": "ref-heading",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "heading",
                    "style": {
                      "placement": 1
                    }
                  },
                  {
                    "id": "ref-subtitle",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "subtitle",
                    "style": {
                      "placement": 2
                    }
                  }
                ],
                "style": {
                  "gap": 16,
                  "justify": "center"
                }
              }
            ],
            "style": {
              "split": {
                "direction": "row-reverse",
                "tracks": [
                  60,
                  40
                ],
                "collapse": "stack",
                "minColumnWidth": 180
              },
              "responsive": {
                "mobile": {
                  "gap": 18
                },
                "tablet": {
                  "gap": 20
                },
                "desktop": {
                  "gap": 24
                }
              },
              "padding": 22
            }
          },
          {
            "id": "split-tail",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-services-6",
                "kind": "block",
                "enabled": true,
                "blockId": "services-6"
              },
              {
                "id": "ref-map-6",
                "kind": "block",
                "enabled": true,
                "blockId": "map-6",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-shape-6",
                "kind": "block",
                "enabled": true,
                "blockId": "shape-6",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-ring-6",
                "kind": "block",
                "enabled": true,
                "blockId": "ring-6",
                "style": {
                  "placement": 3
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 4
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 5
                }
              }
            ],
            "style": {
              "gap": 16,
              "padding": 24
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-ivory-portfolio",
    "name": "Ivory Portfolio",
    "category": "ivory",
    "archetype": "ivory-portfolio",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Lora",
        "titleColor": "#2a211b",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#422f22",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#e8dec8",
        "gradientEnd": "#bba680",
        "gradient": true,
        "angle": 212,
        "pattern": "lines",
        "patternColor": "#2a211b",
        "patternOpacity": 8,
        "texture": "paper",
        "light": "radial"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-08.jpg",
            "imageOpacity": 100,
            "overlayColor": "#e8dec8",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 12,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#422f22",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#422f22",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Ivory Portfolio",
            "avatarUrl": "/power-editor-samples/avatar-08.jpg",
            "initials": "IP",
            "size": 76,
            "shape": "circle",
            "borderWidth": 2,
            "borderColor": "#422f22",
            "shadow": 22,
            "align": "left",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "left",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#422f22",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Ivory Portfolio",
            "align": "left",
            "fontFamily": "Lora",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#2a211b",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "none",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#422f22",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una experiencia digital con ritmo, materia y propósito.",
            "align": "left",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#2a211b",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#422f22",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 1,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-7-a",
                "label": "Reservar una conversación",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "glass",
                  "color": "#422f22",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-7-b",
                "label": "Explorar colección",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "outline",
                  "color": "#422f22",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#422f22",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "gallery-7",
          "type": "gallery",
          "order": 5,
          "enabled": true,
          "name": "gallery",
          "props": {
            "layout": 3,
            "gap": 8,
            "radius": 14,
            "aspectRatio": "1:1",
            "items": [
              {
                "id": "gallery-7-0",
                "url": "/power-editor-samples/banner-02.jpg"
              },
              {
                "id": "gallery-7-1",
                "url": "/power-editor-samples/banner-03.jpg"
              },
              {
                "id": "gallery-7-2",
                "url": "/power-editor-samples/banner-04.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#422f22",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "image-7",
          "type": "image",
          "order": 6,
          "enabled": true,
          "name": "image",
          "props": {
            "label": "Detalle de marca",
            "url": "/power-editor-samples/banner-02.jpg",
            "alt": "Detalle visual de plantilla",
            "height": 188,
            "fit": "cover",
            "radius": 18,
            "positionX": 50,
            "positionY": 50,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#422f22",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "cards-7",
          "type": "cards",
          "order": 7,
          "enabled": true,
          "name": "cards",
          "props": {
            "layout": 2,
            "items": [
              {
                "id": "card-7-a",
                "title": "Selección curada",
                "description": "Un recorrido breve por lo esencial.",
                "cta": "Descubrir",
                "ctaUrl": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-03.jpg"
              },
              {
                "id": "card-7-b",
                "title": "Próximo paso",
                "description": "Reserva una conversación.",
                "cta": "Reservar",
                "ctaUrl": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-04.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#422f22",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "faq-7",
          "type": "faq",
          "order": 8,
          "enabled": true,
          "name": "faq",
          "props": {
            "layout": 1,
            "items": [
              {
                "id": "faq-7-a",
                "title": "¿Cómo empezamos?",
                "description": "Con una conversación breve y objetivos claros."
              },
              {
                "id": "faq-7-b",
                "title": "¿Qué incluye?",
                "description": "Una experiencia diseñada alrededor de tu marca."
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#422f22",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "frame-7",
          "type": "frame",
          "order": 9,
          "enabled": true,
          "name": "frame",
          "props": {
            "preset": "double",
            "inset": 12,
            "thickness": 1,
            "color": "#422f22",
            "opacity": 44,
            "radius": 24,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#422f22",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 10,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "left",
            "gap": 12,
            "size": 18,
            "color": "#422f22",
            "socialStyle": "glass",
            "items": [
              {
                "id": "instagram-7",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-7",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-7",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#422f22",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 11,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "left",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#2a211b",
            "opacity": 62,
            "divider": false,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#422f22",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#422f22",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#2a211b",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#e8dec8",
                "middle": "#bba680",
                "end": "#e8dec8",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "grid-cover",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              }
            ],
            "style": {
              "padding": 0,
              "minHeight": 190,
              "overflow": "hidden"
            }
          },
          {
            "id": "grid-intro",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              },
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile"
              },
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 2
                }
              }
            ],
            "style": {
              "gap": 12,
              "padding": 24
            }
          },
          {
            "id": "grid-gallery",
            "kind": "grid",
            "enabled": true,
            "children": [
              {
                "id": "ref-cards-7",
                "kind": "block",
                "enabled": true,
                "blockId": "cards-7",
                "style": {
                  "placement": {
                    "columnStart": 1,
                    "columnSpan": 1
                  }
                }
              }
            ],
            "style": {
              "grid": {
                "columns": 2,
                "autoFlow": "row"
              },
              "responsive": {
                "mobile": {
                  "grid": {
                    "columns": 1
                  },
                  "gap": 12
                },
                "tablet": {
                  "grid": {
                    "columns": 2
                  },
                  "gap": 16
                },
                "desktop": {
                  "grid": {
                    "columns": 2
                  },
                  "gap": 18
                }
              },
              "padding": 24
            }
          },
          {
            "id": "grid-tail",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-faq-7",
                "kind": "block",
                "enabled": true,
                "blockId": "faq-7"
              },
              {
                "id": "ref-frame-7",
                "kind": "block",
                "enabled": true,
                "blockId": "frame-7",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 3
                }
              }
            ],
            "style": {
              "gap": 14,
              "padding": 24
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-gold-night-market",
    "name": "Gold Night Market",
    "category": "gold",
    "archetype": "gold-night-market",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Prata",
        "titleColor": "#fff7e8",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#e6bd72",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#17130f",
        "gradientEnd": "#755329",
        "gradient": true,
        "angle": 223,
        "pattern": "geometric",
        "patternColor": "#fff7e8",
        "patternOpacity": 8,
        "texture": "metallic",
        "light": "flare"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-09.jpg",
            "imageOpacity": 100,
            "overlayColor": "#17130f",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 15,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#e6bd72",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e6bd72",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Gold Night Market",
            "avatarUrl": "/power-editor-samples/avatar-09.jpg",
            "initials": "GN",
            "size": 76,
            "shape": "circle",
            "borderWidth": 2,
            "borderColor": "#e6bd72",
            "shadow": 22,
            "align": "right",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "right",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Gold Night Market",
            "align": "right",
            "fontFamily": "Prata",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#fff7e8",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "none",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una presencia que transforma una visita en una conversación.",
            "align": "right",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#fff7e8",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 2,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-8-a",
                "label": "Conocer",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "premium",
                  "color": "#e6bd72",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-8-b",
                "label": "Agenda",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "outline",
                  "color": "#e6bd72",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e6bd72",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "products-8",
          "type": "products",
          "order": 5,
          "enabled": true,
          "name": "products",
          "props": {
            "layout": 2,
            "items": [
              {
                "id": "product-8-a",
                "title": "Edición selecta",
                "description": "Acceso a una experiencia principal.",
                "price": "$ —",
                "cta": "Ver detalles",
                "url": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-02.jpg"
              },
              {
                "id": "product-8-b",
                "title": "Colección privada",
                "description": "Una opción complementaria.",
                "price": "$ —",
                "cta": "Explorar",
                "url": "https://example.com",
                "imageUrl": "/power-editor-samples/banner-03.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "video-8",
          "type": "video",
          "order": 6,
          "enabled": true,
          "name": "video",
          "props": {
            "layout": "full",
            "aspectRatio": "16:9",
            "color": "#fff7e8",
            "items": [
              {
                "id": "video-8-a",
                "title": "Presentación principal",
                "url": "https://example.com/video"
              },
              {
                "id": "video-8-b",
                "title": "Detrás del proceso",
                "url": "https://example.com/process"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "contact-8",
          "type": "contact",
          "order": 7,
          "enabled": true,
          "name": "contact",
          "props": {
            "title": "Hablemos",
            "description": "Cuéntame qué quieres construir.",
            "email": "hola@example.com",
            "cta": "Enviar mensaje",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "particles-8",
          "type": "particles",
          "order": 8,
          "enabled": true,
          "name": "particles",
          "props": {
            "preset": "soft-dots",
            "quantity": 18,
            "size": 3,
            "opacity": 42,
            "speed": 9,
            "direction": "up",
            "color": "#e6bd72",
            "randomness": 70,
            "blur": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e6bd72",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ring-8",
          "type": "ring",
          "order": 9,
          "enabled": true,
          "name": "ring",
          "props": {
            "color": "#e6bd72",
            "thickness": 2,
            "size": 132,
            "partial": true,
            "position": "bottom-left",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 10,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "right",
            "gap": 12,
            "size": 18,
            "color": "#e6bd72",
            "socialStyle": "simple",
            "items": [
              {
                "id": "instagram-8",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-8",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-8",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 11,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "right",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#fff7e8",
            "opacity": 62,
            "divider": true,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e6bd72",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e6bd72",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#fff7e8",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#17130f",
                "middle": "#755329",
                "end": "#17130f",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "fixed-hero",
            "kind": "overlay",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              },
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile",
                "style": {
                  "position": {
                    "positionMode": "anchored",
                    "anchor": "bottom-center",
                    "offsetY": 22,
                    "zIndex": 7,
                    "width": 70
                  }
                }
              }
            ],
            "style": {
              "minHeight": 220,
              "overflow": "visible"
            }
          },
          {
            "id": "fixed-cta",
            "kind": "fixed",
            "enabled": true,
            "children": [
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              },
              {
                "id": "ref-contact-8",
                "kind": "block",
                "enabled": true,
                "blockId": "contact-8",
                "style": {
                  "placement": 1
                }
              }
            ],
            "style": {
              "fixed": {
                "edge": "bottom",
                "inset": 14,
                "zIndex": 16,
                "safeArea": true,
                "maxWidth": 340,
                "reserveSpace": true
              }
            }
          },
          {
            "id": "fixed-body",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading"
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-products-8",
                "kind": "block",
                "enabled": true,
                "blockId": "products-8"
              },
              {
                "id": "ref-video-8",
                "kind": "block",
                "enabled": true,
                "blockId": "video-8",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-particles-8",
                "kind": "block",
                "enabled": true,
                "blockId": "particles-8",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-ring-8",
                "kind": "block",
                "enabled": true,
                "blockId": "ring-8",
                "style": {
                  "placement": 3
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 4
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 5
                }
              }
            ],
            "style": {
              "gap": 16,
              "padding": 28
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-platinum-salon",
    "name": "Platinum Salon",
    "category": "platinum",
    "archetype": "platinum-salon",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Cormorant Garamond",
        "titleColor": "#ffffff",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#dbe8ef",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#18222d",
        "gradientEnd": "#63788b",
        "gradient": true,
        "angle": 234,
        "pattern": "lines",
        "patternColor": "#ffffff",
        "patternOpacity": 8,
        "texture": "metallic",
        "light": "spotlight"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-10.jpg",
            "imageOpacity": 100,
            "overlayColor": "#18222d",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 0,
                "gap": 9,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#dbe8ef",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Platinum Salon",
            "avatarUrl": "/power-editor-samples/avatar-10.jpg",
            "initials": "PS",
            "size": 76,
            "shape": "rounded",
            "borderWidth": 2,
            "borderColor": "#dbe8ef",
            "shadow": 22,
            "align": "center",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "center",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Platinum Salon",
            "align": "center",
            "fontFamily": "Cormorant Garamond",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#ffffff",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "uppercase",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una experiencia digital con ritmo, materia y propósito.",
            "align": "center",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#ffffff",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#dbe8ef",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 1,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-9-a",
                "label": "Reservar una conversación",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "glass",
                  "color": "#dbe8ef",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-9-b",
                "label": "Explorar colección",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "gradient",
                  "color": "#dbe8ef",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "services-9",
          "type": "services",
          "order": 5,
          "enabled": true,
          "name": "services",
          "props": {
            "layout": 2,
            "items": [
              {
                "id": "service-9-a",
                "title": "Dirección creativa",
                "description": "Sistema visual con intención.",
                "cta": "Explorar",
                "url": "https://example.com",
                "icon": "sparkles",
                "imageUrl": "/power-editor-samples/banner-03.jpg"
              },
              {
                "id": "service-9-b",
                "title": "Estrategia",
                "description": "Decisiones claras para crecer.",
                "cta": "Conocer",
                "url": "https://example.com",
                "icon": "star",
                "imageUrl": "/power-editor-samples/banner-04.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "reviews-9",
          "type": "reviews",
          "order": 6,
          "enabled": true,
          "name": "reviews",
          "props": {
            "layout": "cards",
            "featuredId": "",
            "items": [],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "booking-9",
          "type": "booking",
          "order": 7,
          "enabled": true,
          "name": "booking",
          "props": {
            "title": "Agenda una sesión",
            "description": "Elige un momento para conversar.",
            "cta": "Reservar ahora",
            "url": "https://example.com/booking",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#dbe8ef",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "ornament-9",
          "type": "ornament",
          "order": 8,
          "enabled": true,
          "name": "ornament",
          "props": {
            "preset": "gold-corner",
            "position": "top-left",
            "insetX": 16,
            "insetY": 16,
            "size": 56,
            "thickness": 2,
            "color": "#dbe8ef",
            "opacity": 78,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "frame-9",
          "type": "frame",
          "order": 9,
          "enabled": true,
          "name": "frame",
          "props": {
            "preset": "double",
            "inset": 12,
            "thickness": 1,
            "color": "#dbe8ef",
            "opacity": 44,
            "radius": 24,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 10,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "center",
            "gap": 12,
            "size": 18,
            "color": "#dbe8ef",
            "socialStyle": "glass",
            "items": [
              {
                "id": "instagram-9",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-9",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-9",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 11,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "center",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#ffffff",
            "opacity": 62,
            "divider": false,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#dbe8ef",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#dbe8ef",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#ffffff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#18222d",
                "middle": "#63788b",
                "end": "#18222d",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "journey-cover",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              }
            ],
            "style": {
              "padding": 0,
              "minHeight": 210,
              "overflow": "hidden"
            }
          },
          {
            "id": "journey-action",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              },
              {
                "id": "ref-booking-9",
                "kind": "block",
                "enabled": true,
                "blockId": "booking-9",
                "style": {
                  "placement": 1
                }
              }
            ],
            "style": {
              "padding": 24,
              "gap": 12
            }
          },
          {
            "id": "journey-intro",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile"
              },
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 2
                }
              }
            ],
            "style": {
              "padding": 28,
              "gap": 14,
              "minHeight": 200,
              "verticalAlign": "center"
            }
          },
          {
            "id": "journey-step-1",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-services-9",
                "kind": "block",
                "enabled": true,
                "blockId": "services-9"
              }
            ],
            "style": {
              "padding": 24,
              "gap": 12
            }
          },
          {
            "id": "journey-step-2",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-reviews-9",
                "kind": "block",
                "enabled": true,
                "blockId": "reviews-9"
              }
            ],
            "style": {
              "padding": 24,
              "gap": 12
            }
          },
          {
            "id": "journey-tail",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-ornament-9",
                "kind": "block",
                "enabled": true,
                "blockId": "ornament-9"
              },
              {
                "id": "ref-frame-9",
                "kind": "block",
                "enabled": true,
                "blockId": "frame-9",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 3
                }
              }
            ],
            "style": {
              "gap": 14,
              "padding": 24
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-cobalt-stream",
    "name": "Cobalt Stream",
    "category": "cobalt",
    "archetype": "cobalt-stream",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Sora",
        "titleColor": "#eef5ff",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#9cc7ff",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#101a40",
        "gradientEnd": "#315ea2",
        "gradient": true,
        "angle": 245,
        "pattern": "grid",
        "patternColor": "#eef5ff",
        "patternOpacity": 8,
        "texture": "grain",
        "light": "spotlight"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-11.jpg",
            "imageOpacity": 100,
            "overlayColor": "#101a40",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 12,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#9cc7ff",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Cobalt Stream",
            "avatarUrl": "/power-editor-samples/avatar-11.jpg",
            "initials": "CS",
            "size": 76,
            "shape": "circle",
            "borderWidth": 2,
            "borderColor": "#9cc7ff",
            "shadow": 22,
            "align": "left",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "left",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Cobalt Stream",
            "align": "left",
            "fontFamily": "Sora",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#eef5ff",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "none",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#9cc7ff",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una presencia que transforma una visita en una conversación.",
            "align": "left",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#eef5ff",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 2,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-10-a",
                "label": "Conocer",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "premium",
                  "color": "#9cc7ff",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-10-b",
                "label": "Agenda",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "outline",
                  "color": "#9cc7ff",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "video-10",
          "type": "video",
          "order": 5,
          "enabled": true,
          "name": "video",
          "props": {
            "layout": "full",
            "aspectRatio": "16:9",
            "color": "#eef5ff",
            "items": [
              {
                "id": "video-10-a",
                "title": "Presentación principal",
                "url": "https://example.com/video"
              },
              {
                "id": "video-10-b",
                "title": "Detrás del proceso",
                "url": "https://example.com/process"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "gallery-10",
          "type": "gallery",
          "order": 6,
          "enabled": true,
          "name": "gallery",
          "props": {
            "layout": 2,
            "gap": 8,
            "radius": 14,
            "aspectRatio": "1:1",
            "items": [
              {
                "id": "gallery-10-0",
                "url": "/power-editor-samples/banner-02.jpg"
              },
              {
                "id": "gallery-10-1",
                "url": "/power-editor-samples/banner-03.jpg"
              },
              {
                "id": "gallery-10-2",
                "url": "/power-editor-samples/banner-04.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#9cc7ff",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "shape-10",
          "type": "shape",
          "order": 8,
          "enabled": true,
          "name": "shape",
          "props": {
            "shape": "circle",
            "color": "#9cc7ff",
            "stroke": "#eef5ff",
            "opacity": 36,
            "size": 104,
            "rotation": 18,
            "position": "top-right",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "particles-10",
          "type": "particles",
          "order": 9,
          "enabled": true,
          "name": "particles",
          "props": {
            "preset": "soft-dots",
            "quantity": 18,
            "size": 3,
            "opacity": 42,
            "speed": 9,
            "direction": "up",
            "color": "#9cc7ff",
            "randomness": 70,
            "blur": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 10,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "left",
            "gap": 12,
            "size": 18,
            "color": "#9cc7ff",
            "socialStyle": "simple",
            "items": [
              {
                "id": "instagram-10",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-10",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-10",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#9cc7ff",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 11,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "left",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#eef5ff",
            "opacity": 62,
            "divider": true,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#9cc7ff",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#9cc7ff",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#eef5ff",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#101a40",
                "middle": "#315ea2",
                "end": "#101a40",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "grid-cover",
            "kind": "section",
            "enabled": true,
            "children": [
              {
                "id": "ref-banner",
                "kind": "block",
                "enabled": true,
                "blockId": "banner"
              }
            ],
            "style": {
              "padding": 0,
              "minHeight": 190,
              "overflow": "hidden"
            }
          },
          {
            "id": "grid-intro",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-links",
                "kind": "block",
                "enabled": true,
                "blockId": "links"
              },
              {
                "id": "ref-profile",
                "kind": "block",
                "enabled": true,
                "blockId": "profile"
              },
              {
                "id": "ref-heading",
                "kind": "block",
                "enabled": true,
                "blockId": "heading",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-subtitle",
                "kind": "block",
                "enabled": true,
                "blockId": "subtitle",
                "style": {
                  "placement": 2
                }
              }
            ],
            "style": {
              "gap": 12,
              "padding": 24
            }
          },
          {
            "id": "grid-gallery",
            "kind": "grid",
            "enabled": true,
            "children": [
              {
                "id": "ref-socials",
                "kind": "block",
                "enabled": true,
                "blockId": "socials",
                "style": {
                  "placement": {
                    "columnStart": 1,
                    "columnSpan": 1
                  }
                }
              }
            ],
            "style": {
              "grid": {
                "columns": 2,
                "autoFlow": "row"
              },
              "responsive": {
                "mobile": {
                  "grid": {
                    "columns": 1
                  },
                  "gap": 12
                },
                "tablet": {
                  "grid": {
                    "columns": 2
                  },
                  "gap": 16
                },
                "desktop": {
                  "grid": {
                    "columns": 2
                  },
                  "gap": 18
                }
              },
              "padding": 24
            }
          },
          {
            "id": "grid-tail",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-shape-10",
                "kind": "block",
                "enabled": true,
                "blockId": "shape-10"
              },
              {
                "id": "ref-particles-10",
                "kind": "block",
                "enabled": true,
                "blockId": "particles-10",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 2
                }
              }
            ],
            "style": {
              "gap": 14,
              "padding": 24
            }
          }
        ]
      }
    }
  },
  {
    "id": "power-emerald-journal",
    "name": "Emerald Journal",
    "category": "emerald",
    "archetype": "emerald-journal",
    "pageConfig": {
      "version": 6,
      "profile": "premium",
      "capabilities": {
        "maxLinks": 40,
        "allowVideos": true,
        "allowCards": true,
        "allowSocials": true,
        "allowGallery": true,
        "allowAdvancedStyles": true,
        "allowAdvancedLayouts": true,
        "allowProducts": true,
        "allowBooking": true,
        "allowDecorations": true,
        "allowParticles": true,
        "allowAnimations": true,
        "allowResponsive": true,
        "allowPresets": true,
        "allowImportExport": true,
        "canRemoveCripqerBranding": true
      },
      "branding": {
        "showCripqerWatermark": true
      },
      "theme": {
        "fontFamily": "Libre Baskerville",
        "titleColor": "#f2f6ef",
        "fontSize": 30,
        "fontWeight": 800,
        "buttonColor": "#e2c27d",
        "buttonRadius": 16,
        "buttonGap": 12,
        "buttonHeight": 48,
        "buttonPaddingX": 18,
        "buttonPaddingY": 11,
        "titleShadow": 12
      },
      "background": {
        "base": "#102d29",
        "gradientEnd": "#39745d",
        "gradient": true,
        "angle": 256,
        "pattern": "waves",
        "patternColor": "#f2f6ef",
        "patternOpacity": 8,
        "texture": "paper",
        "light": "radial"
      },
      "presets": [],
      "blocks": [
        {
          "id": "banner",
          "type": "banner",
          "order": 0,
          "enabled": true,
          "name": "banner",
          "props": {
            "height": 164,
            "imageUrl": "/power-editor-samples/banner-12.jpg",
            "imageOpacity": 100,
            "overlayColor": "#102d29",
            "overlayOpacity": 30,
            "blend": "soft",
            "blendStrength": 52,
            "fusionMode": "soft",
            "fusionDepth": 50,
            "fusionStrength": 100,
            "fit": "cover",
            "positionX": 50,
            "positionY": 50,
            "radius": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 0,
                "gap": 15,
                "width": 100,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "none",
                "width": 0,
                "color": "#e2c27d",
                "opacity": 61,
                "radius": 26
              },
              "shadow": {
                "preset": "none",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "profile",
          "type": "profile",
          "order": 1,
          "enabled": true,
          "name": "profile",
          "props": {
            "logo": "Emerald Journal",
            "avatarUrl": "/power-editor-samples/avatar-12.jpg",
            "initials": "EJ",
            "size": 76,
            "shape": "circle",
            "borderWidth": 2,
            "borderColor": "#e2c27d",
            "shadow": 22,
            "align": "center",
            "verticalPosition": "transition",
            "overlap": 34,
            "logoWidth": 150,
            "logoAlign": "center",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 28,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e2c27d",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "heading",
          "type": "heading",
          "order": 2,
          "enabled": true,
          "name": "heading",
          "props": {
            "text": "Emerald Journal",
            "align": "center",
            "fontFamily": "Libre Baskerville",
            "fontSize": 30,
            "fontWeight": 800,
            "color": "#f2f6ef",
            "letterSpacing": -0.8,
            "lineHeight": 1.04,
            "transform": "none",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 39,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "subtitle",
          "type": "text",
          "order": 3,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Una experiencia digital con ritmo, materia y propósito.",
            "align": "center",
            "fontFamily": "Inter",
            "fontSize": 13,
            "color": "#f2f6ef",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 50,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "links",
          "type": "links",
          "order": 4,
          "enabled": true,
          "name": "links",
          "props": {
            "layout": 1,
            "linkStyleMode": "individual",
            "items": [
              {
                "id": "cta-11-a",
                "label": "Reservar una conversación",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "glass",
                  "color": "#e2c27d",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              },
              {
                "id": "cta-11-b",
                "label": "Explorar colección",
                "url": "https://example.com",
                "enabled": true,
                "style": {
                  "variant": "outline",
                  "color": "#e2c27d",
                  "textColor": "#ffffff",
                  "radius": 16,
                  "shadow": 18
                }
              }
            ],
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 61,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "note-11",
          "type": "text",
          "order": 5,
          "enabled": true,
          "name": "text",
          "props": {
            "text": "Un espacio editorial pensado para una presencia clara, memorable y propia.",
            "align": "left",
            "fontFamily": "Inter",
            "color": "#f2f6ef",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e2c27d",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "faq-11",
          "type": "faq",
          "order": 6,
          "enabled": true,
          "name": "faq",
          "props": {
            "layout": 1,
            "items": [
              {
                "id": "faq-11-a",
                "title": "¿Cómo empezamos?",
                "description": "Con una conversación breve y objetivos claros."
              },
              {
                "id": "faq-11-b",
                "title": "¿Qué incluye?",
                "description": "Una experiencia diseñada alrededor de tu marca."
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "map-11",
          "type": "map",
          "order": 7,
          "enabled": true,
          "name": "map",
          "props": {
            "title": "Estudio",
            "address": "Ubicación por definir",
            "cta": "Ver ubicación",
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 50,
                "radius": 12
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "float",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": true
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "gallery-11",
          "type": "gallery",
          "order": 8,
          "enabled": true,
          "name": "gallery",
          "props": {
            "layout": 3,
            "gap": 8,
            "radius": 14,
            "aspectRatio": "1:1",
            "items": [
              {
                "id": "gallery-11-0",
                "url": "/power-editor-samples/banner-03.jpg"
              },
              {
                "id": "gallery-11-1",
                "url": "/power-editor-samples/banner-04.jpg"
              },
              {
                "id": "gallery-11-2",
                "url": "/power-editor-samples/banner-05.jpg"
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 61,
                "radius": 19
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "separator-11",
          "type": "separator",
          "order": 9,
          "enabled": true,
          "name": "separator",
          "props": {
            "dividerStyle": "double",
            "color": "#e2c27d",
            "width": 1,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 28,
                "radius": 26
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e2c27d",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": true,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "gold-glow",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "frame-11",
          "type": "frame",
          "order": 10,
          "enabled": true,
          "name": "frame",
          "props": {
            "preset": "double",
            "inset": 12,
            "thickness": 1,
            "color": "#e2c27d",
            "opacity": 44,
            "radius": 24,
            "style": {
              "composition": {
                "marginTop": 10,
                "marginBottom": 0,
                "padding": 12,
                "gap": 9,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 39,
                "radius": 12
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "particles-11",
          "type": "particles",
          "order": 11,
          "enabled": true,
          "name": "particles",
          "props": {
            "preset": "sparkle",
            "quantity": 18,
            "size": 3,
            "opacity": 42,
            "speed": 9,
            "direction": "down",
            "color": "#e2c27d",
            "randomness": 70,
            "blur": 0,
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 50,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "normal",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "socials",
          "type": "socials",
          "order": 12,
          "enabled": true,
          "name": "socials",
          "props": {
            "align": "center",
            "gap": 12,
            "size": 18,
            "color": "#e2c27d",
            "socialStyle": "glass",
            "items": [
              {
                "id": "instagram-11",
                "network": "instagram",
                "url": "https://instagram.com",
                "enabled": true
              },
              {
                "id": "website-11",
                "network": "website",
                "url": "https://example.com",
                "enabled": true
              },
              {
                "id": "email-11",
                "network": "email",
                "url": "mailto:hola@example.com",
                "enabled": true
              }
            ],
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 12,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 28,
                "radius": 19
              },
              "shadow": {
                "preset": "soft",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "gold",
                "color": "#e2c27d",
                "intensity": 32,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": true,
                "type": "radial",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "vignette",
              "blendMode": "normal",
              "mask": "rounded",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        },
        {
          "id": "footer",
          "type": "footer",
          "order": 13,
          "enabled": true,
          "name": "footer",
          "props": {
            "topText": "",
            "bottomText": "Una plantilla Cripqer",
            "align": "center",
            "fontFamily": "DM Mono",
            "fontSize": 8,
            "color": "#f2f6ef",
            "opacity": 62,
            "divider": false,
            "preset": "minimal",
            "style": {
              "composition": {
                "marginTop": 18,
                "marginBottom": 0,
                "padding": 12,
                "gap": 15,
                "width": 92,
                "maxWidth": 100,
                "minHeight": 0,
                "align": "center",
                "verticalAlign": "top",
                "columns": 1,
                "translateX": 0,
                "translateY": 0,
                "snap": true
              },
              "border": {
                "style": "solid",
                "width": 1,
                "color": "#e2c27d",
                "opacity": 39,
                "radius": 26
              },
              "shadow": {
                "preset": "premium",
                "x": 0,
                "y": 10,
                "blur": 28,
                "spread": 0,
                "color": "#000000",
                "opacity": 32
              },
              "glow": {
                "preset": "none",
                "color": "#e2c27d",
                "intensity": 0,
                "blur": 18,
                "spread": 1
              },
              "glass": {
                "enabled": false,
                "transparency": 18,
                "blur": 14,
                "tint": "#f2f6ef",
                "borderOpacity": 18,
                "highlight": 20
              },
              "gradient": {
                "enabled": false,
                "type": "linear",
                "start": "#102d29",
                "middle": "#39745d",
                "end": "#102d29",
                "angle": 135,
                "position": 50
              },
              "filters": {
                "brightness": 100,
                "contrast": 100,
                "saturation": 100,
                "blur": 0,
                "grayscale": 0,
                "opacity": 100
              },
              "effectPreset": "none",
              "blendMode": "soft-light",
              "mask": "none",
              "motion": {
                "preset": "none",
                "duration": 9000,
                "delay": 0,
                "intensity": 1,
                "loop": false
              },
              "responsive": {
                "mobile": {},
                "tablet": {},
                "desktop": {}
              }
            }
          }
        }
      ],
      "composition": {
        "id": "root",
        "kind": "root",
        "enabled": true,
        "children": [
          {
            "id": "split-layout",
            "kind": "row",
            "enabled": true,
            "children": [
              {
                "id": "split-left",
                "kind": "column",
                "enabled": true,
                "children": [
                  {
                    "id": "ref-banner",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "banner"
                  },
                  {
                    "id": "ref-faq-11",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "faq-11",
                    "style": {
                      "placement": 1
                    }
                  },
                  {
                    "id": "ref-map-11",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "map-11",
                    "style": {
                      "placement": 2
                    }
                  }
                ],
                "style": {
                  "gap": 16
                }
              },
              {
                "id": "split-right",
                "kind": "column",
                "enabled": true,
                "children": [
                  {
                    "id": "ref-links",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "links"
                  },
                  {
                    "id": "ref-heading",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "heading"
                  },
                  {
                    "id": "ref-note-11",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "note-11",
                    "style": {
                      "placement": 1
                    }
                  },
                  {
                    "id": "ref-socials",
                    "kind": "block",
                    "enabled": true,
                    "blockId": "socials"
                  }
                ],
                "style": {
                  "gap": 16,
                  "justify": "center"
                }
              }
            ],
            "style": {
              "split": {
                "direction": "row",
                "tracks": [
                  50,
                  50
                ],
                "collapse": "stack",
                "minColumnWidth": 180
              },
              "responsive": {
                "mobile": {
                  "gap": 18
                },
                "tablet": {
                  "gap": 20
                },
                "desktop": {
                  "gap": 24
                }
              },
              "padding": 22
            }
          },
          {
            "id": "split-tail",
            "kind": "stack",
            "enabled": true,
            "children": [
              {
                "id": "ref-separator-11",
                "kind": "block",
                "enabled": true,
                "blockId": "separator-11"
              },
              {
                "id": "ref-frame-11",
                "kind": "block",
                "enabled": true,
                "blockId": "frame-11",
                "style": {
                  "placement": 1
                }
              },
              {
                "id": "ref-particles-11",
                "kind": "block",
                "enabled": true,
                "blockId": "particles-11",
                "style": {
                  "placement": 2
                }
              },
              {
                "id": "ref-footer",
                "kind": "block",
                "enabled": true,
                "blockId": "footer",
                "style": {
                  "placement": 3
                }
              }
            ],
            "style": {
              "gap": 16,
              "padding": 24
            }
          }
        ]
      }
    }
  }
] as unknown as readonly GeneratedRecipe[];
