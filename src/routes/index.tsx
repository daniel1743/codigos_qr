import { createFileRoute } from "@tanstack/react-router";
import CripqerLanding from "../components/CripqerLanding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cripqer | Generador de QR, Páginas y Conversión Inteligente" },
      {
        name: "description",
        content:
          "Crea códigos QR y páginas inteligentes con Cripqer: atrae tráfico, convierte visitantes en clientes y mide resultados con analytics. Tu plataforma de conversión.",
      },
      { name: "robots", content: "index, follow" },
      {
        property: "og:title",
        content: "Cripqer | Generador de QR, Páginas y Conversión Inteligente",
      },
      {
        property: "og:description",
        content:
          "Crea códigos QR y páginas inteligentes, convierte visitantes en clientes y mide resultados en una sola plataforma.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.cripqer.dev/" },
      { property: "og:site_name", content: "Cripqer" },
    ],
    links: [{ rel: "canonical", href: "https://www.cripqer.dev/" }],
  }),
  component: Index,
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Cripqer",
    url: "https://www.cripqer.dev/",
    logo: "https://www.cripqer.dev/brand-assets/cripqer-icon-512.png",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Cripqer",
    url: "https://www.cripqer.dev/",
    inLanguage: "es",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Cripqer | Generador de QR, Páginas y Conversión Inteligente",
    url: "https://www.cripqer.dev/",
    inLanguage: "es",
    isPartOf: { "@type": "WebSite", url: "https://www.cripqer.dev/" },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cripqer",
    url: "https://www.cripqer.dev/",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Conversion Optimization Platform",
    operatingSystem: "Web",
    description:
      "Plataforma de conversión que integra códigos QR, páginas inteligentes, analytics y gestión: del primer escaneo al cliente recurrente.",
    featureList: [
      "Generador de Código QR",
      "Páginas inteligentes (biolink)",
      "Optimización de Conversión",
      "Analytics y Métricas",
      "Gestión de Clientes",
      "A/B Testing",
      "Compartir Multicanal",
      "Retención de Clientes",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Cripqer es un generador de QR?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "El QR es solo el punto de acceso. Lo que creas con Cripqer es la experiencia digital que aparece después del escaneo: tu identidad, tus enlaces y tu presentación visual.",
        },
      },
      {
        "@type": "Question",
        name: "¿Necesito saber de diseño o programación?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Partes de una plantilla profesional y la personalizas en un editor visual: eliges, ajustas y publicas.",
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo cambiar el contenido después de imprimir el QR?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. Tu presencia digital puede evolucionar — textos, enlaces, fotos, estilo — mientras el QR sigue siendo el mismo punto de acceso.",
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo compartir algo privado con un QR?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. Además de la presencia pública, Cripqer incluye un flujo de acceso protegido con contraseña para documentos y contenido que no quieres que sea público.",
        },
      },
    ],
  },
];

function Index() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CripqerLanding />
    </>
  );
}
