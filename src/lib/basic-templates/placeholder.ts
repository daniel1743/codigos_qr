/**
 * Self-contained SVG placeholder images (data URIs) so the Template Lab
 * renders "finished" templates with zero network / binary-asset dependency.
 * Used exclusively for demo fixtures.
 */

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface GradientImageOptions {
  from: string;
  to: string;
  label?: string;
  width?: number;
  height?: number;
  /** Optional decorative circles to hint at photography / product shots. */
  decoration?: "none" | "soft" | "product";
}

export function gradientImage({
  from,
  to,
  label = "",
  width = 800,
  height = 400,
  decoration = "soft",
}: GradientImageOptions): string {
  const deco =
    decoration === "none"
      ? ""
      : decoration === "product"
        ? `<circle cx="${width * 0.78}" cy="${height * 0.28}" r="${height * 0.22}" fill="#ffffff" opacity="0.16"/>
           <circle cx="${width * 0.68}" cy="${height * 0.72}" r="${height * 0.14}" fill="#000000" opacity="0.08"/>`
        : `<circle cx="${width * 0.82}" cy="${height * 0.22}" r="${height * 0.28}" fill="#ffffff" opacity="0.14"/>
           <circle cx="${width * 0.12}" cy="${height * 0.85}" r="${height * 0.34}" fill="#000000" opacity="0.06"/>`;

  const text = label
    ? `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
         font-family="Georgia, serif" font-size="${Math.round(height * 0.14)}"
         fill="#ffffff" opacity="0.85">${label}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  ${deco}
  ${text}
</svg>`;

  return svgDataUri(svg);
}

export function portraitImage({
  from,
  to,
  initials,
  size = 256,
}: {
  from: string;
  to: string;
  initials: string;
  size?: number;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="p" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#p)"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
    font-family="Inter, system-ui, sans-serif" font-weight="600"
    font-size="${Math.round(size * 0.34)}" fill="#ffffff">${initials}</text>
</svg>`;

  return svgDataUri(svg);
}
