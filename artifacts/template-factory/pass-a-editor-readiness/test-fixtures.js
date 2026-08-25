// PASS A TEST FIXTURES
// Representative TemplateConfig fixtures for testing 1-5 button configurations

const FIXTURES = {
  fixture1Button: {
    schemaVersion: 1,
    identity: {
      logoText: 'Dr. Silva',
      subtitleText: 'MÉDICO GENERAL',
      titleText: 'DR. CARLOS SILVA',
      profileImg: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
      bannerImg: ''
    },
    socials: {
      enabled: true,
      displayMode: 'icons',
      items: [
        {
          id: 'social_fixture_1',
          platform: 'whatsapp',
          label: 'WhatsApp',
          url: 'https://wa.me/1234567890',
          iconId: 'whatsapp',
          enabled: true
        }
      ]
    },
    content: {
      footerText: 'Haga clic para agendar'
    },
    links: [
      { id: 'f1_b1', text: 'Agendar Consulta', icon: 'fa-solid fa-calendar-check', url: 'https://example.com/schedule', fullWidth: true }
    ],
    appearance: {
      bgImage: '',
      bgOverlay: 0,
      bgStart: '#001f3f',
      bgMid: '#002b59',
      bgEnd: '#001122',
      bgAngle: 180,
      btnBgStart: '#003366',
      btnBgEnd: '#001f3f',
      btnBorderColor: '#0074D9',
      accentBgStart: '#7FDBFF',
      accentBgEnd: '#39CCCC',
      accentIconColor: '#001f3f',
      btnTextColor: '#FFFFFF',
      fontLogo: "'Playfair Display', serif",
      fontHeading: "'Poppins', sans-serif",
      fontSubtitle: "'Poppins', sans-serif",
      fontBody: "'Inter', sans-serif",
      themeId: 'executive-blue',
      btnPresetId: 'glass',
      textPrimary: '#FFFFFF',
      textSubtitle: '#7FDBFF',
      profileBorderColor: '#7FDBFF',
      profileRadius: '50%',
      btnRadius: '16px',
      banner: {
        enabled: true,
        heightPreset: 'medium',
        positionY: 50,
        imageOpacity: 90,
        fusionPreset: 'medium',
        fusionStrength: 70
      }
    },
    layout: {
      gridCols: 1,
      profileBorder: 4,
      profileSize: 170,
      logoSize: 3.2,
      titleSize: 2.2,
      devicePreview: 'mobile'
    }
  },

  fixture2Buttons: {
    schemaVersion: 1,
    identity: {
      logoText: 'LegalPro',
      subtitleText: 'ABOGADA',
      titleText: 'DRA. ANA MARTÍNEZ',
      profileImg: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      bannerImg: ''
    },
    socials: {
      enabled: true,
      displayMode: 'icons',
      items: [
        {
          id: 'social_fixture_2a',
          platform: 'linkedin',
          label: 'LinkedIn',
          url: 'https://linkedin.com/in/anamartinez',
          iconId: 'linkedin',
          enabled: true
        },
        {
          id: 'social_fixture_2b',
          platform: 'email',
          label: 'Email',
          url: 'contacto@anamartinez.com',
          iconId: 'email',
          enabled: true
        }
      ]
    },
    content: {
      footerText: 'Consulta inicial gratuita'
    },
    links: [
      { id: 'f2_b1', text: 'Agendar Cita', icon: 'fa-solid fa-calendar', url: 'https://example.com/appointment', fullWidth: false },
      { id: 'f2_b2', text: 'Consultas', icon: 'fa-solid fa-gavel', url: 'https://example.com/services', fullWidth: false }
    ],
    appearance: {
      bgImage: '',
      bgOverlay: 0,
      bgStart: '#4a0404',
      bgMid: '#5c0606',
      bgEnd: '#330202',
      bgAngle: 180,
      btnBgStart: '#6e0909',
      btnBgEnd: '#4a0404',
      btnBorderColor: '#e5b382',
      accentBgStart: '#e5b382',
      accentBgEnd: '#c49364',
      accentIconColor: '#4a0404',
      btnTextColor: '#FFFFFF',
      fontLogo: "'Cinzel', serif",
      fontHeading: "'Oswald', sans-serif",
      fontSubtitle: "'Oswald', sans-serif",
      fontBody: "'Inter', sans-serif",
      themeId: 'burgundy-elegant',
      btnPresetId: 'premium',
      textPrimary: '#FFFFFF',
      textSubtitle: '#e5b382',
      profileBorderColor: '#e5b382',
      profileRadius: '50%',
      btnRadius: '9999px',
      banner: {
        enabled: true,
        heightPreset: 'medium',
        positionY: 50,
        imageOpacity: 85,
        fusionPreset: 'deep',
        fusionStrength: 90
      }
    },
    layout: {
      gridCols: 2,
      profileBorder: 4,
      profileSize: 170,
      logoSize: 3.2,
      titleSize: 2.2,
      devicePreview: 'mobile'
    }
  },

  fixture3Buttons: {
    schemaVersion: 1,
    identity: {
      logoText: 'La Cocina',
      subtitleText: 'RESTAURANTE',
      titleText: 'CHEF RICARDO LÓPEZ',
      profileImg: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400',
      bannerImg: ''
    },
    socials: {
      enabled: true,
      displayMode: 'icons',
      items: [
        {
          id: 'social_fixture_3a',
          platform: 'instagram',
          label: 'Instagram',
          url: 'https://instagram.com/lacocinarestaurante',
          iconId: 'instagram',
          enabled: true
        },
        {
          id: 'social_fixture_3b',
          platform: 'facebook',
          label: 'Facebook',
          url: 'https://facebook.com/lacocina',
          iconId: 'facebook',
          enabled: true
        }
      ]
    },
    content: {
      footerText: 'Reserva tu mesa hoy'
    },
    links: [
      { id: 'f3_b1', text: 'Menú', icon: 'fa-solid fa-utensils', url: 'https://example.com/menu', fullWidth: false },
      { id: 'f3_b2', text: 'Reservar', icon: 'fa-solid fa-calendar-days', url: 'https://example.com/reserve', fullWidth: false },
      { id: 'f3_b3', text: 'Ubicación', icon: 'fa-solid fa-location-dot', url: 'https://maps.google.com', fullWidth: true }
    ],
    appearance: {
      bgImage: '',
      bgOverlay: 0,
      bgStart: '#042A2B',
      bgMid: '#063A3C',
      bgEnd: '#021A1B',
      bgAngle: 180,
      btnBgStart: '#084A4D',
      btnBgEnd: '#053133',
      btnBorderColor: '#D4AF37',
      accentBgStart: '#D4AF37',
      accentBgEnd: '#B5952F',
      accentIconColor: '#042A2B',
      btnTextColor: '#FFFFFF',
      fontLogo: "'Playfair Display', serif",
      fontHeading: "'Montserrat', sans-serif",
      fontSubtitle: "'Montserrat', sans-serif",
      fontBody: "'Poppins', sans-serif",
      themeId: 'emerald-luxury',
      btnPresetId: 'solid',
      textPrimary: '#FFFFFF',
      textSubtitle: '#E8D595',
      profileBorderColor: '#D4AF37',
      profileRadius: '24px',
      btnRadius: '16px',
      banner: {
        enabled: true,
        heightPreset: 'medium',
        positionY: 50,
        imageOpacity: 85,
        fusionPreset: 'deep',
        fusionStrength: 85
      }
    },
    layout: {
      gridCols: 2,
      profileBorder: 3,
      profileSize: 160,
      logoSize: 3.5,
      titleSize: 2.0,
      devicePreview: 'mobile'
    }
  },

  fixture4Buttons: {
    schemaVersion: 1,
    identity: {
      logoText: 'StyleCut',
      subtitleText: 'BARBERÍA',
      titleText: 'JUAN RAMÍREZ',
      profileImg: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400',
      bannerImg: ''
    },
    socials: {
      enabled: true,
      displayMode: 'icons',
      items: [
        {
          id: 'social_fixture_4a',
          platform: 'instagram',
          label: 'Instagram',
          url: 'https://instagram.com/stylecut',
          iconId: 'instagram',
          enabled: true
        },
        {
          id: 'social_fixture_4b',
          platform: 'whatsapp',
          label: 'WhatsApp',
          url: 'https://wa.me/9876543210',
          iconId: 'whatsapp',
          enabled: true
        },
        {
          id: 'social_fixture_4c',
          platform: 'tiktok',
          label: 'TikTok',
          url: 'https://tiktok.com/@stylecut',
          iconId: 'tiktok',
          enabled: true
        }
      ]
    },
    content: {
      footerText: 'Agenda tu corte ahora'
    },
    links: [
      { id: 'f4_b1', text: 'Agendar', icon: 'fa-solid fa-scissors', url: 'https://example.com/book', fullWidth: false },
      { id: 'f4_b2', text: 'Servicios', icon: 'fa-solid fa-list', url: 'https://example.com/services', fullWidth: false },
      { id: 'f4_b3', text: 'Galería', icon: 'fa-solid fa-images', url: 'https://example.com/gallery', fullWidth: false },
      { id: 'f4_b4', text: 'Ubicación', icon: 'fa-solid fa-map-location-dot', url: 'https://maps.google.com', fullWidth: false }
    ],
    appearance: {
      bgImage: '',
      bgOverlay: 0,
      bgStart: '#2b2b2b',
      bgMid: '#333333',
      bgEnd: '#1a1a1a',
      bgAngle: 180,
      btnBgStart: '#444444',
      btnBgEnd: '#2b2b2b',
      btnBorderColor: '#555555',
      accentBgStart: '#ffffff',
      accentBgEnd: '#e0e0e0',
      accentIconColor: '#111111',
      btnTextColor: '#FFFFFF',
      fontLogo: "'Oswald', sans-serif",
      fontHeading: "'Oswald', sans-serif",
      fontSubtitle: "'Oswald', sans-serif",
      fontBody: "'Poppins', sans-serif",
      themeId: 'graphite',
      btnPresetId: 'outline',
      textPrimary: '#FFFFFF',
      textSubtitle: '#a0a0a0',
      profileBorderColor: '#555555',
      profileRadius: '0px',
      btnRadius: '0px',
      banner: {
        enabled: true,
        heightPreset: 'medium',
        positionY: 50,
        imageOpacity: 70,
        fusionPreset: 'medium',
        fusionStrength: 75
      }
    },
    layout: {
      gridCols: 2,
      profileBorder: 2,
      profileSize: 150,
      logoSize: 3.8,
      titleSize: 2.4,
      devicePreview: 'mobile'
    }
  },

  fixture5Buttons: {
    schemaVersion: 1,
    identity: {
      logoText: 'Vanesa',
      subtitleText: 'CONSULTORA',
      titleText: 'VANESA ALVES',
      profileImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      bannerImg: ''
    },
    socials: {
      enabled: true,
      displayMode: 'icons',
      items: [
        {
          id: 'social_fixture_5a',
          platform: 'instagram',
          label: 'Instagram',
          url: 'https://instagram.com/vanesaalves',
          iconId: 'instagram',
          enabled: true
        },
        {
          id: 'social_fixture_5b',
          platform: 'linkedin',
          label: 'LinkedIn',
          url: 'https://linkedin.com/in/vanesaalves',
          iconId: 'linkedin',
          enabled: true
        },
        {
          id: 'social_fixture_5c',
          platform: 'email',
          label: 'Email',
          url: 'vanesa@consultora.com',
          iconId: 'email',
          enabled: true
        },
        {
          id: 'social_fixture_5d',
          platform: 'website',
          label: 'Website',
          url: 'https://vanesaalves.com',
          iconId: 'website',
          enabled: true
        }
      ]
    },
    content: {
      footerText: 'Clique para interagir'
    },
    links: [
      { id: 'f5_b1', text: 'Facebook', icon: 'fa-brands fa-facebook-f', url: 'https://facebook.com/vanesa', fullWidth: true },
      { id: 'f5_b2', text: 'Instagram', icon: 'fa-brands fa-instagram', url: 'https://instagram.com/vanesa', fullWidth: false },
      { id: 'f5_b3', text: 'E-mail', icon: 'fa-regular fa-envelope', url: 'mailto:vanesa@example.com', fullWidth: false },
      { id: 'f5_b4', text: 'Whatsapp', icon: 'fa-brands fa-whatsapp', url: 'https://wa.me/123456789', fullWidth: false },
      { id: 'f5_b5', text: 'Localización', icon: 'fa-solid fa-location-dot', url: 'https://maps.google.com', fullWidth: false }
    ],
    appearance: {
      bgImage: '',
      bgOverlay: 0,
      bgStart: '#95547B',
      bgMid: '#B46A94',
      bgEnd: '#8C476E',
      bgAngle: 180,
      btnBgStart: '#ffffff',
      btnBgEnd: '#ffffff',
      btnBorderColor: '#ffffff',
      accentBgStart: '#f5d1e6',
      accentBgEnd: '#e0a3c7',
      accentIconColor: '#5c2d47',
      btnTextColor: '#ffffff',
      fontLogo: "'Cinzel', serif",
      fontHeading: "'Oswald', sans-serif",
      fontSubtitle: "'Oswald', sans-serif",
      fontBody: "'Inter', sans-serif",
      themeId: 'custom',
      btnPresetId: 'glass',
      textPrimary: '#FFFFFF',
      textSubtitle: '#2C2C2C',
      profileBorderColor: '#5c2d47',
      profileRadius: '50%',
      btnRadius: '9999px',
      banner: {
        enabled: true,
        heightPreset: 'medium',
        positionY: 50,
        imageOpacity: 100,
        fusionPreset: 'soft',
        fusionStrength: 60
      }
    },
    layout: {
      gridCols: 2,
      profileBorder: 4,
      profileSize: 170,
      logoSize: 3.2,
      titleSize: 2.2,
      devicePreview: 'mobile'
    }
  }
};

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FIXTURES;
}
