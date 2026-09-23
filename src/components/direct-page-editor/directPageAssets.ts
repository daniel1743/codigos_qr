export interface DirectAssetReference {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface DirectAssetAdapter {
  upload(file: File): Promise<DirectAssetReference>;
  list?(): Promise<DirectAssetReference[]>;
  remove?(id: string): Promise<void>;
}

export function createDirectId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}
