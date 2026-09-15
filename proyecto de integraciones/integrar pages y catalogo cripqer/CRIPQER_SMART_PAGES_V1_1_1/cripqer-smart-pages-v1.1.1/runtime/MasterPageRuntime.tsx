/**
 * CRIPQER SMART PAGES V1.1 — Master Page Runtime.
 *
 * Deterministically renders a RuntimePageConfigV1. It performs NO design
 * generation: Engine V2 stays the visual brain, Power Editor 2 stays the
 * editor. Checkout is contract-only and never rendered in V1.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import type { CatalogItemV1, CatalogV1, SalesActionV1 } from "../catalog.types";
import type { RuntimePageConfigV1, SectionPlanV1 } from "../smart-pages.types";
import type { AnalyticsEventV1, AnalyticsHandler, NavItemV1 } from "../ecosystem";
import { destinationHref } from "../ecosystem";
import { actionHref, resolveItemAction, type ActionContextV1 } from "../sales-actions";
import {
  AboutBlock,
  ActionButton,
  CategoryNav,
  ContactBlock,
  CtaBanner,
  Faq,
  FeaturedShowcase,
  FilterBar,
  Footer,
  Gallery,
  Hero,
  ItemDetail,
  ItemGrid,
  Location,
  MenuSections,
  MissionVision,
  Navbar,
  PricingList,
  SearchBox,
  Section,
  Team,
  Testimonials,
  WhyUs,
  type CardVariant,
  type ItemActionView,
} from "./blocks";

const VARIANT_BY_SECTION: Record<string, CardVariant> = {
  productGrid: "product",
  serviceGrid: "service",
  portfolioGrid: "portfolio",
  listingGrid: "listing",
  featured: "product",
};

const ANALYTICS_BY_ACTION: Record<string, AnalyticsEventV1["type"]> = {
  whatsapp: "whatsapp_click",
  contact: "contact_click",
  email: "contact_click",
  call: "contact_click",
  quote: "quote_click",
  external_booking: "booking_click",
  external_url: "external_link_click",
};

export interface MasterPageRuntimeProps {
  config: RuntimePageConfigV1;
  /** Host analytics hook. The runtime never persists or transmits anything. */
  onAnalyticsEvent?: AnalyticsHandler;
  /** Host navigation hook for internal_page destinations. */
  onNavigate?: (item: NavItemV1) => void;
  /** Legacy lightweight hook kept for backwards compatibility. */
  onAction?: (event: { kind: string; itemId?: string }) => void;
}

export function MasterPageRuntime({
  config,
  onAnalyticsEvent,
  onNavigate,
  onAction,
}: MasterPageRuntimeProps) {
  const { plan, content, theme, ecosystem } = config;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<CatalogItemV1 | null>(null);

  const track = useCallback(
    (event: Omit<AnalyticsEventV1, "pageId">) => {
      const payload: AnalyticsEventV1 = { ...event, pageId: plan.pageId };
      if (ecosystem?.analyticsContext) {
        payload.metadata = { ...(ecosystem.analyticsContext ?? {}), ...(event.metadata ?? {}) };
      }
      onAnalyticsEvent?.(payload);
      onAction?.({ kind: event.type, ...(event.itemId ? { itemId: event.itemId } : {}) });
    },
    [plan.pageId, ecosystem, onAnalyticsEvent, onAction],
  );

  const catalog: CatalogV1 | undefined = useMemo(() => {
    const bound = plan.sections.find((s) => s.binding?.catalogId)?.binding?.catalogId;
    return content.catalogs.find((c) => c.id === bound) ?? content.catalogs[0];
  }, [plan, content]);

  const allItems = useMemo(() => (catalog?.items ?? []).filter((item) => item.enabled), [catalog]);

  const filterDefs = useMemo(() => {
    const map = new Map<string, { key: string; label: string; values: Set<string> }>();
    for (const item of allItems) {
      for (const attribute of item.attributes) {
        const entry = map.get(attribute.key) ?? {
          key: attribute.key,
          label: attribute.label,
          values: new Set<string>(),
        };
        entry.values.add(attribute.value);
        map.set(attribute.key, entry);
      }
    }
    return Array.from(map.values())
      .filter((entry) => entry.values.size > 1 && entry.values.size <= 6)
      .slice(0, 3)
      .map((entry) => ({ key: entry.key, label: entry.label, values: Array.from(entry.values) }));
  }, [allItems]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allItems.filter((item) => {
      if (activeCategory && item.categoryId !== activeCategory) return false;
      if (
        normalizedQuery &&
        !`${item.name} ${item.description ?? ""}`.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue;
        if (!item.attributes.some((a) => a.key === key && a.value === value)) return false;
      }
      return true;
    });
  }, [allItems, activeCategory, query, filters]);

  const style = {
    "--sp-accent": theme.accent,
    "--sp-accent-contrast": theme.accentContrast,
    "--sp-bg": theme.background,
    "--sp-surface": theme.surface,
    "--sp-surface-alt": theme.surfaceAlt,
    "--sp-text": theme.text,
    "--sp-muted": theme.mutedText,
    "--sp-border": theme.border,
    "--sp-radius": theme.radius,
    "--sp-radius-sm": theme.radiusSm,
    "--sp-shadow": theme.shadow,
    "--sp-shadow-strong": theme.shadowStrong,
    "--sp-heading-font": theme.headingFont,
    "--sp-body-font": theme.bodyFont,
    "--sp-section-space": theme.sectionSpacing,
    "--sp-content-width": theme.contentWidth,
    "--sp-btn-radius": theme.buttonRadius,
  } as CSSProperties;

  const ctx: ActionContextV1 = {
    businessName: content.business.name,
    ...(content.contact.phone ? { contactPhone: content.contact.phone } : {}),
    ...(content.contact.email ? { contactEmail: content.contact.email } : {}),
    ...(content.contact.whatsapp ? { contactWhatsapp: content.contact.whatsapp } : {}),
    ...(content.contact.bookingUrl ? { bookingUrl: content.contact.bookingUrl } : {}),
  };

  const hrefForAction = (action: SalesActionV1) => actionHref(action, ctx);

  const primary = plan.ctaHierarchy.primary;

  /** item.action -> item.salesMode -> section default -> page CTA. */
  const actionForItem = useCallback(
    (item: CatalogItemV1, sectionAction?: SalesActionV1): ItemActionView => {
      const resolved = resolveItemAction(item, ctx, {
        ...(sectionAction ? { sectionAction } : {}),
        globalAction: primary,
      });
      return { label: resolved.action.label, href: resolved.href };
    },
    // ctx is derived from content; primary from the plan.
    [content, primary],
  );

  const openDetail = (item: CatalogItemV1) => {
    setDetail(item);
    track({ type: "item_click", itemId: item.id });
  };

  const actOnItem = (item: CatalogItemV1) => {
    const resolved = resolveItemAction(item, ctx, { globalAction: primary });
    track({
      type: ANALYTICS_BY_ACTION[resolved.action.kind] ?? "cta_click",
      itemId: item.id,
      action: resolved.action.kind,
    });
  };

  const trackCta = (action: SalesActionV1, sectionId?: string) =>
    track({
      type: ANALYTICS_BY_ACTION[action.kind] ?? "cta_click",
      action: action.kind,
      ...(sectionId ? { sectionId } : {}),
    });

  const navigate = (item: NavItemV1) => {
    if (item.destination.mode === "section") {
      track({ type: "section_view", sectionId: item.destination.sectionId, action: "nav" });
      if (typeof document !== "undefined") {
        document
          .getElementById(item.destination.sectionId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (item.destination.mode === "internal_page") {
      track({ type: "internal_page_click", action: item.destination.pageId });
      onNavigate?.(item);
      return;
    }
    track({ type: "external_link_click", action: item.destination.url });
    const href = destinationHref(item.destination, ecosystem ? { ...(ecosystem.publicBaseUrl ? { publicBaseUrl: ecosystem.publicBaseUrl } : {}) } : undefined);
    if (onNavigate) onNavigate(item);
    else if (href && typeof window !== "undefined") window.open(href, "_blank", "noopener");
  };

  const heroActions = (
    <>
      <ActionButton
        action={primary}
        href={hrefForAction(primary)}
        variant="primary"
        onClick={() => trackCta(primary)}
      />
      {plan.ctaHierarchy.secondary.map((action) => (
        <ActionButton
          key={`${action.kind}_${action.label}`}
          action={action}
          href={hrefForAction(action)}
          variant="secondary"
          onClick={() => trackCta(action)}
        />
      ))}
    </>
  );

  const navItems = plan.navigation ?? [];

  function renderSection(section: SectionPlanV1) {
    const variant = VARIANT_BY_SECTION[section.kind] ?? "product";
    switch (section.kind) {
      case "hero":
        return (
          <Hero
            key={section.id}
            variant={plan.heroVariant ?? "centered"}
            name={content.business.name}
            professionalName={content.business.professionalName}
            category={content.business.category}
            location={content.business.location}
            tagline={content.business.tagline}
            about={undefined}
            cover={content.business.cover}
            logo={content.business.logo}
            avatar={content.business.avatar}
            badges={content.business.badges}
            actions={heroActions}
          />
        );
      case "about":
        return (
          <Section key={section.id} id={section.id} title={section.title} alt narrow>
            <AboutBlock text={content.business.about ?? ""} media={content.business.cover} />
          </Section>
        );
      case "missionVision":
        return (
          <Section key={section.id} id={section.id} title={section.title}>
            <MissionVision
              mission={content.business.mission}
              vision={content.business.vision}
              values={content.business.values}
            />
          </Section>
        );
      case "whyUs":
        return (
          <Section key={section.id} id={section.id} title={section.title} alt>
            <WhyUs items={content.business.differentiators ?? []} />
          </Section>
        );
      case "categoryNav":
        return (
          <Section key={section.id} id={section.id} compact>
            <CategoryNav
              categories={catalog?.categories ?? []}
              activeId={activeCategory}
              onSelect={setActiveCategory}
            />
          </Section>
        );
      case "search":
        return (
          <Section key={section.id} id={section.id} compact>
            <SearchBox value={query} onChange={setQuery} />
          </Section>
        );
      case "filterBar":
        return (
          <Section key={section.id} id={section.id} compact>
            <FilterBar
              filters={filterDefs}
              active={filters}
              onToggle={(key, value) =>
                setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? "" : value }))
              }
            />
          </Section>
        );
      case "featured":
        return (
          <Section key={section.id} id={section.id} title={section.title}>
            <FeaturedShowcase
              items={allItems.filter((item) => item.featured).slice(0, section.binding?.limit ?? 4)}
              variant={variant}
              actionFor={(item) => actionForItem(item)}
              onOpen={openDetail}
              onAct={actOnItem}
              emptyLabel="Nothing featured yet."
            />
          </Section>
        );
      case "productGrid":
      case "serviceGrid":
      case "portfolioGrid":
      case "listingGrid":
        return (
          <Section key={section.id} id={section.id} title={section.title}>
            <ItemGrid
              items={visibleItems}
              variant={variant}
              actionFor={(item) => actionForItem(item)}
              onOpen={openDetail}
              onAct={actOnItem}
              emptyLabel="Nothing matches your selection."
            />
          </Section>
        );
      case "menuSections":
        return (
          <Section key={section.id} id={section.id} title={section.title}>
            <MenuSections
              categories={
                activeCategory
                  ? (catalog?.categories ?? []).filter((c) => c.id === activeCategory)
                  : (catalog?.categories ?? [])
              }
              items={visibleItems}
              actionFor={(item) => actionForItem(item)}
              onOpen={openDetail}
              onAct={actOnItem}
            />
          </Section>
        );
      case "gallery":
        return (
          <Section key={section.id} id={section.id} title={section.title} alt>
            <Gallery media={content.gallery} />
          </Section>
        );
      case "pricing":
        return (
          <Section key={section.id} id={section.id} title={section.title} alt narrow>
            <PricingList items={allItems} />
          </Section>
        );
      case "team":
        return (
          <Section key={section.id} id={section.id} title={section.title}>
            <Team members={content.team} />
          </Section>
        );
      case "testimonials":
        return (
          <Section key={section.id} id={section.id} title={section.title} alt>
            <Testimonials testimonials={content.testimonials} />
          </Section>
        );
      case "faq":
        return (
          <Section key={section.id} id={section.id} title={section.title} narrow>
            <Faq entries={content.faq} />
          </Section>
        );
      case "location":
        return (
          <Section key={section.id} id={section.id} title={section.title} alt narrow>
            <Location contact={content.contact} />
          </Section>
        );
      case "contact":
        return (
          <Section key={section.id} id={section.id} title={section.title} narrow>
            <ContactBlock contact={content.contact} />
          </Section>
        );
      case "whatsappCta":
      case "quoteCta":
      case "bookingCta": {
        const wanted =
          section.kind === "whatsappCta"
            ? "whatsapp"
            : section.kind === "quoteCta"
              ? "quote"
              : "external_booking";
        const action =
          plan.ctaHierarchy.primary.kind === wanted
            ? plan.ctaHierarchy.primary
            : (plan.ctaHierarchy.secondary.find((a) => a.kind === wanted) ??
              plan.ctaHierarchy.primary);
        const href = hrefForAction(action);
        if (!href) return null;
        const title =
          section.kind === "whatsappCta"
            ? "Talk to us on WhatsApp"
            : section.kind === "quoteCta"
              ? "Request a quote"
              : "Book an appointment";
        return (
          <Section key={section.id} id={section.id}>
            <CtaBanner title={title}>
              <ActionButton
                action={action}
                href={href}
                variant="primary"
                onClick={() => trackCta(action, section.id)}
              />
            </CtaBanner>
          </Section>
        );
      }
      case "footer":
        return (
          <Footer
            key={section.id}
            name={content.business.name}
            description={content.business.tagline}
            logo={content.business.logo}
            nav={navItems}
            contact={content.contact}
            onNavigate={navigate}
          />
        );
      default:
        return null;
    }
  }

  const detailAction = detail ? actionForItem(detail) : null;

  return (
    <div className="sp-root" style={style}>
      <Navbar
        brandName={content.business.name}
        logo={content.business.logo ?? content.business.avatar}
        items={navItems}
        sticky={theme.stickyNav}
        cta={
          hrefForAction(primary) ? (
            <ActionButton
              action={primary}
              href={hrefForAction(primary)}
              variant="primary"
              size="sm"
              onClick={() => trackCta(primary)}
            />
          ) : null
        }
        onNavigate={navigate}
      />
      {plan.sections.map(renderSection)}
      {detail && detailAction ? (
        <ItemDetail item={detail} action={detailAction} onAct={actOnItem} onClose={() => setDetail(null)} />
      ) : null}
    </div>
  );
}

export default MasterPageRuntime;
