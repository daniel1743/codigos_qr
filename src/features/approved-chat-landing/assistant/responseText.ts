/**
 * The landing chat renders plain text, not Markdown. Strip only presentation
 * markers commonly returned by providers so comparison lists do not expose
 * literal asterisks or escaped formatting to visitors.
 */
export function normalizeAssistantText(value: string): string {
  return value
    .replace(/\\([*_`])/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
