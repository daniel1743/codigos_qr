import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/plataforma")({
  head: () => ({
    meta: [
      { title: "Plataforma de Conversión Completa | Cripqer" },
      { name: "description", content: "Más que un generador de QR. Construye el recorrido completo: Crear → Personalizar → Publicar → Atraer → Convertir → Gestionar → Medir → Mejorar." },
      { property: "og:title", content: "Plataforma de Conversión Completa | Cripqer" },
      { property: "og:description", content: "De la atención al cliente recurrente. QR + Biolink + Analytics + Gestión integrada." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.cripqer.dev/plataforma" },
    ],
    links: [
      { rel: "canonical", href: "https://www.cripqer.dev/plataforma" }
    ],
  }),
  component: PlataformaPage,
});

function PlataformaPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAF8F3",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Hero */}
      <section style={{
        background: "linear-gradient(135deg, #0B0E14 0%, #1a1a1a 100%)",
        color: "#F5F2EA",
        padding: "80px 20px"
      }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto", textAlign: "center" }}>
          <span style={{
            fontSize: "12px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#B08D57",
            fontWeight: 700
          }}>
            PLATAFORMA COMPLETA
          </span>
          <h1 style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            lineHeight: 1.1,
            margin: "20px 0",
            fontWeight: 700
          }}>
            De la Atención al Cliente Recurrente
          </h1>
          <p style={{
            fontSize: "19px",
            maxWidth: "680px",
            margin: "20px auto 40px",
            opacity: 0.85,
            lineHeight: 1.6
          }}>
            Cripqer no organiza enlaces. Construye y opera el recorrido completo
            de conversión de tu negocio en una sola plataforma.
          </p>
          <a
            href="/editor"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "#B08D57",
              color: "#111",
              padding: "16px 32px",
              borderRadius: "999px",
              fontSize: "16px",
              fontWeight: 600,
              textDecoration: "none",
              transition: "transform 0.2s",
            }}
          >
            Empezar ahora
          </a>
        </div>
      </section>

      {/* Flujo completo */}
      <section style={{ padding: "80px 20px", maxWidth: "1120px", margin: "0 auto" }}>
        <h2 style={{
          fontSize: "clamp(28px, 5vw, 42px)",
          textAlign: "center",
          marginBottom: "60px",
          color: "#111"
        }}>
          El Recorrido Completo
        </h2>

        <div style={{ display: "grid", gap: "40px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {[
            { titulo: "CREAR", desc: "Editor visual intuitivo para construir tu página en minutos" },
            { titulo: "PERSONALIZAR", desc: "Plantillas profesionales, colores, tipografía y tu identidad" },
            { titulo: "PUBLICAR", desc: "Genera tu QR y URLs personalizadas al instante" },
            { titulo: "COMPARTIR", desc: "Imprime, descarga o comparte en redes sociales" },
            { titulo: "ATRAER", desc: "Tráfico desde QR, redes sociales, enlaces directos" },
            { titulo: "CONVERTIR", desc: "Acciones claras: WhatsApp, reservas, compras, contacto" },
            { titulo: "GESTIONAR", desc: "Dashboard con información de tus visitantes y clientes" },
            { titulo: "MEDIR", desc: "Analytics real: escaneos, visitas, conversiones, origen" },
            { titulo: "MEJORAR", desc: "Optimiza tu página con datos reales, sin reimprimir QR" },
          ].map((paso, i) => (
            <div key={i} style={{
              background: "#fff",
              padding: "32px",
              borderRadius: "18px",
              border: "1px solid #e3ded2",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
            }}>
              <div style={{
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "#B08D57",
                marginBottom: "12px"
              }}>
                {paso.titulo}
              </div>
              <p style={{
                fontSize: "15px",
                color: "#4c4c4a",
                lineHeight: 1.6,
                margin: 0
              }}>
                {paso.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparativa rápida */}
      <section style={{
        background: "#F5F2EA",
        padding: "80px 20px"
      }}>
        <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            textAlign: "center",
            marginBottom: "20px",
            color: "#111"
          }}>
            Más Que un Generador de QR
          </h2>
          <p style={{
            textAlign: "center",
            fontSize: "17px",
            color: "#4c4c4a",
            maxWidth: "600px",
            margin: "0 auto 60px"
          }}>
            Comparado con herramientas tradicionales, Cripqer ofrece el sistema completo
          </p>

          <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <div style={{
              background: "#fff",
              padding: "32px",
              borderRadius: "18px",
              border: "1px solid #e3ded2"
            }}>
              <h3 style={{ fontSize: "21px", marginBottom: "12px", color: "#111" }}>
                Generadores QR Tradicionales
              </h3>
              <p style={{ fontSize: "15px", color: "#4c4c4a", lineHeight: 1.6 }}>
                Solo generan código → Usuario escanea → Llega a URL → Fin
              </p>
              <div style={{
                marginTop: "20px",
                padding: "12px 16px",
                background: "#FFF9F0",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#8B6914"
              }}>
                ❌ Sin página personalizada<br/>
                ❌ Sin analytics<br/>
                ❌ Sin gestión de clientes
              </div>
            </div>

            <div style={{
              background: "#111",
              color: "#F5F2EA",
              padding: "32px",
              borderRadius: "18px",
              border: "2px solid #B08D57"
            }}>
              <h3 style={{ fontSize: "21px", marginBottom: "12px" }}>
                Cripqer (Plataforma Completa)
              </h3>
              <p style={{ fontSize: "15px", opacity: 0.85, lineHeight: 1.6 }}>
                QR + Página + Analytics + Conversión + Gestión + Optimización continua
              </p>
              <div style={{
                marginTop: "20px",
                padding: "12px 16px",
                background: "rgba(176,141,87,0.15)",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#B08D57"
              }}>
                ✅ Editor visual profesional<br/>
                ✅ Analytics de conversión<br/>
                ✅ Sistema de crecimiento
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section style={{ padding: "80px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2 style={{
            fontSize: "clamp(28px, 5vw, 42px)",
            marginBottom: "20px",
            color: "#111"
          }}>
            Empieza a Construir Tu Sistema de Conversión
          </h2>
          <p style={{ fontSize: "17px", color: "#4c4c4a", marginBottom: "40px" }}>
            Gratis para empezar. Sin tarjeta de crédito.
          </p>
          <a
            href="/editor"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "#B08D57",
              color: "#111",
              padding: "18px 40px",
              borderRadius: "999px",
              fontSize: "17px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Crear mi QR gratis
          </a>
        </div>
      </section>
    </div>
  );
}
