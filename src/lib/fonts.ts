export const loadGoogleFont = (fontFamily: string) => {
  if (!fontFamily || fontFamily === "Inter") return;

  const fontId = `google-font-${fontFamily.replace(/\s+/g, "-").toLowerCase()}`;

  if (document.getElementById(fontId)) return;

  const link = document.createElement("link");
  link.id = fontId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(
    /\s+/g,
    "+",
  )}:wght@300;400;500;600;700;800&display=swap`;

  document.head.appendChild(link);
};

export const loadPreviewFont = (fontFamily: string, text: string = "AgX") => {
  if (!fontFamily || fontFamily === "Inter") return;

  const fontId = `google-font-preview-${fontFamily.replace(/\s+/g, "-").toLowerCase()}`;

  if (document.getElementById(fontId)) return;

  const link = document.createElement("link");
  link.id = fontId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(
    /\s+/g,
    "+",
  )}:wght@400&display=swap&text=${encodeURIComponent(text + fontFamily)}`;

  document.head.appendChild(link);
};
