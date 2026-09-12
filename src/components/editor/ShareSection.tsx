import { QRStudio, type QRStudioProps } from "../qr/QRStudio";

export type ShareSectionProps = QRStudioProps;

/**
 * Backward-compatible alias. The real QR Studio now lives in
 * `src/components/qr/QRStudio.tsx` and is shared by both the Basic Editor's
 * Share section and the dedicated `/qr` route.
 */
export function ShareSection(props: ShareSectionProps) {
  return <QRStudio {...props} />;
}
