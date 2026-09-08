import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/vs/linktree")({
  head: () => ({
    meta: [
      { title: "Cripqer vs Linktree: Conversión vs Enlaces | Comparativa 2026" },
      { name: "description", content: "Comparativa completa: Linktree organiza enlaces, Cripqer construye conversión. QR integrado, analytics real, gestión de clientes y optimización continua." },
      { property: "og:title", content: "Cripqer vs Linktree: La Comparativa Completa" },
      { property: "og:description", content: "Descubre por qué Cripqer es más que un biolink: QR + Conversión + Analytics + Gestión integrada." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://www.cripqer.dev/vs/linktree" },
    ],
    links: [
      { rel: "canonical", href: "https://www.cripqer.dev/vs/linktree" }
    ],
  }),
  component: VsLinktreePage,
});

function VsLinktreePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FAF8F3", fontFamily: "-apple-system, sans-serif" }}>
      {/* Hero */}
      <section style={{
        background: "linear-gradient(135deg, #0B0E14 0%, #1a1a1a 100%)",
        color: "#F5F2EA",
        padding: "100px 20px 80px"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 52px)", lineHeight: 1.1, marginBottom: "24px", fontWeight: 700 }}>
            Cripqer vs Linktree
          </h1>
          <p style={{ fontSize: "20px", opacity: 0.9, maxWidth: "700px", margin: "0 auto", lineHeight: 1.5 }}>
            Linktree organiza enlaces. Cripqer construye el recorrido completo de conversión de tu negocio.
          </p>
        </div>
      </section>

      {/* Diferencia Principal */}
      <section style={{ padding: "80px 20px", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{
          background: "#fff",
          borderRadius: "24px",
          padding: "48px",
          border: "1px solid #e3ded2",
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)"
        }}>
          <h2 style={{ fontSize: "32px", marginBottom: "40px", textAlign: "center", color: "#111" }}>
            La Diferencia Fundamental
          </h2>

          <div style={{ display: "grid", gap: "32px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <div>
              <div style={{
                fontSize: "24px",
                fontWeight: 700,
                marginBottom: "16px",
                color: "#666"
              }}>
                Linktree
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "15px",
                color: "#666",
                padding: "16px",
                background: "#f8f8f8",
                borderRadius: "12px",
                marginBottom: "20px"
              }}>
                <span>Audiencia</span>
                <span>→</span>
                <span>Enlaces</span>
                <span>→</span>
                <span style={{ opacity: 0.5 }}>Te vas</span>
              </div>
              <p style={{ fontSize: "15px", color: "#666", lineHeight: 1.6 }}>
                Organiza tus enlaces en una página. Los usuarios hacen clic y salen de la plataforma.
                No mide conversión real.
              </p>
            </div>

            <div>
              <div style={{
                fontSize: "24px",
                fontWeight: 700,
                marginBottom: "16px",
                color: "#B08D57"
              }}>
                Cripqer
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "15px",
                color: "#B08D57",
                padding: "16px",
                background: "#FFF9F0",
                borderRadius: "12px",
                marginBottom: "20px",
                fontWeight: 600
              }}>
                <span>Audiencia</span>
                <span>→</span>
                <span>Conversión</span>
                <span>→</span>
                <span>Cliente</span>
                <span>→</span>
                <span>Crecimiento</span>
              </div>
              <p style={{ fontSize: "15px", color: "#4c4c4a", lineHeight: 1.6 }}>
                Construye el sistema completo: desde que te descubren hasta que se convierten en clientes recurrentes.
                Con QR integrado, analytics y gestión.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabla Comparativa */}
      <section style={{ padding: "80px 20px", background: "#F5F2EA" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "36px", marginBottom: "48px", textAlign: "center", color: "#111" }}>
            Comparativa Feature por Feature
          </h2>

          <div style={{ background: "#fff", borderRadius: "20px", overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#111", color: "#F5F2EA" }}>
                  <th style={{ padding: "20px", textAlign: "left", fontSize: "16px", fontWeight: 600 }}>Feature</th>
                  <th style={{ padding: "20px", textAlign: "center", fontSize: "16px", fontWeight: 600 }}>Linktree</th>
                  <th style={{ padding: "20px", textAlign: "center", fontSize: "16px", fontWeight: 600, background: "#B08D57", color: "#111" }}>Cripqer</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Propósito", linktree: "Organizar enlaces", cripqer: "Construir conversión completa" },
                  { feature: "QR Code incluido", linktree: "❌ Separado/Pago", cripqer: "✅ Integrado nativo" },
                  { feature: "Analytics conversión", linktree: "❌ Solo clics", cripqer: "✅ Funnel completo" },
                  { feature: "Gestión de clientes", linktree: "❌ No", cripqer: "✅ Dashboard integrado" },
                  { feature: "Página personalizable", linktree: "✅ Básico", cripqer: "✅ Editor visual completo" },
                  { feature: "Templates profesionales", linktree: "✅ Limitados", cripqer: "✅ Múltiples categorías" },
                  { feature: "A/B Testing", linktree: "❌ No", cripqer: "✅ Optimización continua" },
                  { feature: "Editar sin reimprimir QR", linktree: "N/A", cripqer: "✅ Siempre actualizable" },
                  { feature: "Retención de clientes", linktree: "❌ No", cripqer: "✅ Re-engagement tools" },
                  { feature: "Precio", linktree: "$5-29/mes", cripqer: "Gratis + Premium" },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "18px 20px", fontSize: "15px", fontWeight: 600, color: "#111" }}>{row.feature}</td>
                    <td style={{ padding: "18px 20px", textAlign: "center", fontSize: "14px", color: "#666" }}>{row.linktree}</td>
                    <td style={{ padding: "18px 20px", textAlign: "center", fontSize: "14px", fontWeight: 600, color: "#B08D57" }}>{row.cripqer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Por qué elegir Cripqer */}
      <section style={{ padding: "80px 20px", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "36px", marginBottom: "48px", textAlign: "center", color: "#111" }}>
          Por Qué Elegir Cripqer
        </h2>

        <div style={{ display: "grid", gap: "32px" }}>
          {[
            {
              titulo: "QR + Página: Todo Integrado",
              desc: "No necesitas dos herramientas. Genera tu QR y tu página en el mismo lugar. Imprime una vez, actualiza siempre."
            },
            {
              titulo: "Mide Conversión Real, No Solo Clics",
              desc: "Linktree te dice cuántos clics tuviste. Cripqer te dice cuántos se convirtieron en clientes y desde dónde llegaron."
            },
            {
              titulo: "Construye Relaciones, No Solo Tráfico",
              desc: "Dashboard de clientes, seguimiento de acciones, optimización basada en datos. Tu audiencia se convierte en negocio real."
            },
            {
              titulo: "Hecho para México y Latinoamérica",
              desc: "Interfaz en español, plantillas para negocios locales, soporte regional. No es una traducción, es nativo."
            },
          ].map((item, i) => (
            <div key={i} style={{
              background: "#fff",
              padding: "32px",
              borderRadius: "18px",
              border: "1px solid #e3ded2"
            }}>
              <h3 style={{ fontSize: "22px", marginBottom: "12px", color: "#111" }}>{item.titulo}</h3>
              <p style={{ fontSize: "16px", color: "#4c4c4a", lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Migración fácil */}
      <section style={{ padding: "80px 20px", background: "#111", color: "#F5F2EA" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "36px", marginBottom: "24px" }}>Migración Desde Linktree</h2>
          <p style={{ fontSize: "18px", opacity: 0.85, marginBottom: "40px", lineHeight: 1.6 }}>
            Copia tus enlaces, crea tu página en Cripqer, descarga tu QR y empieza a medir conversión real.
            Toma menos de 10 minutos.
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
            Empezar con Cripqer
          </a>
          <p style={{ marginTop: "20px", fontSize: "14px", opacity: 0.7 }}>
            Gratis para empezar · Sin tarjeta de crédito
          </p>
        </div>
      </section>
    </div>
  );
}
