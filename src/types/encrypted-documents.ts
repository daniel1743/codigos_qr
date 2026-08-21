// Types for Encrypted Documents
export type DocumentType = 'excel' | 'pdf' | 'image' | 'word' | 'zip';
export type EncryptionLevel = 'standard' | 'high' | 'maximum';

export interface EncryptedDocument {
  id: string;
  user_id: string;
  name: string;
  description?: string;

  // File info
  original_filename: string;
  file_type: DocumentType;
  file_size_bytes: number;
  mime_type: string;

  // Storage
  encrypted_file_path: string; // Supabase Storage path
  encryption_key_hash: string; // Hashed for verification

  // Security
  encryption_level: EncryptionLevel;
  password_required: boolean;
  password_hash?: string;
  two_factor_enabled: boolean;

  // Access Control
  expire_at?: string; // ISO timestamp
  max_downloads?: number;
  current_downloads: number;
  one_time_download: boolean;
  ip_whitelist?: string[];
  revoked: boolean;

  // Audit
  created_at: string;
  last_accessed_at?: string;
  access_log: AccessLog[];

  // QR Code
  qr_code_id: string;
  qr_code_url: string;
  short_url: string;
}

export interface AccessLog {
  timestamp: string;
  ip_address: string;
  user_agent: string;
  device_fingerprint?: string;
  action: 'view' | 'download' | 'failed_auth';
  location?: {
    country?: string;
    city?: string;
  };
}

export interface DocumentAccessAttempt {
  document_id: string;
  password?: string;
  two_factor_code?: string;
  device_fingerprint?: string;
}

export interface CreateEncryptedDocumentRequest {
  name: string;
  description?: string;
  file: File;

  // Security settings
  encryption_level: EncryptionLevel;
  password?: string;
  two_factor_enabled: boolean;

  // Access control
  expire_hours?: number; // null = never expires
  max_downloads?: number; // null = unlimited
  one_time_download: boolean;
  ip_whitelist?: string[];
}
