// Modified by ChatGPT Work — ENC-DOC-UX-FILE-TYPES-04
export type DocumentFileCategory =
  "excel" | "pdf" | "word" | "powerpoint" | "image" | "archive" | "text" | "generic";

export interface DocumentFileTypeInfo {
  category: DocumentFileCategory;
  label: string;
  extension: string;
  icon: string;
  mimeType: string;
}

export interface FileTypeQrTheme {
  foreground: string;
  background: string;
  icon: string;
  label: string;
  iconColor: string;
  accentBackground: string;
}

export const MAX_ENCRYPTED_DOCUMENT_SIZE = 50 * 1024 * 1024;
export const MAX_ENCRYPTED_DOCUMENT_SIZE_LABEL = "50 MB";

const extensionMap: Record<string, DocumentFileCategory> = {
  xlsx: "excel",
  xls: "excel",
  csv: "text",
  pdf: "pdf",
  docx: "word",
  doc: "word",
  pptx: "powerpoint",
  ppt: "powerpoint",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  txt: "text",
  md: "text",
};

const labels: Record<DocumentFileCategory, { label: string; icon: string }> = {
  excel: { label: "Excel", icon: "spreadsheet" },
  pdf: { label: "PDF", icon: "pdf" },
  word: { label: "Word", icon: "document" },
  powerpoint: { label: "PowerPoint", icon: "presentation" },
  image: { label: "Imagen", icon: "image" },
  archive: { label: "ZIP / Archivo", icon: "archive" },
  text: { label: "Texto", icon: "text" },
  generic: { label: "Archivo", icon: "file" },
};

const qrThemes: Record<DocumentFileCategory, FileTypeQrTheme> = {
  excel: {
    foreground: "#0F5F3A",
    background: "#FFFFFF",
    icon: "spreadsheet",
    label: "Excel",
    iconColor: "#0F7A43",
    accentBackground: "#ECFDF3",
  },
  pdf: {
    foreground: "#991B1B",
    background: "#FFFFFF",
    icon: "pdf",
    label: "PDF",
    iconColor: "#B91C1C",
    accentBackground: "#FEF2F2",
  },
  word: {
    foreground: "#1D4E89",
    background: "#FFFFFF",
    icon: "document",
    label: "Word",
    iconColor: "#1D4ED8",
    accentBackground: "#EFF6FF",
  },
  powerpoint: {
    foreground: "#9A3412",
    background: "#FFFFFF",
    icon: "presentation",
    label: "PowerPoint",
    iconColor: "#C2410C",
    accentBackground: "#FFF7ED",
  },
  image: {
    foreground: "#155E75",
    background: "#FFFFFF",
    icon: "image",
    label: "Imagen",
    iconColor: "#0E7490",
    accentBackground: "#ECFEFF",
  },
  archive: {
    foreground: "#3F3F46",
    background: "#FFFFFF",
    icon: "archive",
    label: "ZIP / Archivo",
    iconColor: "#92400E",
    accentBackground: "#FFFBEB",
  },
  text: {
    foreground: "#334155",
    background: "#FFFFFF",
    icon: "text",
    label: "Texto",
    iconColor: "#475569",
    accentBackground: "#F8FAFC",
  },
  generic: {
    foreground: "#27272A",
    background: "#FFFFFF",
    icon: "file",
    label: "Archivo",
    iconColor: "#3F3F46",
    accentBackground: "#F8FAFC",
  },
};

function getExtension(fileName = "") {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

export function getDocumentFileType(
  fileOrMime: File | string,
  fileName = "",
): DocumentFileTypeInfo {
  const mimeType = typeof fileOrMime === "string" ? fileOrMime : fileOrMime.type;
  const name = typeof fileOrMime === "string" ? fileName : fileOrMime.name;
  const extension = getExtension(name);
  const normalizedMime = (mimeType || "").toLowerCase();

  let category: DocumentFileCategory =
    extensionMap[extension] ||
    (normalizedMime.includes("spreadsheet") || normalizedMime.includes("excel")
      ? "excel"
      : normalizedMime === "application/pdf"
        ? "pdf"
        : normalizedMime.includes("wordprocessing") || normalizedMime.includes("msword")
          ? "word"
          : normalizedMime.includes("presentation") || normalizedMime.includes("powerpoint")
            ? "powerpoint"
            : normalizedMime.startsWith("image/")
              ? "image"
              : normalizedMime.includes("zip") || normalizedMime.includes("compressed")
                ? "archive"
                : normalizedMime.startsWith("text/")
                  ? "text"
                  : "generic");

  if (extension === "csv") {
    category = "excel";
  }

  return {
    category,
    label: labels[category].label,
    extension,
    icon: labels[category].icon,
    mimeType,
  };
}

export function getFileTypeQrTheme(fileType: DocumentFileCategory | string): FileTypeQrTheme {
  return qrThemes[fileType as DocumentFileCategory] || qrThemes.generic;
}

export function isEncryptedDocumentSizeAllowed(size: number) {
  return size <= MAX_ENCRYPTED_DOCUMENT_SIZE;
}

export function generateSecureDocumentPassword(length = 18) {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#$%*-_+=",
  ];
  const allChars = groups.join("");
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  const password = Array.from({ length }, (_, index) => {
    const source = index < groups.length ? groups[index]! : allChars;
    return source[randomBytes[index]! % source.length];
  });

  const shuffleBytes = new Uint8Array(length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = password.length - 1; i > 0; i--) {
    const j = shuffleBytes[i]! % (i + 1);
    [password[i], password[j]] = [password[j]!, password[i]!];
  }

  return password.join("");
}
