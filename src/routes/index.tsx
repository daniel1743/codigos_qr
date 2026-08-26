"use client";

/**
 * Graphite Atelier: landing editorial en grafito, cobre y objetos de producto asimétricos.
 * Toda interacción de producto es demostrativa; no se simulan servicios ni datos reales.
 */
import { createFileRoute } from "@tanstack/react-router";
import { CripqerMark } from "@/components/CripqerMark";
import "../landing-graphite.css";
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  Eye,
  FileLock2,
  Globe2,
  Instagram,
  LayoutTemplate,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

const assets = {
  hero: "/assets/cripqer/hero-main.png",
  qr: "/assets/cripqer/qr-material-study.png",
  templates: "/assets/cripqer/templates-composition.png",
  securePanel: "/assets/cripqer/secure-documents-panel.png",
  securityVault: "/assets/cripqer/security-vault-visual.png",
};

const serviceData = [
  {
    number: "01",
    title: "QR personalizados",
    description: "Diseña códigos QR visualmente personalizados para compartir información y dirigir a cada persona a la experiencia adecuada.",
    items: ["Color y patrones", "Finders y ojos", "Marcos", "Logo central", "Preview en vivo", "Exportación"],
    icon: QrCode,
    type: "qr",
  },
  {
    number: "02",
    title: "Tu página. Tu identidad.",
    description: "Construye una micro-landing para presentar lo que haces, centralizar enlaces y dar una primera impresión coherente.",
    items: ["Avatar y bio", "Botones", "Redes sociales", "CTAs inteligentes", "Apariencia", "Vista móvil"],
    icon: UserRound,
    type: "profile",
  },
  {
    number: "03",
    title: "Plantillas para cada estilo",
    description: "Empieza con un diseño profesional y personalízalo para que la forma de presentar tu presencia también hable de ti.",
    items: ["Biblioteca", "Diseños premium", "Temas visuales", "Estilos de botón", "Personalización", "Preview"],
    icon: LayoutTemplate,
    type: "templates",
  },
  {
    number: "04",
    title: "Documentos seguros",
    description: "Comparte archivos mediante enlaces y QR con una capa de protección diseñada para controlar el acceso.",
    items: ["Archivos cifrados", "Contraseña", "Expiración", "Límites", "Acceso QR", "Registro"],
    icon: FileLock2,
    type: "secure",
  },
];

const actionData = [
  { label: "Website", example: "Visitar sitio", icon: Globe2 },
  { label: "WhatsApp", example: "Enviar mensaje", icon: MessageCircle },
  { label: "Teléfono", example: "Llamar", icon: Phone },
  { label: "Email", example: "Enviar correo", icon: Mail },
  { label: "Ubicación", example: "Abrir mapa", icon: MapPin },
  { label: "Reserva", example: "Reservar", icon: CalendarDays },
  { label: "Descarga", example: "Descargar", icon: Download },
];

function hideMissingAsset(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true;
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`wordmark ${light ? "wordmark-light" : ""}`}>
      crip<span className="wordmark-q">q</span><span className="wordmark-e">e</span>r
    </span>
  );
}

function SectionLead({ eyebrow, number, title, copy }: { eyebrow: string; number?: string; title: ReactNode; copy?: string }) {
  return (
    <div className="section-lead reveal">
      <div className="section-register">
        <span className="signal-dot" />
        {eyebrow}
        {number && <span className="section-number">/{number}</span>}
      </div>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function QrVisual({ copper = false }: { copper?: boolean }) {
  const cells = [
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
    [0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0],
    [1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1],
    [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0],
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    [0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0],
    [1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  ].flat();
  return (
    <div className={`qr-visual ${copper ? "qr-copper" : ""}`} aria-label="Código QR decorativo">
      {cells.map((filled, index) => <i key={index} className={filled ? "is-filled" : ""} />)}
      <span className="qr-mark" />
    </div>
  );
}

function PhonePreview({ selected = false }: { selected?: boolean }) {
  return (
    <div className="phone-preview" aria-label="Vista previa de perfil digital">
      <div className="phone-top"><span /><b /></div>
      <div className="profile-canvas">
        <div className="profile-avatar">AM</div>
        <strong>Alex Morgan</strong>
        <p>Designing clearer digital moments.</p>
        <div className={`profile-link ${selected ? "is-selected" : ""}`}><Globe2 size={13} /> Portfolio <ChevronRight size={13} /></div>
        <div className="profile-link"><MessageCircle size={13} /> Escribir mensaje <ChevronRight size={13} /></div>
        <div className="profile-link"><CalendarDays size={13} /> Reservar una reunión <ChevronRight size={13} /></div>
        <div className="profile-socials"><Instagram size={13} /><Globe2 size={13} /><Mail size={13} /></div>
      </div>
      <div className="phone-home" />
    </div>
  );
}

function QrCustomizer() {
  return (
    <div className="qr-customizer">
      <div className="customizer-toolbar"><span>PERSONALIZAR</span><span className="toolbar-live"><i /> LIVE</span></div>
      <div className="customizer-body">
        <div className="customizer-controls">
          <p>Color principal</p>
          <div className="swatches"><i className="swatch copper" /><i className="swatch ink active" /><i className="swatch smoke" /><i className="swatch mist" /></div>
          <p>Marcadores</p>
          <div className="finder-row"><span className="finder-choice active"><b /></span><span className="finder-choice round"><b /></span><span className="finder-choice dot"><b /></span></div>
          <p>Marco</p>
          <div className="frame-choice"><span>●</span> Mi presencia, en un QR <ChevronRight size={12} /></div>
        </div>
        <div className="customizer-result"><div className="qr-plaque"><QrVisual copper /></div><span>PREVIEW</span></div>
      </div>
    </div>
  );
}

function TemplateStack() {
  return (
    <div className="template-stack" aria-label="Galería de plantillas">
      <div className="template-card template-white"><span>AW</span><b>Alex Wilson</b><i /><i /><i /></div>
      <div className="template-card template-blue"><span>AL</span><b>Atelier Lumen</b><i /><i /><i /></div>
      <div className="template-card template-gold"><span>JM</span><b>Josephine M.</b><i /><i /><i /></div>
    </div>
  );
}

function SecurePanel() {
  return (
    <div className="secure-panel">
      <div className="secure-file"><div className="secure-file-type">PDF</div><div><b>Propuesta_2026</b><span>2.4 MB · protegido</span></div><Check size={15} /></div>
      <div className="security-state"><div className="shield-object"><ShieldCheck size={34} /></div><div><span>ESTADO DE ACCESO</span><b>Protegido</b><p>Contraseña + expiración activa</p></div></div>
      <div className="secure-meta"><span><LockKeyhole size={13} /> Cifrado</span><span><ScanLine size={13} /> Acceso QR</span><span><CalendarDays size={13} /> 18 días</span></div>
    </div>
  );
}

function HeroScene() {
  return (
    <div className="hero-scene" aria-label="Escena de producto Cripqer">
      <img className="hero-art" src={assets.hero} alt="Composición abstracta de objetos digitales Cripqer" onError={hideMissingAsset} />
      <div className="scene-halo" />
      <div className="scene-phone"><PhonePreview /></div>
      <div className="scene-qr"><div className="scene-card-label"><ScanLine size={12} /> QR ACTIVO</div><div className="scene-qr-core"><QrVisual copper /></div><span>CRIPQER / 09.26</span></div>
      <div className="scene-file"><FileLock2 size={16} /><div><b>Brief_Identidad.pdf</b><span>Seguro · 2,4 MB</span></div><ShieldCheck size={16} /></div>
      <div className="scene-template"><span>03</span><div><i /><i /><i /></div><b>Plantilla</b></div>
      <div className="scene-tag"><Sparkles size={13} /> PÁGINA LISTA</div>
    </div>
  );
}

function ServiceVisual({ type }: { type: string }) {
  if (type === "qr") return <div className="product-visual qr-showcase" data-state="CUSTOMIZE / 01"><img src={assets.qr} alt="Estudio visual de un QR personalizado" onError={hideMissingAsset} /><QrCustomizer /></div>;
  if (type === "profile") return <div className="product-visual profile-showcase" data-state="PROFILE / LIVE"><div className="soft-light" /><PhonePreview selected /><div className="profile-badge"><Eye size={14} /><span><b>Vista en vivo</b> Cada cambio es inmediato</span></div></div>;
  if (type === "templates") return <div className="product-visual template-showcase" data-state="THEMES / 12"><img src={assets.templates} alt="Composición de plantillas premium" onError={hideMissingAsset} /><TemplateStack /><div className="template-caption"><LayoutTemplate size={14} /> 12 temas listos para personalizar</div></div>;
  return <div className="product-visual security-showcase" data-state="ACCESS / LOCKED"><img src={assets.securePanel} alt="Visual de seguridad para documentos" onError={hideMissingAsset} /><SecurePanel /></div>;
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigateTo = (id: string) => {
    setMenuOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="cripqer-site">
      <header className="site-header">
        <div className="nav-shell">
          <button className="brand-lockup" onClick={() => navigateTo("#inicio")} aria-label="Ir al inicio de Cripqer">
            <span className="brand-mark-shell"><CripqerMark className="brand-mark-fallback" /></span>
            <Wordmark />
          </button>
          <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegación principal">
            <button onClick={() => navigateTo("#inicio")}>Inicio</button>
            <a href="/editor" onClick={() => setMenuOpen(false)}>QR</a>
            <a href="/template-bank" onClick={() => setMenuOpen(false)}>Plantillas</a>
            <a href="/template-builder" onClick={() => setMenuOpen(false)}>Editor</a>
            <a href="/encrypted-documents" onClick={() => setMenuOpen(false)}>Seguridad</a>
          </nav>
          <div className="nav-actions">
            <a className="nav-login" href="/profile">Iniciar sesión</a>
            <a className="nav-primary" href="/profile">Crear gratis <ArrowRight size={15} /></a>
          </div>
          <button className="menu-toggle" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <section id="inicio" className="hero-section">
        <div className="technical-grid hero-grid" />
        <div className="hero-wrap">
          <div className="hero-copy reveal">
            <div className="eyebrow"><span className="signal-dot" /> TODO CONECTADO. TODO TUYO.</div>
            <h1>Tu identidad digital,<br /><em>conectada</em> con un QR.</h1>
            <p>Crea códigos QR personalizados, páginas de perfil, experiencias digitales y documentos seguros desde una sola plataforma.</p>
            <div className="hero-actions"><a className="button-primary" href="/editor">Crear mi QR <ArrowRight size={17} /></a><button className="button-ghost" onClick={() => navigateTo("#features")}>Explorar Cripqer <ArrowDown size={16} /></button></div>
            <div className="hero-meta"><span><i /> Sin código</span><span><i /> Publica en segundos</span></div>
            <div className="hero-mark-code"><CripqerMark /><span>OPEN MODULE / IDENTITY SYSTEM</span></div>
          </div>
          <HeroScene />
        </div>
        <div className="hero-baseline"><span>01 — CRIPQER PLATFORM</span><div /><span>IDENTIDAD / QR / CONTROL</span></div>
      </section>

      <section className="trust-strip" aria-label="Capacidades de Cripqer">
        <p>Una plataforma. Múltiples formas de conectar.</p>
        <div>{["QR personalizados", "Landing pages", "Plantillas premium", "Documentos seguros", "Identidad digital"].map((item) => <span key={item}><b /> {item}</span>)}</div>
      </section>

      <section id="services" className="services-section">
        <div className="section-frame inspection-frame" data-register="CHAPTER / 02">
          <SectionLead eyebrow="SERVICIOS" number="02" title={<>Todo lo que necesitas para conectar el mundo físico con tu presencia digital.</>} copy="Cripqer reúne herramientas de identidad, contenido y seguridad en una experiencia simple y coherente." />
          <div className="services-list">
            {serviceData.map((service, index) => {
              const Icon = service.icon;
              return <article className={`service-row service-${service.type}`} key={service.title}>
                <div className="service-information reveal">
                  <div className="service-index"><span>{service.number}</span><Icon size={18} /></div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <ul>{service.items.map((item) => <li key={item}><Check size={13} /> {item}</li>)}</ul>
                  <a className="text-link" href={service.type === "qr" ? "/editor" : service.type === "profile" ? "/template-builder" : service.type === "templates" ? "/template-bank" : "/encrypted-documents"}>Inspeccionar herramienta <ArrowRight size={15} /></a>
                </div>
                <ServiceVisual type={service.type} />
              </article>;
            })}
          </div>
        </div>
      </section>

      <section id="features" className="editor-section">
        <div className="technical-grid" />
        <div className="section-frame editor-wrap inspection-frame" data-register="CHAPTER / 03">
          <SectionLead eyebrow="EDITOR VISUAL" number="03" title={<>Diseña visualmente.<br />Publica en segundos.</>} copy="Una experiencia de edición para modificar contenido, estilo y disposición mientras observas el resultado." />
          <div className="editor-window reveal">
            <aside className="editor-sidebar"><div className="editor-brand"><CripqerMark /> <span>editor</span></div><div className="editor-tabs"><button className="active"><UserRound /> Contenido</button><button><UserRound /> Avatar</button><button><LayoutTemplate /> Bio</button><button><ChevronRight /> Botones</button><button><Instagram /> Redes</button><button><Sparkles /> Apariencia</button></div><div className="editor-save"><span><i /> Cambios guardados</span><a href="/template-builder">Publicar <ArrowRight size={14} /></a></div></aside>
            <div className="editor-workspace"><div className="workspace-bar"><span>PREVIEW MÓVIL</span><div><i /><i /><i /></div></div><div className="workspace-canvas"><div className="selection-note"><span /><b>Botón seleccionado</b><small>Arrastra para mover</small></div><PhonePreview selected /></div></div>
          </div>
        </div>
      </section>

      <section className="actions-section">
        <div className="section-frame actions-wrap inspection-frame" data-register="CHAPTER / 04">
          <SectionLead eyebrow="MÁS QUE SIMPLES ENLACES" number="04" title={<>Convierte cada botón en una <em>acción.</em></>} copy="Los botones pueden dirigir a cada persona directamente hacia diferentes acciones digitales." />
          <div className="action-stack reveal">
            {actionData.map((action, index) => { const Icon = action.icon; return <a className="action-item" style={{ "--delay": `${index * 45}ms` } as CSSProperties} key={action.label} href="/template-builder"><span className="action-icon"><Icon size={18} /></span><span><b>{action.label}</b><small>{action.example}</small></span><ChevronRight size={17} /></a>; })}
          </div>
        </div>
      </section>

      <section id="seguridad" className="security-section">
        <div className="technical-grid" />
        <div className="section-frame security-wrap inspection-frame" data-register="CHAPTER / 05">
          <div className="security-copy reveal"><div className="eyebrow"><span className="signal-dot" /> CRIPQER SECURITY</div><h2>Cuando compartir también necesita <em>protección.</em></h2><p>Documentos Seguros añade una capa especializada para el envío de archivos mediante enlaces y QR.</p><div className="security-badges">{["Cifrado", "Contraseña", "Expiración", "Control de descargas"].map((badge) => <span key={badge}><ShieldCheck size={14} /> {badge}</span>)}</div><a className="button-primary" href="/encrypted-documents">Abrir Documentos Seguros <ArrowRight size={17} /></a></div>
          <div className="security-object reveal"><img src={assets.securityVault} alt="Objeto visual de un archivo protegido" onError={hideMissingAsset} /><div className="security-ring"><ShieldCheck size={30} /></div><div className="security-status"><span><i /> ENCRIPTADO</span><b>Acceso protegido</b><small>Política activa · 18 días</small></div></div>
        </div>
      </section>

      <section id="plantillas" className="templates-section">
        <div className="section-frame inspection-frame" data-register="CHAPTER / 06">
          <SectionLead eyebrow="PLANTILLAS" number="05" title={<>Empieza con una gran <em>primera impresión.</em></>} />
          <div className="template-gallery reveal">
            {[ ["Black + Gold", "Luxury", "template-luxury"], ["Platinum", "Professional", "template-platinum"], ["Executive Blue", "Business", "template-executive"], ["Rose Gold", "Creator", "template-rose"], ["Premium White", "Minimal", "template-minimal"] ].map(([name, category, style], index) => <article className={`gallery-template ${style}`} data-template={`0${index + 1} / 05`} key={name}><div className="gallery-profile"><span>{index === 0 ? "JM" : index === 1 ? "VL" : index === 2 ? "MH" : index === 3 ? "RS" : "AK"}</span><b>{name}</b><i /><i /><i /><small>cripqer.me</small></div><div className="gallery-caption"><span>{category}</span><a href="/template-bank">Preview <ArrowRight size={13} /></a></div></article>)}
          </div>
          <div className="templates-cta"><p>Una biblioteca de puntos de partida para tu presencia conectada.</p><a className="text-link" href="/template-bank">Inspeccionar biblioteca <ArrowRight size={15} /></a></div>
        </div>
      </section>

      <section className="use-cases-section">
        <div className="section-frame inspection-frame" data-register="CHAPTER / 07"><SectionLead eyebrow="PARA PERSONAS Y NEGOCIOS" number="07" title={<>Una identidad digital que <em>viaja contigo.</em></>} />
          <div className="use-case-grid reveal">{[["01", "Profesionales", "Comparte perfil, contacto, servicios y redes.", UserRound], ["02", "Creadores", "Centraliza contenido, redes y llamadas a la acción.", Sparkles], ["03", "Negocios", "Conecta clientes con información, productos y canales.", QrCode], ["04", "Equipos", "Comparte recursos y experiencias digitales consistentes.", Globe2]].map(([number, title, description, Icon]) => { const Mark = Icon as typeof Globe2; return <article key={title as string}><div><span>{number as string}</span><Mark size={20} /></div><h3>{title as string}</h3><p>{description as string}</p><a href="/template-builder" aria-label={`Explorar ${title as string}`}><ArrowRight size={17} /></a></article>; })}</div>
        </div>
      </section>

      <section className="final-cta-section"><div className="cta-orbit cta-orbit-one" /><div className="cta-orbit cta-orbit-two" /><div className="final-cta-card reveal"><div className="final-mark"><CripqerMark /></div><div className="eyebrow"><span className="signal-dot" /> TU PRESENCIA, CONECTADA</div><h2>Tu próximo QR puede<br />hacer mucho más.</h2><p>Construye tu identidad digital y conecta todo desde Cripqer.</p><div><a className="button-primary" href="/profile">Crear gratis <ArrowRight size={17} /></a><a className="button-ghost" href="/template-bank">Ver plantillas</a></div></div></section>

      <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><div className="brand-lockup"><span className="brand-mark-shell"><CripqerMark className="brand-mark-fallback" /></span><Wordmark light /></div><p>Identidad digital conectada mediante QR, perfiles, plantillas y documentos seguros.</p></div><div className="footer-links"><div><h3>Producto</h3>{[["QR", "/editor"], ["Editor", "/template-builder"], ["Plantillas", "/template-bank"], ["Documentos Seguros", "/encrypted-documents"]].map(([link, route]) => <a href={route} key={link}>{link}</a>)}</div><div><h3>Recursos</h3>{["Ayuda", "Privacidad", "Términos"].map((link) => <button onClick={() => navigateTo("#inicio")} key={link}>{link}</button>)}</div><div><h3>Cuenta</h3>{[["Iniciar sesión", "/profile"], ["Crear cuenta", "/profile"]].map(([link, route]) => <a href={route} key={link}>{link}</a>)}</div></div></div><div className="footer-bottom"><span>© 2026 Cripqer</span><span>Diseñado para conectar con precisión.</span></div></footer>
    </main>
  );
}
