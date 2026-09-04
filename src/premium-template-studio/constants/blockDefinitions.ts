import type { BlockType, TemplateBlock } from "../types";
import { uid } from "../utils";

/**
 * BLOCK EXTENSION POINT
 * 1. Add the type to `BlockType`
 * 2. Add a definition below (icon name + defaults)
 * 3. Register a renderer in engine/BlockRegistry.tsx
 * 4. Add inspector fields in components/inspector/BlockInspector.tsx
 */

export interface BlockDefinition {
  type: BlockType;
  name: string;
  description: string;
  icon: string; // lucide-react icon name
  group: "Content" | "Media" | "Actions" | "Structure";
  variants: string[];
  defaults: () => Omit<TemplateBlock, "id">;
}

const visibility = { desktop: true, tablet: true, mobile: true };

function base(
  type: BlockType,
  variant: string,
  content: TemplateBlock["content"],
  layout: TemplateBlock["layout"] = {},
): Omit<TemplateBlock, "id"> {
  return {
    type,
    variant,
    content,
    style: {},
    layout: { width: "content", align: "center", span: 2, ...layout },
    visibility: { ...visibility },
    interaction: { newTab: true },
  };
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "heading",
    name: "Heading",
    description: "Section title with optional subtitle",
    icon: "Heading1",
    group: "Content",
    variants: ["default", "eyebrow", "divider"],
    defaults: () => base("heading", "default", { title: "Section title", subtitle: "" }),
  },
  {
    type: "text",
    name: "Text",
    description: "Paragraph of rich, plain text",
    icon: "Type",
    group: "Content",
    variants: ["default", "quote", "boxed"],
    defaults: () =>
      base("text", "default", {
        body: "Write something that makes people want to stay a little longer.",
      }),
  },
  {
    type: "links",
    name: "Links",
    description: "Stacked list of destination buttons",
    icon: "Link2",
    group: "Actions",
    variants: ["stacked", "glass", "cards", "list"],
    defaults: () =>
      base("links", "stacked", {
        title: "Links",
        items: [{ id: uid("link"), label: "My website", url: "https://example.com", newTab: true }],
      }),
  },
  {
    type: "featuredLink",
    name: "Featured link",
    description: "Large highlighted destination with image",
    icon: "Star",
    group: "Actions",
    variants: ["cover", "side", "banner"],
    defaults: () =>
      base("featuredLink", "cover", {
        title: "Featured project",
        subtitle: "Case study · 2026",
        url: "https://example.com",
        imageUrl:
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=70",
      }),
  },
  {
    type: "buttonGroup",
    name: "Button group",
    description: "Row of compact side-by-side actions",
    icon: "SquareStack",
    group: "Actions",
    variants: ["row", "split"],
    defaults: () =>
      base("buttonGroup", "row", {
        items: [
          { id: uid("btn"), label: "Contact", url: "mailto:hello@example.com" },
          { id: uid("btn"), label: "Portfolio", url: "https://example.com" },
        ],
      }),
  },
  {
    type: "cta",
    name: "Call to action",
    description: "Persuasive panel with a primary action",
    icon: "Megaphone",
    group: "Actions",
    variants: ["panel", "inline", "gradient"],
    defaults: () =>
      base("cta", "panel", {
        title: "Let's work together",
        body: "Currently taking on new projects for the next quarter.",
        label: "Book a call",
        url: "https://cal.com",
      }),
  },
  {
    type: "social",
    name: "Social icons",
    description: "Icon row linking your social profiles",
    icon: "Share2",
    group: "Actions",
    variants: ["icons", "pills", "outline"],
    defaults: () =>
      base("social", "icons", {
        socials: [
          { id: uid("soc"), platform: "instagram", url: "https://instagram.com" },
          { id: uid("soc"), platform: "linkedin", url: "https://linkedin.com" },
        ],
      }),
  },
  {
    type: "video",
    name: "Video",
    description: "YouTube or Vimeo embed, safely sandboxed",
    icon: "Play",
    group: "Media",
    variants: ["embed", "card"],
    defaults: () =>
      base(
        "video",
        "embed",
        { title: "Showreel", provider: "youtube", videoId: "ScMzIvxBSi4" },
        { span: 1, aspect: "video" },
      ),
  },
  {
    type: "image",
    name: "Image",
    description: "Single responsive image",
    icon: "Image",
    group: "Media",
    variants: ["plain", "framed", "full"],
    defaults: () =>
      base(
        "image",
        "framed",
        {
          imageUrl:
            "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=70",
          alt: "Image",
        },
        { span: 1, aspect: "square" },
      ),
  },
  {
    type: "gallery",
    name: "Gallery",
    description: "Grid of images",
    icon: "LayoutGrid",
    group: "Media",
    variants: ["grid", "mosaic"],
    defaults: () =>
      base(
        "gallery",
        "grid",
        {
          title: "Gallery",
          images: [
            {
              id: uid("img"),
              url: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=600&q=70",
            },
            {
              id: uid("img"),
              url: "https://images.unsplash.com/photo-1517840901100-8179e982acb7?auto=format&fit=crop&w=600&q=70",
            },
            {
              id: uid("img"),
              url: "https://images.unsplash.com/photo-1526779259212-939e64788e3c?auto=format&fit=crop&w=600&q=70",
            },
          ],
        },
        { columns: 3, gap: 8 },
      ),
  },
  {
    type: "mediaCard",
    name: "Media card",
    description: "Image plus copy in a compact card",
    icon: "GalleryVerticalEnd",
    group: "Media",
    variants: ["cover", "row"],
    defaults: () =>
      base(
        "mediaCard",
        "cover",
        {
          title: "Behind the studio",
          body: "A short look at how the work gets made.",
          imageUrl:
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=70",
          url: "https://example.com",
        },
        { span: 1 },
      ),
  },
  {
    type: "portfolio",
    name: "Portfolio grid",
    description: "Projects grid with titles and links",
    icon: "Frame",
    group: "Media",
    variants: ["grid", "cards"],
    defaults: () =>
      base(
        "portfolio",
        "grid",
        {
          title: "Selected work",
          items: [
            {
              id: uid("pf"),
              label: "Nova Rebrand",
              description: "Identity",
              url: "https://example.com",
              imageUrl:
                "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=600&q=70",
            },
            {
              id: uid("pf"),
              label: "Atlas App",
              description: "Product",
              url: "https://example.com",
              imageUrl:
                "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=70",
            },
          ],
        },
        { columns: 2, gap: 10 },
      ),
  },
  {
    type: "document",
    name: "Document",
    description: "Downloadable PDF, deck or media kit",
    icon: "FileText",
    group: "Content",
    variants: ["row", "card"],
    defaults: () =>
      base("document", "row", {
        title: "Media Kit 2026",
        fileName: "media-kit.pdf",
        fileSize: "2.4 MB",
        url: "https://example.com/media-kit.pdf",
      }),
  },
  {
    type: "contact",
    name: "Contact",
    description: "Email, phone and location details",
    icon: "Mail",
    group: "Content",
    variants: ["card", "list"],
    defaults: () =>
      base("contact", "card", {
        title: "Contact",
        email: "hello@example.com",
        phone: "+1 555 0100",
        address: "Barcelona, Spain",
      }),
  },
  {
    type: "qr",
    name: "QR code",
    description: "Scannable code for your page or link",
    icon: "QrCode",
    group: "Content",
    variants: ["card", "plain"],
    defaults: () =>
      base("qr", "card", { title: "Scan profile", url: "https://example.com" }, { span: 1 }),
  },
  {
    type: "trust",
    name: "Trust badges",
    description: "Verification and credibility indicators",
    icon: "BadgeCheck",
    group: "Content",
    variants: ["row", "cards"],
    defaults: () =>
      base("trust", "row", {
        badges: [
          { id: uid("bdg"), label: "Verified profile", icon: "BadgeCheck" },
          { id: uid("bdg"), label: "Responds in 24h", icon: "Clock" },
        ],
      }),
  },
  {
    type: "hero",
    name: "Premium Hero",
    description: "Introductory visual showcase with CTAs and image backgrounds",
    icon: "LayoutTemplate",
    group: "Content",
    variants: ["centered", "split", "editorial", "full-image"],
    defaults: () =>
      base(
        "hero",
        "centered",
        {
          eyebrow: "Creative Director",
          title: "Sofía Rivera",
          subtitle: "Digital experiences for modern brands",
          description: "Diseño productos y experiencias digitales.",
          avatar: {
            url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            size: 112,
            overlap: 48,
            radius: 9999,
            borderWidth: 4,
            shadow: "soft",
          },
          bannerImage: {
            url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200",
            blur: 0,
          },
          backgroundImage: {
            url: "",
            blur: 0,
          },
          badge: {
            enabled: true,
            label: "Verified",
          },
          primaryCTA: {
            label: "Contactar",
            url: "/contact",
            icon: "Mail",
          },
          secondaryCTA: {
            label: "Portfolio",
            url: "/portfolio",
            icon: "ArrowRight",
          },
        },
        { width: "full", span: 2 },
      ),
  },
  {
    type: "divider",
    name: "Divider",
    description: "Subtle separation between sections",
    icon: "Minus",
    group: "Structure",
    variants: ["line", "dots", "label"],
    defaults: () => base("divider", "line", { label: "" }),
  },
  {
    type: "spacer",
    name: "Spacer",
    description: "Vertical breathing room",
    icon: "MoveVertical",
    group: "Structure",
    variants: ["default"],
    defaults: () => base("spacer", "default", { height: 24 }),
  },
  {
    type: "stats",
    name: "Stats",
    description: "Key metrics and numbers",
    icon: "Award",
    group: "Content",
    variants: ["minimal", "cards", "glass", "highlight"],
    defaults: () =>
      base("stats", "cards", {
        items: [
          { id: uid("stat"), value: "10K+", label: "Clients", icon: "Award" },
          { id: uid("stat"), value: "4.9", label: "Rating", icon: "Star" },
          { id: uid("stat"), value: "8 Years", label: "Experience", icon: "Clock" },
        ],
      }),
  },
  {
    type: "services",
    name: "Services",
    description: "Your services and offers",
    icon: "BookOpen",
    group: "Content",
    variants: ["cards", "minimal", "image", "compact"],
    defaults: () =>
      base("services", "cards", {
        items: [
          {
            id: uid("srv"),
            title: "Web Design",
            description: "Modern and interactive websites.",
            price: "$1,200",
            icon: "Globe",
          },
          {
            id: uid("srv"),
            title: "Branding",
            description: "Unique brand identities.",
            price: "$800",
            icon: "Sparkles",
          },
          {
            id: uid("srv"),
            title: "Consulting",
            description: "1-on-1 strategy sessions.",
            price: "$150/h",
            icon: "Award",
          },
        ],
      }),
  },
  {
    type: "testimonials",
    name: "Testimonials",
    description: "Client reviews and quotes",
    icon: "Star",
    group: "Content",
    variants: ["cards", "quote", "compact", "featured"],
    defaults: () =>
      base("testimonials", "cards", {
        items: [
          {
            id: uid("tst"),
            name: "John Doe",
            role: "CEO, TechCorp",
            quote: "Antigravity completely changed our workflow.",
            rating: 5,
            source: "Google",
          },
          {
            id: uid("tst"),
            name: "Jane Smith",
            role: "Designer",
            quote: "Outstanding results and fast turnaround.",
            rating: 5,
            source: "Trustpilot",
          },
        ],
      }),
  },
  {
    type: "pricing",
    name: "Pricing Plans",
    description: "Interactive pricing cards",
    icon: "Check",
    group: "Content",
    variants: ["simple", "cards", "featured", "compact"],
    defaults: () =>
      base("pricing", "cards", {
        items: [
          {
            id: uid("prc"),
            title: "Basic",
            price: "$29",
            period: "mo",
            description: "Essentials for beginners",
            features: ["1 Project", "Basic Analytics"],
            ctaLabel: "Choose Plan",
            ctaUrl: "https://example.com",
          },
          {
            id: uid("prc"),
            title: "Pro",
            price: "$79",
            period: "mo",
            description: "Perfect for growing teams",
            features: ["Unlimited Projects", "Advanced Analytics", "24/7 Support"],
            recommended: true,
            ctaLabel: "Upgrade to Pro",
            ctaUrl: "https://example.com",
          },
        ],
      }),
  },
  {
    type: "faq",
    name: "FAQ",
    description: "Frequently asked questions",
    icon: "HelpCircle",
    group: "Content",
    variants: ["default"],
    defaults: () =>
      base("faq", "default", {
        behavior: { allowMultipleOpen: false },
        items: [
          {
            id: uid("faq"),
            question: "How does it work?",
            answer: "Simply drag and drop blocks to build your page.",
          },
          {
            id: uid("faq"),
            question: "Is it responsive?",
            answer: "Yes! Every block adapts to desktop, tablet, and mobile automatically.",
          },
        ],
      }),
  },
  {
    type: "timeline",
    name: "Timeline",
    description: "Chronological list of events",
    icon: "Clock",
    group: "Content",
    variants: ["minimal", "cards", "editorial"],
    defaults: () =>
      base("timeline", "minimal", {
        items: [
          {
            id: uid("tml"),
            date: "2024 - Present",
            title: "Lead Architect",
            description: "Designing future-ready cloud architectures.",
            icon: "Award",
          },
          {
            id: uid("tml"),
            date: "2020 - 2024",
            title: "Senior Developer",
            description: "Built scalable web platforms.",
            icon: "Check",
          },
        ],
      }),
  },
  {
    type: "featuredMedia",
    name: "Featured Media",
    description: "Showcase an image or video",
    icon: "FileText",
    group: "Media",
    variants: ["hero-media", "card", "split", "minimal"],
    defaults: () =>
      base("featuredMedia", "card", {
        mediaType: "image",
        imageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800",
        title: "Featured Product Highlight",
        description: "Discover the new features and design updates in our latest release.",
        ctaLabel: "Learn More",
        ctaUrl: "https://example.com",
      }),
  },
  {
    type: "floatingActions",
    name: "Floating Actions",
    description: "Quick contact and chat buttons",
    icon: "MessageCircle",
    group: "Actions",
    variants: ["default"],
    defaults: () => {
      const block = base("floatingActions", "default", {
        items: [
          {
            id: uid("fla"),
            label: "WhatsApp Chat",
            url: "https://wa.me/1234567890",
            icon: "whatsapp",
          },
          { id: uid("fla"), label: "Call Us", url: "tel:+1234567890", icon: "call" },
        ],
      });
      block.layout = {
        ...block.layout,
        floating: {
          enabled: true,
          anchor: "bottom-right",
          offset: 20,
        },
      };
      return block;
    },
  },
  {
    type: "product",
    name: "Product Card",
    description: "Showcase a single product",
    icon: "ShoppingBag",
    group: "Content",
    variants: ["minimal", "card", "image-first", "featured"],
    defaults: () =>
      base("product", "card", {
        title: "Premium Headphones",
        description: "Noise-cancelling wireless headphones with 40h battery.",
        price: "$199.99",
        comparePrice: "$249.99",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
        ctaLabel: "Buy Now",
        ctaUrl: "https://example.com",
        badge: "Sale",
      }),
  },
  {
    type: "productGrid",
    name: "Product Grid",
    description: "Showcase multiple products",
    icon: "ShoppingBag",
    group: "Content",
    variants: ["cards", "minimal"],
    defaults: () =>
      base("productGrid", "cards", {
        products: [
          {
            id: uid("prd"),
            title: "Wireless Mouse",
            description: "Ergonomic mouse.",
            price: "$49.99",
            imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300",
            ctaLabel: "Buy",
            ctaUrl: "https://example.com",
          },
          {
            id: uid("prd"),
            title: "Mechanical Keyboard",
            description: "RGB mechanical keyboard.",
            price: "$129.99",
            imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300",
            ctaLabel: "Buy",
            ctaUrl: "https://example.com",
          },
        ],
      }),
  },
  {
    type: "booking",
    name: "Booking",
    description: "Visually represent appointment scheduling",
    icon: "Calendar",
    group: "Content",
    variants: ["default"],
    defaults: () =>
      base("booking", "default", {
        title: "Book a Strategy Session",
        description: "1-on-1 session to audit your design and layout constraints.",
        service: "Design Consulting",
        duration: "60 mins",
        price: "$150",
        availableDates: ["Mon, Aug 24", "Tue, Aug 25", "Wed, Aug 26"],
        availableTimes: ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"],
        ctaLabel: "Confirm Reservation",
      }),
  },
  {
    type: "calendar",
    name: "Calendar",
    description: "Show date availability",
    icon: "Calendar",
    group: "Content",
    variants: ["default"],
    defaults: () =>
      base("calendar", "default", {
        disabledDates: ["2026-08-10", "2026-08-15", "2026-08-20"],
      }),
  },
  {
    type: "events",
    name: "Events",
    description: "List of upcoming events or workshops",
    icon: "Calendar",
    group: "Content",
    variants: ["list", "cards", "featured"],
    defaults: () =>
      base("events", "list", {
        items: [
          {
            id: uid("evt"),
            date: "Sep 12, 2026",
            time: "7:00 PM",
            title: "Advanced Agentic Coding Live",
            location: "San Francisco, CA & Online",
            imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300",
            ctaLabel: "Register",
            ctaUrl: "https://example.com",
          },
          {
            id: uid("evt"),
            date: "Oct 05, 2026",
            time: "2:00 PM",
            title: "React Router v10 Deep Dive",
            location: "Virtual Workshop",
            imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=300",
            ctaLabel: "Get Tickets",
            ctaUrl: "https://example.com",
          },
        ],
      }),
  },
  {
    type: "map",
    name: "Map",
    description: "Interactive address map locator",
    icon: "MapPin",
    group: "Content",
    variants: ["default"],
    defaults: () =>
      base("map", "default", {
        location: {
          lat: -33.45,
          lng: -70.66,
          label: "Santiago Center, Chile",
        },
      }),
  },
  {
    type: "music",
    name: "Music / Audio",
    description: "Embedded audio or music track player",
    icon: "Music",
    group: "Media",
    variants: ["compact", "card", "featured"],
    defaults: () =>
      base("music", "card", {
        title: "Summer Chill Lo-Fi",
        artist: "Acoustic Dreams",
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      }),
  },
  {
    type: "carousel",
    name: "Carousel",
    description: "Image slider gallery",
    icon: "ChevronRight",
    group: "Media",
    variants: ["default"],
    defaults: () =>
      base("carousel", "default", {
        items: [
          {
            id: uid("sl"),
            imageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800",
            title: "Innovation",
            description: "Developing next-generation developer tooling.",
            linkUrl: "https://example.com",
          },
          {
            id: uid("sl"),
            imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
            title: "Design Systems",
            description: "Building highly accessible interface systems.",
            linkUrl: "https://example.com",
          },
        ],
      }),
  },
  {
    type: "tabs",
    name: "Tabs Section",
    description: "Organize info in clickable tabs",
    icon: "Folder",
    group: "Content",
    variants: ["default"],
    defaults: () =>
      base("tabs", "default", {
        items: [
          {
            id: uid("tb"),
            label: "Overview",
            contentText: "This section provides a brief overview of our services and products.",
          },
          {
            id: uid("tb"),
            label: "Features",
            contentText:
              "Features include fully responsive layouts, Bento grid system, and layout overlap styling.",
          },
          {
            id: uid("tb"),
            label: "Specs",
            contentText:
              "Supported sizes: Mobile (320px+), Tablet (768px+), and Desktop (1024px+).",
          },
        ],
      }),
  },
  {
    type: "bottomNav",
    name: "Bottom Navigation",
    description: "Fixed application bottom tab bar",
    icon: "Home",
    group: "Actions",
    variants: ["default"],
    defaults: () => {
      const block = base("bottomNav", "default", {
        items: [
          { id: uid("nav"), label: "Home", url: "#home", icon: "home" },
          { id: uid("nav"), label: "Services", url: "#services", icon: "services" },
          { id: uid("nav"), label: "Profile", url: "#profile", icon: "profile" },
        ],
      });
      block.layout = {
        ...block.layout,
        floating: {
          enabled: true,
          anchor: "bottom-center",
          offset: 0,
        },
      };
      return block;
    },
  },
];

export const BLOCK_DEFINITION_MAP: Record<string, BlockDefinition> = Object.fromEntries(
  BLOCK_DEFINITIONS.map((d) => [d.type, d]),
);

export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return BLOCK_DEFINITION_MAP[type];
}

export function createBlock(type: BlockType): TemplateBlock {
  const def = getBlockDefinition(type);
  const defaults = def ? def.defaults() : ({} as Omit<TemplateBlock, "id">);
  return { id: uid("block"), ...defaults };
}

/**
 * FUTURE BLOCKS (documented in docs/TEMPLATE_ENGINE.md):
 * store, products, appointment, calendar, music, podcast, map, reviews,
 * testimonials, forms, donations, newsletter, pricing, events, countdown, faq.
 * They only require a type + definition + registry entry — no engine change.
 */
export const PLANNED_BLOCK_TYPES = [
  "store",
  "products",
  "appointment",
  "calendar",
  "music",
  "podcast",
  "map",
  "reviews",
  "testimonials",
  "forms",
  "donations",
  "newsletter",
  "pricing",
  "events",
  "countdown",
  "faq",
] as const;
