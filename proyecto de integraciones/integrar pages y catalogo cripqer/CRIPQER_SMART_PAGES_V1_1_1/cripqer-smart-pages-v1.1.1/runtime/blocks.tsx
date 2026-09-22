/**
 * CRIPQER SMART PAGES V1.1 — reusable premium runtime blocks.
 *
 * One component set reused across every vertical. There are no per-industry
 * components: a menu item, a product, a service, a listing and a portfolio
 * piece all render through the same primitives with different presentation.
 * No animation library, no UI framework, no host coupling.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  CatalogCategoryV1,
  CatalogItemV1,
  ContactInfoV1,
  DifferentiatorV1,
  FaqEntryV1,
  MediaAssetV1,
  SalesActionV1,
  TeamMemberV1,
  TestimonialV1,
} from "../catalog.types";
import type { NavItemV1 } from "../ecosystem";
import { formatPrice } from "../sales-actions";

/* ------------------------------------------------------------- primitives */

export function Section({
  id,
  title,
  subtitle,
  children,
  alt,
  narrow,
  compact,
}: {
  id?: string;
  title?: string | undefined;
  subtitle?: string | undefined;
  children: ReactNode;
  alt?: boolean;
  narrow?: boolean;
  /** Control strips (categories, search, filters) sit tight to the next block. */
  compact?: boolean;
}) {
  return (
    <section
      id={id}
      className={`sp-section${alt ? " sp-section--alt" : ""}${compact ? " sp-section--compact" : ""}`}
    >
      <div className={`sp-container${narrow ? " sp-container--narrow" : ""}`}>
        {title ? <SectionHeading title={title} subtitle={subtitle} /> : null}
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string | undefined;
}) {
  return (
    <header className="sp-heading">
      <h2 className="sp-heading__title">{title}</h2>
      {subtitle ? <p className="sp-heading__subtitle">{subtitle}</p> : null}
    </header>
  );
}

export function ActionButton({
  action,
  href,
  variant = "primary",
  size,
  onClick,
}: {
  action: SalesActionV1;
  href?: string | undefined;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm";
  onClick?: (() => void) | undefined;
}) {
  const className = `sp-btn sp-btn--${variant}${size === "sm" ? " sp-btn--sm" : ""}`;
  const external = Boolean(href && /^https?:/i.test(href));
  if (href) {
    return (
      <a
        className={className}
        href={href}
        onClick={onClick}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {action.label}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={!onClick}>
      {action.label}
    </button>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="sp-empty">{label}</p>;
}

function Media({
  media,
  className,
  ratio,
}: {
  media?: MediaAssetV1 | undefined;
  className?: string;
  ratio?: string;
}) {
  const style = ratio ? ({ aspectRatio: ratio } as const) : undefined;
  if (!media)
    return (
      <div
        className={`sp-media sp-media--empty ${className ?? ""}`}
        style={style}
        aria-hidden="true"
      />
    );
  return (
    <img
      className={`sp-media ${className ?? ""}`}
      style={style}
      src={media.url}
      alt={media.alt}
      loading="lazy"
    />
  );
}

/* ----------------------------------------------------------------- navbar */

export function Navbar({
  brandName,
  logo,
  items,
  activeId,
  cta,
  sticky,
  onNavigate,
}: {
  brandName: string;
  logo?: MediaAssetV1 | undefined;
  items: NavItemV1[];
  activeId?: string | undefined;
  cta?: ReactNode;
  sticky?: boolean;
  onNavigate: (item: NavItemV1) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const select = (item: NavItemV1) => {
    setOpen(false);
    onNavigate(item);
  };

  return (
    <div className={`sp-navbar${sticky ? " sp-navbar--sticky" : ""}`}>
      <div className="sp-container sp-navbar__inner">
        <div className="sp-navbar__brand">
          {logo ? <img className="sp-navbar__logo" src={logo.url} alt={logo.alt} /> : null}
          <span className="sp-navbar__name">{brandName}</span>
        </div>

        {items.length > 0 ? (
          <nav className="sp-navbar__links" aria-label="Page sections">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sp-navlink${activeId === item.id ? " is-active" : ""}`}
                aria-current={activeId === item.id ? "page" : undefined}
                onClick={() => select(item)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}

        <div className="sp-navbar__actions">
          {cta ? <div className="sp-navbar__cta">{cta}</div> : null}
          {items.length > 0 ? (
            <button
              ref={toggleRef}
              type="button"
              className={`sp-burger${open ? " is-open" : ""}`}
              aria-expanded={open}
              aria-controls="sp-mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          ) : null}
        </div>
      </div>

      {items.length > 0 ? (
        <div
          id="sp-mobile-menu"
          className={`sp-drawer${open ? " is-open" : ""}`}
          aria-hidden={!open}
          role="dialog"
          aria-modal={open || undefined}
          aria-label="Menu"
        >
          <button
            type="button"
            className="sp-drawer__backdrop"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="sp-drawer__panel" ref={panelRef}>
            <div className="sp-drawer__head">
              <span className="sp-drawer__title">{brandName}</span>
              <button
                type="button"
                className="sp-drawer__close"
                aria-label="Close menu"
                onClick={() => {
                  setOpen(false);
                  toggleRef.current?.focus();
                }}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <nav className="sp-drawer__nav" aria-label="Menu">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sp-drawer__link${activeId === item.id ? " is-active" : ""}`}
                  tabIndex={open ? 0 : -1}
                  onClick={() => select(item)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {cta ? <div className="sp-drawer__cta">{cta}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- hero */

export function Hero({
  variant = "centered",
  name,
  professionalName,
  category,
  location,
  tagline,
  about,
  cover,
  logo,
  avatar,
  badges,
  actions,
}: {
  variant?: "centered" | "split" | "media" | "compact";
  name: string;
  professionalName?: string | undefined;
  category?: string | undefined;
  location?: string | undefined;
  tagline?: string | undefined;
  about?: string | undefined;
  cover?: MediaAssetV1 | undefined;
  logo?: MediaAssetV1 | undefined;
  avatar?: MediaAssetV1 | undefined;
  badges?: string[] | undefined;
  actions: ReactNode;
}) {
  const identity = avatar ?? logo;
  const meta = [category, location].filter(Boolean).join(" · ");

  const body = (
    <div className="sp-hero__content">
      {identity ? (
        <img className="sp-hero__identity" src={identity.url} alt={identity.alt} />
      ) : null}
      {meta ? <p className="sp-hero__eyebrow">{meta}</p> : null}
      <h1 className="sp-hero__title">{name}</h1>
      {professionalName && professionalName !== name ? (
        <p className="sp-hero__person">{professionalName}</p>
      ) : null}
      {tagline ? <p className="sp-hero__tagline">{tagline}</p> : null}
      {about ? <p className="sp-hero__about">{about}</p> : null}
      {badges && badges.length > 0 ? (
        <ul className="sp-hero__badges">
          {badges.map((badge) => (
            <li key={badge} className="sp-badge">
              {badge}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="sp-hero__actions">{actions}</div>
    </div>
  );

  if (variant === "media" && cover) {
    return (
      <header className="sp-hero sp-hero--media">
        <img className="sp-hero__bg" src={cover.url} alt={cover.alt} />
        <div className="sp-hero__scrim" />
        <div className="sp-container sp-hero__body">{body}</div>
      </header>
    );
  }

  if (variant === "split" && cover) {
    return (
      <header className="sp-hero sp-hero--split">
        <div className="sp-container sp-hero__body sp-hero__grid">
          {body}
          <div className="sp-hero__figure">
            <img src={cover.url} alt={cover.alt} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`sp-hero sp-hero--${variant === "compact" ? "compact" : "centered"}`}>
      <div className="sp-container sp-hero__body">{body}</div>
    </header>
  );
}

/* --------------------------------------------------------------- controls */

export function CategoryNav({
  categories,
  activeId,
  onSelect,
}: {
  categories: CatalogCategoryV1[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <nav className="sp-catnav" aria-label="Categories">
      <button
        type="button"
        className={`sp-chip${activeId === null ? " sp-chip--active" : ""}`}
        aria-pressed={activeId === null}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={`sp-chip${activeId === category.id ? " sp-chip--active" : ""}`}
          aria-pressed={activeId === category.id}
          onClick={() => onSelect(category.id)}
        >
          {category.name}
        </button>
      ))}
    </nav>
  );
}

export function SearchBox({
  value,
  onChange,
  label = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="sp-search">
      <label className="sp-sr" htmlFor="sp-search-input">
        {label}
      </label>
      <input
        id="sp-search-input"
        className="sp-search__input"
        type="search"
        value={value}
        placeholder={label}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function FilterBar({
  filters,
  active,
  onToggle,
}: {
  filters: Array<{ key: string; label: string; values: string[] }>;
  active: Record<string, string>;
  onToggle: (key: string, value: string) => void;
}) {
  if (filters.length === 0) return null;
  return (
    <div className="sp-filters">
      {filters.map((filter) => (
        <div className="sp-filters__group" key={filter.key}>
          <span className="sp-filters__label">{filter.label}</span>
          <div className="sp-filters__values">
            {filter.values.map((value) => (
              <button
                key={value}
                type="button"
                className={`sp-chip${active[filter.key] === value ? " sp-chip--active" : ""}`}
                aria-pressed={active[filter.key] === value}
                onClick={() => onToggle(filter.key, value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- item cards */

export type CardVariant = "product" | "service" | "portfolio" | "listing" | "menu";

const RATIO_BY_VARIANT: Record<CardVariant, string> = {
  product: "4 / 3",
  service: "16 / 9",
  portfolio: "1 / 1",
  listing: "3 / 2",
  menu: "1 / 1",
};

export interface ItemActionView {
  label: string;
  href?: string | undefined;
}

export function ItemCard({
  item,
  variant,
  action,
  featured,
  onOpen,
  onAct,
}: {
  item: CatalogItemV1;
  variant: CardVariant;
  action: ItemActionView;
  featured?: boolean | undefined;
  onOpen: (item: CatalogItemV1) => void;
  onAct: (item: CatalogItemV1) => void;
}) {
  const price = formatPrice(item);
  const showMedia = item.media.length > 0 || variant === "portfolio" || variant === "listing";
  return (
    <article className={`sp-card sp-card--${variant}${featured ? " sp-card--featured" : ""}`}>
      {showMedia ? (
        <button type="button" className="sp-card__mediabtn" onClick={() => onOpen(item)}>
          <Media
            media={item.media[0]}
            className="sp-card__media"
            ratio={RATIO_BY_VARIANT[variant]}
          />
          {item.featured ? <span className="sp-tag">Featured</span> : null}
          <span className="sp-sr">View details for {item.name}</span>
        </button>
      ) : null}
      <div className="sp-card__body">
        <h3 className="sp-card__title">
          <button type="button" className="sp-card__titlebtn" onClick={() => onOpen(item)}>
            {item.name}
          </button>
        </h3>
        {item.description ? <p className="sp-card__desc">{item.description}</p> : null}
        {item.attributes.length > 0 && (variant === "listing" || variant === "service") ? (
          <ul className="sp-card__attrs">
            {item.attributes.slice(0, 4).map((attribute) => (
              <li key={attribute.key}>
                <span>{attribute.label}:</span> {attribute.value}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="sp-card__footer">
          {price ? (
            <span className="sp-price">{price}</span>
          ) : (
            <span className="sp-price sp-price--muted">Price on request</span>
          )}
          {action.href ? (
            <a
              className="sp-btn sp-btn--secondary sp-btn--sm"
              href={action.href}
              onClick={() => onAct(item)}
              target={/^https?:/i.test(action.href) ? "_blank" : undefined}
              rel={/^https?:/i.test(action.href) ? "noopener noreferrer" : undefined}
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              className="sp-btn sp-btn--secondary sp-btn--sm"
              onClick={() => onOpen(item)}
            >
              Details
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ItemGrid({
  items,
  variant,
  actionFor,
  onOpen,
  onAct,
  emptyLabel,
  featured,
}: {
  items: CatalogItemV1[];
  variant: CardVariant;
  actionFor: (item: CatalogItemV1) => ItemActionView;
  onOpen: (item: CatalogItemV1) => void;
  onAct: (item: CatalogItemV1) => void;
  emptyLabel: string;
  featured?: boolean | undefined;
}) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;
  return (
    <div className={`sp-grid sp-grid--${variant}`}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          variant={variant}
          action={actionFor(item)}
          featured={featured}
          onOpen={onOpen}
          onAct={onAct}
        />
      ))}
    </div>
  );
}

/**
 * Featured presentation. One item becomes a large editorial media/content
 * split; several items become a spotlight plus a supporting column. No new
 * data is required: it reuses the same catalog items and resolved actions.
 */
export function FeaturedShowcase({
  items,
  variant,
  actionFor,
  onOpen,
  onAct,
  emptyLabel,
}: {
  items: CatalogItemV1[];
  variant: CardVariant;
  actionFor: (item: CatalogItemV1) => ItemActionView;
  onOpen: (item: CatalogItemV1) => void;
  onAct: (item: CatalogItemV1) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) return <EmptyState label={emptyLabel} />;

  const [lead, ...rest] = items;
  if (!lead) return <EmptyState label={emptyLabel} />;
  const price = formatPrice(lead);
  const action = actionFor(lead);
  const external = Boolean(action.href && /^https?:/i.test(action.href));

  return (
    <div className={`sp-feature${rest.length > 0 ? " sp-feature--with-rail" : ""}`}>
      <article className="sp-feature__lead">
        <button
          type="button"
          className="sp-feature__mediabtn"
          onClick={() => onOpen(lead)}
          aria-label={`View ${lead.name}`}
        >
          <Media media={lead.media[0]} className="sp-feature__media" ratio="16 / 11" />
        </button>
        <div className="sp-feature__body">
          <p className="sp-feature__eyebrow">Featured</p>
          <h3 className="sp-feature__title">
            <button type="button" className="sp-card__titlebtn" onClick={() => onOpen(lead)}>
              {lead.name}
            </button>
          </h3>
          {lead.description ? <p className="sp-feature__desc">{lead.description}</p> : null}
          {lead.attributes.length > 0 ? (
            <ul className="sp-feature__attrs">
              {lead.attributes.slice(0, 3).map((attribute) => (
                <li key={attribute.key}>
                  <span>{attribute.label}</span>
                  {attribute.value}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="sp-feature__footer">
            {price ? (
              <span className="sp-price sp-price--lg">{price}</span>
            ) : (
              <span className="sp-price sp-price--muted">Price on request</span>
            )}
            {action.href ? (
              <a
                className="sp-btn sp-btn--primary"
                href={action.href}
                onClick={() => onAct(lead)}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              >
                {action.label}
              </a>
            ) : (
              <button
                type="button"
                className="sp-btn sp-btn--secondary"
                onClick={() => onOpen(lead)}
              >
                Details
              </button>
            )}
          </div>
        </div>
      </article>

      {rest.length > 0 ? (
        <div className="sp-feature__rail">
          {rest.slice(0, 3).map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              variant={variant}
              action={actionFor(item)}
              onOpen={onOpen}
              onAct={onAct}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MenuSections({
  categories,
  items,
  actionFor,
  onOpen,
  onAct,
}: {
  categories: CatalogCategoryV1[];
  items: CatalogItemV1[];
  actionFor: (item: CatalogItemV1) => ItemActionView;
  onOpen: (item: CatalogItemV1) => void;
  onAct: (item: CatalogItemV1) => void;
}) {
  const groups = useMemo(() => {
    if (categories.length === 0) return [{ category: null as CatalogCategoryV1 | null, items }];
    const grouped = categories.map((category) => ({
      category: category as CatalogCategoryV1 | null,
      items: items.filter((item) => item.categoryId === category.id),
    }));
    const orphans = items.filter((item) => !item.categoryId);
    if (orphans.length > 0) grouped.push({ category: null, items: orphans });
    return grouped.filter((group) => group.items.length > 0);
  }, [categories, items]);

  if (items.length === 0) return <EmptyState label="No menu items yet." />;

  return (
    <div className="sp-menu">
      {groups.map((group, index) => (
        <div className="sp-menu__group" key={group.category?.id ?? `group_${index}`}>
          {group.category ? <h3 className="sp-menu__title">{group.category.name}</h3> : null}
          <ul className="sp-menu__list">
            {group.items.map((item) => {
              const price = formatPrice(item);
              const action = actionFor(item);
              return (
                <li className="sp-menuitem" key={item.id}>
                  {item.media[0] ? (
                    <button
                      type="button"
                      className="sp-menuitem__mediabtn"
                      onClick={() => onOpen(item)}
                      aria-label={`View ${item.name}`}
                    >
                      <Media media={item.media[0]} className="sp-menuitem__media" ratio="1 / 1" />
                    </button>
                  ) : null}
                  <div className="sp-menuitem__body">
                    <div className="sp-menuitem__row">
                      <button
                        type="button"
                        className="sp-menuitem__name"
                        onClick={() => onOpen(item)}
                      >
                        {item.name}
                      </button>
                      <span className="sp-menuitem__dots" aria-hidden="true" />
                      <span className={`sp-price${price ? "" : " sp-price--muted"}`}>
                        {price ?? "On request"}
                      </span>
                    </div>
                    {item.description ? (
                      <p className="sp-menuitem__desc">{item.description}</p>
                    ) : null}
                    {action.href ? (
                      <a
                        className="sp-btn sp-btn--ghost sp-btn--sm"
                        href={action.href}
                        onClick={() => onAct(item)}
                        target={/^https?:/i.test(action.href) ? "_blank" : undefined}
                        rel={/^https?:/i.test(action.href) ? "noopener noreferrer" : undefined}
                      >
                        {action.label}
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- info blocks */

export function AboutBlock({ text, media }: { text: string; media?: MediaAssetV1 | undefined }) {
  if (!media) return <p className="sp-prose">{text}</p>;
  return (
    <div className="sp-about">
      <p className="sp-prose">{text}</p>
      <img className="sp-about__media" src={media.url} alt={media.alt} loading="lazy" />
    </div>
  );
}

export function MissionVision({
  mission,
  vision,
  values,
}: {
  mission?: string | undefined;
  vision?: string | undefined;
  values?: string[] | undefined;
}) {
  return (
    <div className="sp-story">
      {mission ? (
        <article className="sp-story__card">
          <h3>Mission</h3>
          <p>{mission}</p>
        </article>
      ) : null}
      {vision ? (
        <article className="sp-story__card">
          <h3>Vision</h3>
          <p>{vision}</p>
        </article>
      ) : null}
      {values && values.length > 0 ? (
        <article className="sp-story__card">
          <h3>Values</h3>
          <ul className="sp-story__values">
            {values.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

export function WhyUs({ items }: { items: DifferentiatorV1[] }) {
  if (items.length === 0) return null;
  return (
    <div className="sp-why">
      {items.map((entry) => (
        <article className="sp-why__card" key={entry.id}>
          <h3 className="sp-why__title">{entry.title}</h3>
          {entry.description ? <p className="sp-why__desc">{entry.description}</p> : null}
        </article>
      ))}
    </div>
  );
}

export function Gallery({ media }: { media: MediaAssetV1[] }) {
  if (media.length === 0) return <EmptyState label="No images yet." />;
  return (
    <div className="sp-gallery">
      {media.map((asset, index) => (
        <img
          key={asset.id}
          className={`sp-gallery__img${index % 5 === 0 ? " sp-gallery__img--wide" : ""}`}
          src={asset.url}
          alt={asset.alt}
          loading="lazy"
        />
      ))}
    </div>
  );
}

export function PricingList({ items }: { items: CatalogItemV1[] }) {
  const priced = items.filter((item) => item.price);
  if (priced.length === 0) return <EmptyState label="No prices supplied." />;
  return (
    <ul className="sp-pricing">
      {priced.map((item) => (
        <li className="sp-pricing__row" key={item.id}>
          <span className="sp-pricing__name">{item.name}</span>
          <span className="sp-pricing__value">{formatPrice(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Team({ members }: { members: TeamMemberV1[] }) {
  return (
    <div className="sp-team">
      {members.map((member) => (
        <article className="sp-team__card" key={member.id}>
          <Media media={member.photo} className="sp-team__photo" ratio="1 / 1" />
          <h3 className="sp-team__name">{member.name}</h3>
          {member.role ? <p className="sp-team__role">{member.role}</p> : null}
          {member.bio ? <p className="sp-team__bio">{member.bio}</p> : null}
        </article>
      ))}
    </div>
  );
}

export function Testimonials({ testimonials }: { testimonials: TestimonialV1[] }) {
  return (
    <div className="sp-testimonials">
      {testimonials.map((testimonial) => (
        <figure className="sp-testimonial" key={testimonial.id}>
          {typeof testimonial.rating === "number" ? (
            <p className="sp-testimonial__rating" aria-label={`Rating ${testimonial.rating} of 5`}>
              {"★".repeat(Math.max(0, Math.min(5, Math.round(testimonial.rating))))}
            </p>
          ) : null}
          <blockquote className="sp-testimonial__quote">{testimonial.quote}</blockquote>
          {testimonial.author ? (
            <figcaption className="sp-testimonial__author">
              {testimonial.avatar ? (
                <img src={testimonial.avatar.url} alt={testimonial.avatar.alt} loading="lazy" />
              ) : null}
              <span>
                <strong>{testimonial.author}</strong>
                {testimonial.context ? <em>{testimonial.context}</em> : null}
              </span>
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

export function Faq({ entries }: { entries: FaqEntryV1[] }) {
  return (
    <div className="sp-faq">
      {entries.map((entry) => (
        <details className="sp-faq__item" key={entry.id}>
          <summary>{entry.question}</summary>
          <p>{entry.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function Location({ contact }: { contact: ContactInfoV1 }) {
  return (
    <div className="sp-location">
      <div>
        {contact.address ? <p className="sp-location__address">{contact.address}</p> : null}
        {contact.hours ? <p className="sp-location__hours">{contact.hours}</p> : null}
      </div>
      {contact.mapUrl ? (
        <a
          className="sp-btn sp-btn--secondary"
          href={contact.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in maps
        </a>
      ) : null}
    </div>
  );
}

export function ContactBlock({ contact }: { contact: ContactInfoV1 }) {
  const rows: Array<{ label: string; value: string; href?: string }> = [];
  if (contact.phone)
    rows.push({
      label: "Phone",
      value: contact.phone,
      href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
    });
  if (contact.email)
    rows.push({ label: "Email", value: contact.email, href: `mailto:${contact.email}` });
  if (contact.address) rows.push({ label: "Address", value: contact.address });
  if (contact.hours) rows.push({ label: "Hours", value: contact.hours });
  return (
    <div className="sp-contact">
      <ul className="sp-contact__list">
        {rows.map((row) => (
          <li key={row.label}>
            <span className="sp-contact__label">{row.label}</span>
            {row.href ? <a href={row.href}>{row.value}</a> : <span>{row.value}</span>}
          </li>
        ))}
      </ul>
      {contact.socials.length > 0 ? (
        <ul className="sp-socials">
          {contact.socials.map((social) => (
            <li key={social.url}>
              <a href={social.url} target="_blank" rel="noopener noreferrer">
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CtaBanner({
  title,
  description,
  children,
}: {
  title: string;
  description?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="sp-cta">
      <div className="sp-cta__text">
        <h3 className="sp-cta__title">{title}</h3>
        {description ? <p className="sp-cta__desc">{description}</p> : null}
      </div>
      <div className="sp-cta__actions">{children}</div>
    </div>
  );
}

export function Footer({
  name,
  description,
  logo,
  nav,
  contact,
  onNavigate,
  ecosystemNote,
}: {
  name: string;
  description?: string | undefined;
  logo?: MediaAssetV1 | undefined;
  nav: NavItemV1[];
  contact: ContactInfoV1;
  onNavigate: (item: NavItemV1) => void;
  ecosystemNote?: string | undefined;
}) {
  return (
    <footer className="sp-footer">
      <div className="sp-container sp-footer__grid">
        <div className="sp-footer__brand">
          {logo ? <img className="sp-footer__logo" src={logo.url} alt={logo.alt} /> : null}
          <p className="sp-footer__name">{name}</p>
          {description ? <p className="sp-footer__desc">{description}</p> : null}
        </div>

        {nav.length > 0 ? (
          <nav className="sp-footer__col" aria-label="Footer navigation">
            <h4>Explore</h4>
            {nav.map((item) => (
              <button key={item.id} type="button" onClick={() => onNavigate(item)}>
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}

        <div className="sp-footer__col">
          <h4>Contact</h4>
          {contact.phone ? (
            <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{contact.phone}</a>
          ) : null}
          {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
          {contact.address ? <span>{contact.address}</span> : null}
          {contact.socials.map((social) => (
            <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer">
              {social.label}
            </a>
          ))}
        </div>
      </div>
      <div className="sp-container sp-footer__base">
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        {ecosystemNote ? <span className="sp-footer__eco">{ecosystemNote}</span> : null}
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------- detail panel */

export function ItemDetail({
  item,
  action,
  onAct,
  onClose,
}: {
  item: CatalogItemV1;
  action: ItemActionView;
  onAct: (item: CatalogItemV1) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const price = formatPrice(item);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sp-detail" role="dialog" aria-modal="true" aria-label={item.name}>
      <button
        type="button"
        className="sp-detail__backdrop"
        aria-label="Close details"
        onClick={onClose}
      />
      <div className="sp-detail__panel" ref={panelRef}>
        <button
          type="button"
          className="sp-detail__close"
          onClick={onClose}
          aria-label="Close details"
        >
          <span aria-hidden="true">×</span>
        </button>
        {item.media.length > 0 ? (
          <div className="sp-detail__media">
            <Media media={item.media[index]} className="sp-detail__img" ratio="4 / 3" />
            {item.media.length > 1 ? (
              <div className="sp-detail__thumbs">
                {item.media.map((asset, i) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`sp-detail__thumb${i === index ? " is-active" : ""}`}
                    onClick={() => setIndex(i)}
                    aria-label={`Show image ${i + 1}`}
                  >
                    <img src={asset.url} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="sp-detail__body">
          <h2 className="sp-detail__title">{item.name}</h2>
          {price ? (
            <p className="sp-price">{price}</p>
          ) : (
            <p className="sp-price sp-price--muted">Price on request</p>
          )}
          {item.description ? <p className="sp-detail__desc">{item.description}</p> : null}
          {item.attributes.length > 0 ? (
            <dl className="sp-detail__attrs">
              {item.attributes.map((attribute) => (
                <div key={attribute.key}>
                  <dt>{attribute.label}</dt>
                  <dd>{attribute.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {item.review.length > 0 ? (
            <p className="sp-review">Needs review: {item.review.join(", ")}</p>
          ) : null}
          <div className="sp-detail__actions">
            {action.href ? (
              <a
                className="sp-btn sp-btn--primary"
                href={action.href}
                onClick={() => onAct(item)}
                target={/^https?:/i.test(action.href) ? "_blank" : undefined}
                rel={/^https?:/i.test(action.href) ? "noopener noreferrer" : undefined}
              >
                {action.label}
              </a>
            ) : (
              <span className="sp-empty">No contact channel configured yet.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
