import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Lock,
  Menu,
  Presentation,
  Shield,
  Sparkles,
  Store,
  UserRound,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

const sectionPad =
  "px-[max(1.25rem,env(safe-area-inset-left))] py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28";
const container = "mx-auto max-w-[1480px]";
const eyebrowClass = "text-sm font-extrabold uppercase tracking-[0.22em] text-[#5638d8]";
const h2Class =
  "mt-3 max-w-3xl text-[clamp(2.1rem,4vw,4.25rem)] font-extrabold leading-[1.02] tracking-tight text-[#121a3b]";
const bodyClass = "mt-5 max-w-2xl text-lg leading-8 text-[#626a80]";
const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-[10px] bg-[#5638d8] px-6 text-sm font-bold text-white shadow-sm shadow-[#5638d8]/25 transition hover:bg-[#4529bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5638d8] focus-visible:ring-offset-2";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-[10px] border border-[#18213d]/20 px-6 text-sm font-bold text-[#18213d] transition hover:bg-[#18213d]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5638d8] focus-visible:ring-offset-2";

const ecosystemItems = ["Perfil y Bio", "QR", "Documentos seguros", "Plantillas", "Control"];
const identityBenefits = [
  "Perfil, bio y descripción",
  "Avatar y portada",
  "Enlaces y botones",
  "Personalización visual",
  "Publicar u ocultar contenido",
  "URL pública estable",
];
const stableQrBenefits = [
  "Actualiza contenido sin reemplazar tu QR",
  "Personaliza colores y estilos",
  "Utiliza diferentes marcos",
  "Exporta para uso digital o impresión",
];
const templateSlots = [
  { name: "Barbara Elite", tier: "Premium" },
  { name: "Larissa Luxury", tier: "Premium" },
  { name: "Business", tier: "Base" },
  { name: "Creator", tier: "Base" },
  { name: "Beauty", tier: "Base" },
  { name: "Portfolio / Professional", tier: "Base" },
];
const documentCapabilities = [
  "Contraseña opcional",
  "Expiración",
  "Límite de descargas",
  "Una sola descarga",
  "Revocación",
];
const fileTypes = [
  { icon: FileSpreadsheet, label: "Excel" },
  { icon: FileText, label: "PDF" },
  { icon: FileText, label: "Word" },
  { icon: Presentation, label: "PowerPoint" },
  { icon: ImageIcon, label: "Imágenes" },
  { icon: FileArchive, label: "ZIP" },
  { icon: FileText, label: "Texto" },
  { icon: FileText, label: "Otros" },
];
const documentRows = [
  { filename: "Contrato-Proyecto.pdf", labels: ["Protegido", "Expiración"] },
  { filename: "Reporte.xlsx", labels: ["Cifrado", "1 descarga"] },
  { filename: "Archivos-Proyecto.zip", labels: ["Acceso protegido", "Límite de descargas"] },
];
const steps = [
  {
    number: "01",
    title: "Crea",
    description: "Crea tu perfil, añade enlaces o prepara un documento.",
  },
  {
    number: "02",
    title: "Personaliza",
    description: "Adapta la apariencia, plantilla y QR a tu estilo.",
  },
  { number: "03", title: "Comparte", description: "Publica y comparte mediante URL o código QR." },
  {
    number: "04",
    title: "Controla",
    description: "Actualiza, limita, revoca o elimina cuando lo necesites.",
  },
];
const controlItems = [
  "Preview",
  "Perfil",
  "Enlaces",
  "Apariencia",
  "QR",
  "Documentos",
  "Publicación",
  "Revocación",
];
const mobileCapabilities = [
  "Selección táctil",
  "Edición contextual",
  "Bottom sheet",
  "Pinch y pan",
  "Gestión de enlaces",
];
const useCases = [
  { icon: Store, title: "Negocios", description: "Información, contacto, promociones y enlaces." },
  { icon: UserRound, title: "Profesionales", description: "Bio, servicios, portfolio y contacto." },
  { icon: Sparkles, title: "Creadores", description: "Redes, contenido y enlaces." },
  {
    icon: CalendarDays,
    title: "Eventos",
    description: "Información, ubicación y recursos importantes.",
  },
  {
    icon: FileText,
    title: "Documentos",
    description: "Comparte archivos mediante acceso controlado.",
  },
  {
    icon: LinkIcon,
    title: "Organizaciones",
    description: "Centraliza información y acceso mediante QR.",
  },
];
const securityItems = [
  "Cifrado en el navegador",
  "Storage privado",
  "Acceso autorizado",
  "Expiración",
  "Límites de descarga",
  "Revocación",
];
const faqs = [
  [
    "¿Puedo cambiar mis enlaces después de imprimir el QR?",
    "Sí. Puedes actualizar el contenido vinculado manteniendo una URL pública estable.",
  ],
  [
    "¿Qué puedo compartir desde mi perfil?",
    "Puedes reunir bio, enlaces, botones, documentos protegidos y una página pública editable.",
  ],
  [
    "¿Cómo funciona el acceso a documentos?",
    "El archivo se protege y se comparte mediante enlace o QR con controles como contraseña, expiración o límites.",
  ],
  [
    "¿La experiencia móvil usa otro contenido?",
    "No. La landing y la aplicación se adaptan de forma responsive con una arquitectura compartida.",
  ],
];

function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-x-clip bg-white text-[#111936]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "QRio",
              url: "https://www.cripqer.dev/",
              applicationCategory: "UtilityApplication",
              operatingSystem: "All",
              description:
                "Plataforma para crear perfiles públicos, códigos QR, enlaces y accesos controlados a documentos.",
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map(([question, answer]) => ({
                "@type": "Question",
                name: question,
                acceptedAnswer: { "@type": "Answer", text: answer },
              })),
            },
          ]),
        }}
      />

      <LandingHeader mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <HeroSection />
      <EcosystemStrip />
      <DigitalIdentitySection />
      <StableQRSection />
      <TemplatesSection />
      <SecureDocumentsSection />
      <HowItWorksSection />
      <CentralControlSection />
      <MobileExperienceSection />
      <UseCasesSection />
      <SecurityControlSection />
      <FAQSection />
      <FinalCTASection />
      <LandingFooter />
    </main>
  );
}

function LandingHeader({
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  const navItems = [
    { label: "Producto", href: "#identity" },
    { label: "QR", href: "#qr" },
    { label: "Plantillas", href: "#templates" },
    { label: "Documentos", href: "#documents" },
    { label: "Recursos", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#fff8f2]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <nav className="mx-auto flex min-h-[76px] max-w-[1480px] items-center justify-between px-[max(1.25rem,env(safe-area-inset-left))] sm:px-8 lg:min-h-[88px] lg:px-12">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-3 text-[1.45rem] font-extrabold tracking-tight sm:text-[1.7rem]"
        >
          <LogoMark />
          <span>QRio</span>
        </Link>
        <div className="hidden items-center gap-8 text-[15px] font-semibold text-[#18213d] xl:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition hover:text-[#5638d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5638d8]"
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="hidden min-h-12 items-center px-4 text-sm font-semibold text-[#18213d] transition hover:text-[#5638d8] sm:inline-flex"
          >
            Iniciar sesión
          </Link>
          <Link to="/editor" className={primaryButton}>
            Crear cuenta
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-[#d9cfee] text-[#18213d] transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5638d8] xl:hidden"
            aria-label="Menú"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {mobileMenuOpen && (
        <div className="border-t border-[#ece0d8] bg-[#fff8f2] xl:hidden">
          <div className="mx-auto max-w-[1480px] px-5 py-4 sm:px-8">
            <div className="grid gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-12 items-center justify-between rounded-xl px-4 text-sm font-semibold text-[#18213d] transition hover:bg-white/70"
                >
                  {item.label}
                  <ChevronRight className="h-4 w-4 text-[#5638d8]" />
                </a>
              ))}
              <Link
                to="/profile"
                className="flex min-h-12 items-center justify-between rounded-xl px-4 text-sm font-semibold text-[#18213d] transition hover:bg-white/70 sm:hidden"
              >
                Iniciar sesión
                <ArrowRight className="h-4 w-4 text-[#5638d8]" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function HeroSection() {
  return (
    <section className="overflow-hidden bg-[#fff8f2]">
      <div className="mx-auto grid min-h-[calc(100svh-88px)] max-w-[1480px] grid-cols-1 items-center gap-8 px-[max(1.25rem,env(safe-area-inset-left))] pb-12 pt-8 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:px-12 lg:pb-16 lg:pt-12">
        <div className="max-w-[700px]">
          <div className="mb-8 inline-flex rounded-full border border-[#5638d8]/25 px-4 py-1.5 text-base font-medium text-[#5638d8]">
            Confiables. Seguros. Siempre.
          </div>
          <h1 className="max-w-[720px] text-[clamp(3rem,5.05vw,5.05rem)] font-extrabold leading-[0.98] tracking-tight text-[#121a3b]">
            Códigos QR
            <br />
            seguros para
            <br />
            empresas y personas
          </h1>
          <p className="mt-7 max-w-[620px] text-[1.15rem] leading-8 text-[#5f667a] sm:text-[1.25rem]">
            Genera QR cifrados, QR para banca, hospitales, documentos y bio links desde una sola
            plataforma.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-[15px] font-bold text-[#18213d]">
            {[
              { icon: Shield, label: "Seguridad" },
              { icon: BadgeCheck, label: "Confianza" },
              { icon: UserRound, label: "Para todo público" },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f3edf8] text-[#5638d8]">
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {item.label}
              </span>
            ))}
          </div>
          <div className="mt-9 flex flex-col gap-5 sm:flex-row">
            <Link to="/editor" className={`${primaryButton} h-16 w-full text-base sm:w-[250px]`}>
              Crear QR
              <ArrowRight className="ml-5 h-6 w-6" aria-hidden="true" />
            </Link>
            <a
              href="#how-it-works"
              className={`${secondaryButton} h-16 w-full text-base sm:w-[250px]`}
            >
              Ver soluciones
            </a>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto flex w-full justify-center lg:justify-end">
      <img
        src="/images/landing/hero-qrio.png"
        alt="QRio permite crear códigos QR seguros para empresas y personas"
        className="w-[90%] max-w-[520px] object-contain lg:w-[min(100%,760px)] lg:max-w-[760px]"
      />
    </div>
  );
}

function EcosystemStrip() {
  return (
    <section className="bg-[#fff8f2] px-[max(1.25rem,env(safe-area-inset-left))] pb-12 sm:px-8 lg:px-12">
      <div
        className={`${container} rounded-[28px] border border-[#eadfd8] bg-white/55 p-4 shadow-sm`}
      >
        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <SectionIntro
            eyebrow="TODO CONECTADO"
            heading="Una plataforma. Diferentes formas de compartir."
            compact
          />
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:flex-wrap sm:pb-0">
            {ecosystemItems.map((item, index) => (
              <div
                key={item}
                className="flex min-h-16 min-w-[168px] items-center gap-3 rounded-2xl border border-[#e5d9ef] bg-white px-4 text-sm font-bold text-[#18213d]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3edf8] text-[#5638d8]">
                  {index + 1}
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DigitalIdentitySection() {
  return (
    <section id="identity" className={`${sectionPad} bg-white`}>
      <TwoColumn
        eyebrow="IDENTIDAD DIGITAL"
        heading="Tu identidad digital, lista para compartir."
        description="Crea una página personal o profesional con tu información, enlaces y estilo, accesible desde una URL pública y desde tu QR."
        benefits={identityBenefits}
        visual={
          <AssetVisual
            src="/images/landing/identidad-digital.png"
            alt="Vista de identidad digital con perfil público, enlaces y código QR"
          />
        }
      />
    </section>
  );
}

function StableQRSection() {
  return (
    <section id="qr" className={`${sectionPad} bg-[#fff8f2]`}>
      <TwoColumn
        eyebrow="QR ESTABLE"
        heading="Un QR. Infinitas actualizaciones."
        description="Publica tu QR una vez y mantén una identidad estable mientras actualizas el contenido vinculado."
        benefits={stableQrBenefits}
        visual={
          <AssetVisual
            src="/images/landing/qr-estable.png"
            alt="Ilustración de QR estable conectado a páginas, menús, PDF e impresión"
          />
        }
      />
    </section>
  );
}

function TemplatesSection() {
  return (
    <section id="templates" className={`${sectionPad} bg-[#f7f5f2]`}>
      <div className={container}>
        <SectionIntro
          eyebrow="PLANTILLAS"
          heading="Haz que se vea como tu marca."
          description="Elige una base visual y adapta colores, tipografía, portada, botones y estilo a tu identidad."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {templateSlots.map((slot, index) => (
            <article
              key={slot.name}
              className={`rounded-[24px] border border-[#e2d8d0] bg-white p-4 shadow-sm ${index < 2 ? "lg:col-span-2" : ""}`}
            >
              <div
                className={`aspect-[4/3] rounded-[20px] bg-[linear-gradient(135deg,#f4ede8,#ebe5ff)] p-4 ${index < 2 ? "lg:aspect-[16/9]" : ""}`}
              >
                <div
                  className="h-full rounded-[16px] border border-white/70 bg-white/45"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <h3 className="font-extrabold text-[#121a3b]">{slot.name}</h3>
                <span className="rounded-full bg-[#f3edf8] px-3 py-1 text-xs font-bold text-[#5638d8]">
                  {slot.tier}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecureDocumentsSection() {
  return (
    <section id="documents" className={`${sectionPad} bg-[#f7f3ff]`}>
      <div className={`${container} grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center`}>
        <div>
          <SectionIntro
            eyebrow="DOCUMENTOS SEGUROS"
            heading="Comparte archivos de forma segura con un QR."
            description="Protege un archivo, genera un acceso mediante QR o enlace y controla cómo puede ser descargado."
          />
          <FeatureList items={documentCapabilities} />
          <Link to="/encrypted-documents" className={`${primaryButton} mt-8`}>
            Proteger un archivo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5">
          <AssetVisual
            src="/images/landing/documentos-seguros.png"
            alt="Flujo visual para compartir documentos seguros mediante QR"
          />
          <div className="rounded-[28px] border border-[#dfd4f0] bg-white p-4 shadow-sm sm:p-6">
            <div className="grid gap-3 sm:grid-cols-4">
              {fileTypes.map((type) => (
                <div
                  key={type.label}
                  className="rounded-2xl border border-[#ece7f6] bg-[#fbf9ff] p-3"
                >
                  <type.icon className="h-5 w-5 text-[#5638d8]" />
                  <p className="mt-3 text-sm font-bold">{type.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3">
              {documentRows.map((row) => (
                <div
                  key={row.filename}
                  className="rounded-2xl border border-[#ece7f6] bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-[#5638d8]" />
                    <p className="font-bold text-[#121a3b]">{row.filename}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-[#f3edf8] px-3 py-1 text-xs font-bold text-[#5638d8]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className={`${sectionPad} bg-white`}>
      <div className={container}>
        <SectionIntro eyebrow="CÓMO FUNCIONA" heading="Todo en pocos minutos." />
        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-[24px] border border-[#e2d8d0] bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-extrabold text-[#5638d8]">{step.number}</p>
              <h3 className="mt-4 text-2xl font-extrabold text-[#121a3b]">{step.title}</h3>
              <p className="mt-3 leading-7 text-[#626a80]">{step.description}</p>
            </article>
          ))}
        </div>
        <div className="mt-8">
          <AssetVisual
            src="/images/landing/como-funciona.png"
            alt="Resumen visual de los pasos crear, personalizar, compartir y controlar"
            wide
          />
        </div>
      </div>
    </section>
  );
}

function CentralControlSection() {
  return (
    <section id="control" className={`${sectionPad} bg-[#10182f] text-white`}>
      <div className={`${container} grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center`}>
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-[#b9a8ff]">
            CONTROL CENTRAL
          </p>
          <h2 className="mt-3 max-w-3xl text-[clamp(2.1rem,4vw,4.25rem)] font-extrabold leading-[1.02] tracking-tight">
            Todo bajo tu control.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Gestiona tu perfil, enlaces, apariencia, QR y documentos desde una misma experiencia.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {controlItems.map((item) => (
              <span
                key={item}
                className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <AssetVisual
          src="/images/landing/control-central.png"
          alt="Vista del control central para administrar perfil, enlaces, QR y documentos"
          dark
        />
      </div>
    </section>
  );
}

function MobileExperienceSection() {
  return (
    <section id="mobile" className={`${sectionPad} bg-[#fff8f2]`}>
      <TwoColumn
        eyebrow="EXPERIENCIA MÓVIL"
        heading="Gestiona también desde tu teléfono."
        description="Una experiencia adaptada para trabajar directamente desde pantallas táctiles manteniendo el mismo contenido y configuración."
        benefits={mobileCapabilities}
        visual={
          <AssetVisual
            src="/images/landing/experiencia-movil.png"
            alt="Experiencia móvil para gestionar perfil y enlaces desde pantallas táctiles"
          />
        }
      />
    </section>
  );
}

function UseCasesSection() {
  return (
    <section id="use-cases" className={`${sectionPad} bg-white`}>
      <div className={container}>
        <SectionIntro eyebrow="CASOS DE USO" heading="Un QR para todo lo que quieras compartir." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((item) => (
            <article
              key={item.title}
              className="rounded-[24px] border border-[#e2d8d0] bg-white p-6 shadow-sm"
            >
              <item.icon className="h-6 w-6 text-[#5638d8]" />
              <h3 className="mt-5 text-xl font-extrabold text-[#121a3b]">{item.title}</h3>
              <p className="mt-3 leading-7 text-[#626a80]">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecurityControlSection() {
  return (
    <section id="security" className={`${sectionPad} bg-[#f7f5f2]`}>
      <div className={container}>
        <SectionIntro eyebrow="SEGURIDAD Y CONTROL" heading="Diseñado para darte control." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {securityItems.map((item) => (
            <div
              key={item}
              className="flex min-h-20 items-center gap-4 rounded-[22px] border border-[#e2d8d0] bg-white p-5"
            >
              <Shield className="h-5 w-5 shrink-0 text-[#5638d8]" />
              <p className="font-bold text-[#121a3b]">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className={`${sectionPad} bg-white`}>
      <div className="mx-auto max-w-4xl">
        <h2 className={h2Class}>Preguntas frecuentes</h2>
        <div className="mt-8 divide-y divide-[#e2d8d0] rounded-[28px] border border-[#e2d8d0] bg-white px-5 shadow-sm">
          {faqs.map(([question, answer]) => (
            <details key={question} className="group py-5">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-extrabold text-[#121a3b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5638d8]">
                {question}
                <ChevronDown className="h-5 w-5 shrink-0 text-[#5638d8] transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 leading-7 text-[#626a80]">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className={`${sectionPad} bg-[#fff8f2]`}>
      <div
        className={`${container} rounded-[32px] bg-[#5638d8] px-6 py-12 text-center text-white shadow-2xl shadow-[#5638d8]/20 sm:px-10 lg:py-16`}
      >
        <h2 className="mx-auto max-w-3xl text-[clamp(2rem,4vw,4.5rem)] font-extrabold leading-tight tracking-tight">
          Tu próxima conexión puede comenzar con un escaneo.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/85">
          Crea, personaliza y comparte desde un solo lugar.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            to="/editor"
            className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-white px-6 text-sm font-bold text-[#5638d8] transition hover:bg-[#f5f1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Crear mi QR
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex min-h-12 items-center justify-center rounded-[10px] border border-white/40 px-6 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Explorar soluciones
          </a>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  const columns = [
    { title: "Producto", links: ["Identidad digital", "QR estable", "Plantillas"] },
    { title: "Soluciones", links: ["Documentos", "Móvil", "Control"] },
    { title: "Recursos", links: ["Cómo funciona", "Casos de uso", "FAQ"] },
    { title: "Legal", links: ["Privacidad", "Términos"] },
  ];
  return (
    <footer className="border-t border-[#e2d8d0] bg-white px-[max(1.25rem,env(safe-area-inset-left))] py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:px-12">
      <div className={`${container} grid gap-8 lg:grid-cols-[0.8fr_1.2fr]`}>
        <div>
          <div className="flex items-center gap-3 text-xl font-extrabold text-[#121a3b]">
            <LogoMark />
            QRio
          </div>
          <p className="mt-4 max-w-sm leading-7 text-[#626a80]">
            Plataforma para crear, personalizar y compartir experiencias mediante QR.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-extrabold text-[#121a3b]">{column.title}</h3>
              <div className="mt-4 grid gap-3">
                {column.links.map((link) => (
                  <a
                    key={link}
                    href="#faq"
                    className="text-sm font-semibold text-[#626a80] transition hover:text-[#5638d8]"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

function SectionIntro({
  eyebrow,
  heading,
  description,
  compact = false,
}: {
  eyebrow: string;
  heading: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <p className={eyebrowClass}>{eyebrow}</p>
      <h2
        className={
          compact
            ? "mt-2 text-2xl font-extrabold tracking-tight text-[#121a3b] sm:text-3xl"
            : h2Class
        }
      >
        {heading}
      </h2>
      {description ? <p className={bodyClass}>{description}</p> : null}
    </div>
  );
}

function TwoColumn({
  eyebrow,
  heading,
  description,
  benefits,
  visual,
}: {
  eyebrow: string;
  heading: string;
  description: string;
  benefits: string[];
  visual: ReactNode;
}) {
  return (
    <div className={`${container} grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center`}>
      <div>
        <SectionIntro eyebrow={eyebrow} heading={heading} description={description} />
        <FeatureList items={benefits} />
      </div>
      {visual}
    </div>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-7 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 rounded-2xl bg-white/70 p-3 text-sm font-bold text-[#18213d] ring-1 ring-[#e5d9ef]"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5638d8]" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function AssetVisual({
  src,
  alt,
  wide = false,
  dark = false,
}: {
  src: string;
  alt: string;
  wide?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[32px] ${
        dark
          ? "border border-white/10 bg-white/5 shadow-2xl shadow-black/25"
          : "border border-[#e2d8d0] bg-white/60 shadow-sm"
      }`}
    >
      <img
        src={src}
        alt={alt}
        className={`h-auto w-full object-contain ${wide ? "aspect-[16/9]" : "aspect-[16/9] lg:aspect-auto"}`}
        loading="lazy"
      />
    </div>
  );
}

function LogoMark() {
  return (
    <span
      className="grid h-9 w-9 grid-cols-2 gap-1 text-[#5638d8] sm:h-10 sm:w-10"
      aria-hidden="true"
    >
      {[1, 2, 3, 4].map((item) => (
        <span key={item} className="rounded-[5px] border-[5px] border-current" />
      ))}
    </span>
  );
}
