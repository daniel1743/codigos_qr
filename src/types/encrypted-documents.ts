// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
export type DocumentType = "excel" | "pdf" | "image" | "word" | "zip" | "other";
export type EncryptionLevel = "standard";

export interface EncryptedDocument {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  original_filename: string;
  file_type: DocumentType;
  file_size_bytes: number;
  mime_type: string;
  encrypted_file_path: string;
  iv: string;
  salt?: string;
  encryption_level: EncryptionLevel;
  password_required: boolean;
  expire_at?: string;
  max_downloads?: number;
  current_downloads: number;
  one_time_download: boolean;
  revoked: boolean;
  revoked_at?: string;
  created_at: string;
  last_accessed_at?: string;
  short_url: string;
}

export interface CreateEncryptedDocumentRequest {
  name: string;
  description?: string;
  file: File;
  encryption_level: EncryptionLevel;
  password?: string;
  two_factor_enabled: false;
  expire_hours?: number;
  max_downloads?: number;
  one_time_download: boolean;
}
