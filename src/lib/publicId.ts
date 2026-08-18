const PUBLIC_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const PUBLIC_ID_LENGTH = 7;

export function generatePublicId(): string {
  const values = new Uint32Array(PUBLIC_ID_LENGTH);
  crypto.getRandomValues(values);

  return Array.from(values, (value) => PUBLIC_ID_ALPHABET[value % PUBLIC_ID_ALPHABET.length]).join(
    "",
  );
}

export function getInternalSlugFromPublicId(publicId: string): string {
  return publicId.toLowerCase();
}
