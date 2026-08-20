export function hexToRgb(hex: string) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return { r, g, b };
}

export function getLuminance(hex: string) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const a = [r / 255, g / 255, b / 255].map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
    );
    return (a[0] || 0) * 0.2126 + (a[1] || 0) * 0.7152 + (a[2] || 0) * 0.0722;
  } catch (e) {
    return 1; // fallback
  }
}

export function getContrast(hex1: string, hex2: string) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function analyzeQrContrast(foreground: string, background: string) {
  const contrast = getContrast(foreground, background);
  const lFg = getLuminance(foreground);
  const lBg = getLuminance(background);

  const isInverted = lFg > lBg; // Foreground is lighter than background

  let status: "good" | "warning" | "poor" = "good";
  if (contrast < 3.0) {
    status = "poor";
  } else if (contrast < 4.5) {
    status = "warning";
  }

  return { contrast, isInverted, status };
}
