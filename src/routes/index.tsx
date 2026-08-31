import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Brush,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Menu,
  Palette,
  Presentation,
  QrCode,
  RefreshCw,
  Scissors,
  Shield,
  Sparkles,
  Store,
  Upload,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import { SiInstagram, SiTiktok, SiWhatsapp, SiYoutube } from "@icons-pack/react-simple-icons";

export const Route = createFileRoute("/")({
  component: Index,
});

const templateCards = [
  {
    name: "Business",
    font: "Manrope",
    bg: "bg-[#f5f7fa]",
    accent: "#2563eb",
    title: "Consultora Ana",
    lines: ["Agenda una reunión", "Servicios", "WhatsApp"],
  },
  {
    name: "Beauty",
    font: "Playfair Display",
    bg: "bg-[#fff4f2]",
    accent: "#e85d75",
    title: "Studio Glow",
    lines: ["Reservar hora", "Tratamientos", "Instagram"],
  },
  {
    name: "Creator",
    font: "Space Grotesk",
    bg: "bg-[#f2fbf9]",
    accent: "#0f766e",
    title: "Marco Crea",
    lines: ["Nuevo video", "Comunidad", "Cursos"],
  },
  {
    name: "Photography",
    font: "Cormorant Garamond",
    bg: "bg-[#f8f5ef]",
    accent: "#111827",
    title: "Luz Portfolio",
    lines: ["Portafolio", "Bodas", "Contacto"],
  },
];

const useCases = [
  {
    icon: Store,
    title: "Negocios",
    text: "Menú, WhatsApp, dirección y promociones en un solo escaneo.",
  },
  {
    icon: Sparkles,
    title: "Creadores",
    text: "Redes, contenido destacado y colaboraciones siempre actualizadas.",
  },
  {
    icon: Scissors,
    title: "Servicios",
    text: "Reserva, catálogo, horarios y canales de atención.",
  },
  {
    icon: CalendarDays,
    title: "Eventos",
    text: "Programa, ubicación, tickets y enlaces importantes.",
  },
  {
    icon: UserRound,
    title: "Profesionales",
    text: "Tarjeta digital con bio, portafolio y contacto directo.",
  },
  {
    icon: Camera,
    title: "Portafolios",
    text: "Muestra trabajos, colecciones y formularios de contacto.",
  },
];

function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white text-[#0f172a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "QR Links",
              "url": "https://www.cripqer.dev/",
              "applicationCategory": "UtilityApplication",
              "operatingSystem": "All",
              "description": "Generador de códigos QR con página web personalizable para enlaces, WhatsApp y redes sociales.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "¿Puedo cambiar mis enlaces después de imprimir el QR?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. El contenido de tu página puede actualizarse sin cambiar el QR, mientras mantengas el mismo identificador público."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Puedo usar varias redes en una sola página?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. Puedes reunir diferentes enlaces y plataformas en un solo destino."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Puedo personalizar el diseño?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. Puedes ajustar fuentes, colores, plantillas, portada y estilos visuales según la versión disponible."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Puedo descargar el QR?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. La creación te lleva al editor para publicar y descargar tu código QR."
                  }
                }
              ]
            }
          ])
        }}
      />
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f172a] text-sm font-bold text-white">
              QR
            </span>
            <span>QR Links</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100">
              Beta
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#producto" className="hover:text-slate-950">
              Producto
            </a>
            <a href="#como-funciona" className="hover:text-slate-950">
              Cómo funciona
            </a>
            <a href="#plantillas" className="hover:text-slate-950">
              Plantillas
            </a>
            <Link
              to="/encrypted-documents"
              className="flex items-center gap-1.5 hover:text-slate-950 text-blue-600 font-semibold"
            >
              <Shield className="w-4 h-4" />
              Documentos Seguros
            </Link>
            <a href="#faq" className="hover:text-slate-950">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="hidden text-sm font-semibold text-slate-700 hover:text-slate-950 sm:inline-flex"
            >
              Panel / Perfil
            </Link>
            <Link
              to="/editor"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm shadow-blue-900/20 transition hover:bg-blue-700"
            >
              Crear mi QR
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 md:hidden"
              aria-label="Menú"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200/70 bg-white md:hidden">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <div className="flex flex-col space-y-3">
                <a
                  href="#producto"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Producto
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>
                <a
                  href="#como-funciona"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cómo funciona
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>
                <a
                  href="#plantillas"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Plantillas
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  FAQ
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>
                <div className="border-t border-slate-200 pt-3">
                  <Link
                    to="/profile"
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Panel / Perfil
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <section className="overflow-hidden border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fa_100%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <BadgeCheck className="h-4 w-4" />
              En beta, crea y publica en minutos
            </div>
            <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Tu QR. Tu página. Tu marca.
            </h1>
            <h2 className="mt-4 text-xl font-medium text-slate-700">
              Generador de Código QR con Página Personalizada
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Reúne tus redes, WhatsApp, web y contenido en una página profesional. Actualízala
              cuando quieras sin volver a imprimir tu QR.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/editor"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563eb] px-6 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-700"
              >
                Crear mi QR gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Ver cómo funciona
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
              {["QR permanente", "Enlaces editables", "Más de 50 fuentes"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200"
                >
                  <Check className="h-4 w-4 text-blue-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section id="producto" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">QR estable</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Un QR. Infinitas actualizaciones.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Imprime tu QR una vez. Cambia enlaces, fotos, colores y diseño cuando quieras. El
              código sigue siendo el mismo.
            </p>
            <ul className="mt-7 grid gap-3 text-sm font-medium text-slate-700">
              {[
                "Cambia contenido sin reimprimir",
                "Publica una página presentable",
                "Comparte redes, web y WhatsApp",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <Check className="h-4 w-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-4 shadow-sm sm:grid-cols-[0.8fr_1fr_1fr]">
            <QrTile />
            <MiniPageCard title="Página A" accent="#2563eb" bg="bg-white" />
            <MiniPageCard title="Página B" accent="#0f766e" bg="bg-[#effaf7]" />
          </div>
        </div>
      </section>

      {/* Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04 */}
      <section className="border-y border-slate-100 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Documentos seguros
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Comparte archivos de forma segura con un QR
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Sube tu documento, protégelo y comparte únicamente el QR o enlace de acceso. El
              archivo no viaja dentro del QR.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                "Hasta 50 MB por archivo",
                "Contraseña opcional",
                "Expiración",
                "Límite de descargas",
                "Acceso mediante QR o enlace",
              ].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <Check className="h-4 w-4 text-blue-600" />
                  {item}
                </span>
              ))}
            </div>
            <Link
              to="/encrypted-documents"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#0f172a] px-6 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Proteger un archivo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Upload, label: "Sube" },
                { icon: Shield, label: "Cifra" },
                { icon: QrCode, label: "Genera QR" },
                { icon: LinkIcon, label: "Comparte enlace" },
              ].map((step) => (
                <div key={step.label} className="rounded-xl border border-slate-200 bg-white p-4">
                  <step.icon className="h-5 w-5 text-blue-600" />
                  <p className="mt-3 text-sm font-bold">{step.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: FileSpreadsheet, label: "Excel", color: "text-green-700" },
                { icon: FileText, label: "PDF", color: "text-red-700" },
                { icon: FileText, label: "Word", color: "text-blue-700" },
                { icon: Presentation, label: "PowerPoint", color: "text-orange-700" },
                { icon: ImageIcon, label: "Images", color: "text-cyan-700" },
                { icon: FileArchive, label: "ZIP", color: "text-amber-800" },
                { icon: FileText, label: "Text", color: "text-slate-700" },
                { icon: FileText, label: "+ More", color: "text-slate-700" },
              ].map((format) => (
                <div
                  key={format.label}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  <format.icon className={`h-4 w-4 ${format.color}`} />
                  <span className="truncate">{format.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="plantillas" className="bg-[#f5f7fa] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Plantillas</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Haz que se vea como tu marca.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              El resultado no tiene que verse genérico. Elige una base y cambia fuentes, portada,
              avatar, colores y botones.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {templateCards.map((template) => (
              <TemplateCard key={template.name} {...template} />
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Todo en pocos minutos.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: LinkIcon,
                title: "Agrega tus enlaces",
                text: "Redes, WhatsApp, web, formularios o contenido destacado.",
              },
              {
                icon: Brush,
                title: "Elige tu estilo",
                text: "Ajusta colores, fuentes, portada, avatar y botones.",
              },
              {
                icon: Download,
                title: "Descarga tu QR",
                text: "Publica tu página y usa el QR en impresos o redes.",
              },
            ].map((step, index) => (
              <div
                key={step.title}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <step.icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-sm font-bold text-blue-600">0{index + 1}</p>
                <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
              Editor visual
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Personaliza sin ser diseñador.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Muestra una página cuidada con controles simples para adaptar el resultado a tu
              negocio, servicio o contenido.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 text-sm font-semibold text-slate-200 sm:grid-cols-3">
              {["Fuentes", "Colores", "Degradados", "Portada", "Botones", "Redes"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-3"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <EditorPreview />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
              Casos de uso
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Un QR para lo que quieras compartir.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <item.icon className="h-6 w-6 text-blue-600" />
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#f5f7fa] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Preguntas frecuentes
          </h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-[1.5rem] border border-slate-200 bg-white px-5 shadow-sm">
            {[
              [
                "¿Puedo cambiar mis enlaces después de imprimir el QR?",
                "Sí. El contenido de tu página puede actualizarse sin cambiar el QR, mientras mantengas el mismo identificador público.",
              ],
              [
                "¿Puedo usar varias redes en una sola página?",
                "Sí. Puedes reunir diferentes enlaces y plataformas en un solo destino.",
              ],
              [
                "¿Puedo personalizar el diseño?",
                "Sí. Puedes ajustar fuentes, colores, plantillas, portada y estilos visuales según la versión disponible.",
              ],
              [
                "¿Puedo descargar el QR?",
                "Sí. La creación te lleva al editor para publicar y descargar tu código QR.",
              ],
            ].map(([question, answer]) => (
              <div key={question} className="py-5">
                <h3 className="font-bold">{question}</h3>
                <p className="mt-2 leading-7 text-slate-600">{answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#0f172a] px-6 py-12 text-center text-white shadow-2xl shadow-slate-900/20 sm:px-10">
          <h2 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
            Tu próxima conexión puede empezar con un escaneo.
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-8 text-slate-300">
            En beta. Crea, publica y descarga en minutos.
          </p>
          <Link
            to="/editor"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#2563eb] px-6 text-sm font-bold text-white transition hover:bg-blue-500"
          >
            Crear mi QR gratis
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-xs text-white">
              QR
            </span>
            QR Links
          </div>
          <div className="flex flex-wrap gap-4">
            <a href="#producto" className="hover:text-slate-950">
              Producto
            </a>
            <a href="#faq" className="hover:text-slate-950">
              Privacidad
            </a>
            <a href="#faq" className="hover:text-slate-950">
              Términos
            </a>
            <Link to="/editor" className="hover:text-slate-950">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute left-2 top-10 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-xl shadow-slate-900/10 sm:block">
        QR permanente
      </div>
      <div className="absolute right-0 top-24 z-10 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-xl shadow-slate-900/10">
        Más de 50 fuentes
      </div>
      <div className="absolute bottom-14 left-0 z-10 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-xl shadow-slate-900/10">
        Enlaces editables
      </div>

      <div className="grid items-center gap-5 sm:grid-cols-[0.72fr_1fr]">
        <div className="order-2 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:order-1">
          <QrTile />
        </div>
        <div className="order-1 mx-auto h-[540px] w-[270px] rounded-[2.5rem] border-[8px] border-slate-900/10 bg-white p-3 shadow-2xl shadow-slate-900/15 sm:order-2">
          <div className="h-full overflow-hidden rounded-[2rem] bg-[#f8fafc]">
            <div className="h-24 bg-[linear-gradient(135deg,#2563eb,#0f766e)]" />
            <div className="-mt-10 px-5 text-center">
              <div className="mx-auto h-20 w-20 rounded-full border-4 border-white bg-white shadow-md" />
              <h3 className="mt-4 text-2xl font-extrabold tracking-tight">Tu Marca</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Redes, reservas y contacto en un solo lugar.
              </p>
              <div className="mt-5 flex justify-center gap-2 text-blue-600">
                <SiInstagram className="h-5 w-5" />
                <SiWhatsapp className="h-5 w-5" />
                <SiTiktok className="h-5 w-5" />
                <SiYoutube className="h-5 w-5" />
              </div>
              <div className="mt-6 space-y-3">
                {["WhatsApp", "Catálogo", "Reservar hora"].map((item) => (
                  <div
                    key={item}
                    className="flex h-12 items-center justify-between rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white"
                  >
                    {item}
                    <ExternalLink className="h-4 w-4 opacity-70" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrTile() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[1.5rem] bg-white p-4">
      <img
        src="/WhatsApp Image 2026-08-17 at 11.18.30 PM.jpeg"
        alt="Código QR de ejemplo"
        className="h-36 w-36 rounded-2xl object-cover shadow-sm"
      />
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
        <QrCode className="h-4 w-4" />
        El QR no cambia
      </div>
    </div>
  );
}

function MiniPageCard({ title, accent, bg }: { title: string; accent: string; bg: string }) {
  return (
    <div className={`rounded-[1.5rem] border border-slate-200 p-4 ${bg}`}>
      <div className="h-16 rounded-2xl" style={{ backgroundColor: accent }} />
      <div className="-mt-6 h-14 w-14 rounded-full border-4 border-white bg-white shadow-sm" />
      <h3 className="mt-4 font-bold">{title}</h3>
      <div className="mt-4 space-y-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-9 rounded-xl"
            style={{
              backgroundColor: item === 1 ? accent : "#ffffff",
              border: "1px solid #e2e8f0",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ name, font, bg, accent, title, lines }: (typeof templateCards)[number]) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10">
      <div className={`p-4 ${bg}`}>
        <div
          className="min-h-[260px] rounded-[1.25rem] bg-white p-4 shadow-sm"
          style={{ fontFamily: `"${font}", sans-serif` }}
        >
          <div className="h-20 rounded-2xl" style={{ backgroundColor: accent }} />
          <div className="-mt-7 h-16 w-16 rounded-full border-4 border-white bg-slate-100 shadow-sm" />
          <h3 className="mt-4 text-xl font-bold" style={{ color: accent }}>
            {title}
          </h3>
          <div className="mt-5 space-y-2">
            {lines.map((line) => (
              <div
                key={line}
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ backgroundColor: accent, color: "#ffffff" }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between p-4">
        <span className="font-bold">{name}</span>
        <span className="text-sm font-semibold text-blue-600">Crear el mío</span>
      </div>
    </article>
  );
}

function EditorPreview() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30">
      <div className="rounded-[1.5rem] bg-white p-4 text-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Editor</p>
            <h3 className="mt-1 text-xl font-extrabold">Diseño de tu página</h3>
          </div>
          <Wand2 className="h-6 w-6 text-blue-600" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {[
              { icon: Palette, label: "Colores", value: "Azul acción" },
              { icon: RefreshCw, label: "QR estable", value: "Activo" },
              { icon: Brush, label: "Botones", value: "Redondeados" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 p-4">
                <item.icon className="h-5 w-5 text-blue-600" />
                <p className="mt-3 text-sm font-bold">{item.label}</p>
                <p className="text-sm text-slate-500">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[1.5rem] bg-slate-100 p-4">
            <div className="rounded-[1.25rem] bg-white p-4">
              <div className="h-20 rounded-2xl bg-[linear-gradient(135deg,#2563eb,#0f766e)]" />
              <div className="-mt-7 h-16 w-16 rounded-full border-4 border-white bg-slate-200" />
              <h4 className="mt-4 text-2xl font-extrabold">Marca Beta</h4>
              <p className="mt-1 text-sm text-slate-500">
                Tu presencia digital lista para compartir.
              </p>
              <div className="mt-5 space-y-2">
                {["WhatsApp", "Instagram", "Sitio web"].map((item) => (
                  <div
                    key={item}
                    className="flex h-11 items-center justify-between rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white"
                  >
                    {item}
                    <ChevronRight className="h-4 w-4 opacity-60" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
