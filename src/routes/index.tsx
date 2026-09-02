import { createFileRoute } from "@tanstack/react-router";
import CripqerLanding from "../components/CripqerLanding";

export const Route = createFileRoute("/")({
  component: Index,
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Cripqer",
    "url": "https://www.cripqer.dev/",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "All",
    "description": "Generador de códigos QR con página web personalizable para enlaces, WhatsApp y redes sociales.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
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
          "text": "Sí. El contenido de tu página puede actualizarse sin cambiar el QR, mientras mantengas el mismo identificador público.",
        },
      },
      {
        "@type": "Question",
        "name": "¿Puedo usar varias redes en una sola página?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí. Puedes reunir diferentes enlaces y plataformas en un solo destino.",
        },
      },
      {
        "@type": "Question",
        "name": "¿Puedo personalizar el diseño?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí. Puedes ajustar fuentes, colores, plantillas, portada y estilos visuales según la versión disponible.",
        },
      },
      {
        "@type": "Question",
        "name": "¿Puedo descargar el QR?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sí. La creación te lleva al editor para publicar y descargar tu código QR.",
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
