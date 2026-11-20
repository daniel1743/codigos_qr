import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const ApprovedChatLanding = lazy(async () => {
  const module = await import("../features/approved-chat-landing");
  return { default: module.ApprovedChatLanding };
});

export const Route = createFileRoute("/")({
  component: Index,
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cripqer",
    url: "https://www.cripqer.dev/",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Conversion Optimization Platform",
    operatingSystem: "Web",
    description:
      "Plataforma de conversión completa que lleva tu audiencia desde la atención hasta cliente recurrente. QR + Biolink + Analytics + Gestión integrada.",
    featureList: [
      "Generador de Código QR",
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "250",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Puedo cambiar mis enlaces después de imprimir el QR?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. El contenido de tu página puede actualizarse sin cambiar el QR, mientras mantengas el mismo identificador público.",
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo usar varias redes en una sola página?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. Puedes reunir diferentes enlaces y plataformas en un solo destino.",
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo personalizar el diseño?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. Puedes ajustar fuentes, colores, plantillas, portada y estilos visuales según la versión disponible.",
        },
      },
      {
        "@type": "Question",
        name: "¿Puedo descargar el QR?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. La creación te lleva al editor para publicar y descargar tu código QR.",
        },
      },
    ],
  },
];

function Index() {
  const landing = <ApprovedChatLanding />;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {import.meta.env.DEV ? (
        <ClientOnly
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink/60">
              Cargando Cripqer…
            </div>
          }
        >
          {landing}
        </ClientOnly>
      ) : (
        landing
      )}
    </>
  );
}
