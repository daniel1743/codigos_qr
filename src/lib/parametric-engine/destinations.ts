/**
 * Destination validation — lightweight, dependency-free.
 *
 * The engine never trusts UI gating: a malformed destination is a hard
 * intent error, not something to repair silently.
 */

import type { PrimaryActionType } from "./types";

export function normalizePhoneDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

export function isValidWhatsApp(value: string): boolean {
  if (/[a-zA-Z]/.test(value)) return false;
  if (!/^[+\d][\d\s().-]*$/.test(value.trim())) return false;
  const digits = normalizePhoneDigits(value);
  return digits.length >= 8 && digits.length <= 15;
}

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (/\s/.test(trimmed)) return false;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  const host = url.hostname;
  if (host === "localhost") return true;
  // Requires a real dot-separated host with a 2+ char TLD.
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(host);
}

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (/\s/.test(v) || v.includes("..")) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v);
}

/** Accepts "@handle", "handle" or an instagram.com/handle URL. */
export function extractInstagramHandle(value: string): string | null {
  let raw = value.trim();
  const urlMatch = raw.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#\s]+)\/?/i);
  if (urlMatch) raw = urlMatch[1] as string;
  if (raw.startsWith("@")) raw = raw.slice(1);
  if (!/^[A-Za-z0-9._]{1,30}$/.test(raw)) return null;
  if (raw.startsWith(".") || raw.endsWith(".") || raw.includes("..")) return null;
  return raw;
}

export function isValidInstagram(value: string): boolean {
  return extractInstagramHandle(value) !== null;
}

export function isValidDestination(type: PrimaryActionType, value: string): boolean {
  switch (type) {
    case "whatsapp":
      return isValidWhatsApp(value);
    case "website":
    case "booking":
      return isValidHttpUrl(value);
    case "instagram":
      return isValidInstagram(value);
    case "email":
      return isValidEmail(value);
    default:
      return false;
  }
}

export function destinationIssueMessage(type: PrimaryActionType): string {
  switch (type) {
    case "whatsapp":
      return "WhatsApp destination must contain 8-15 digits.";
    case "website":
    case "booking":
      return "Destination must be a valid http(s) URL.";
    case "instagram":
      return "Destination must be a valid Instagram handle or profile URL.";
    case "email":
      return "Destination must be a valid email address.";
    default:
      return "Unsupported destination.";
  }
}
