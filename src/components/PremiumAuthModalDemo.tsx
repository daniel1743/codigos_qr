import { useState } from "react";
import { QrCode } from "lucide-react";
import { PremiumAuthModal } from "./PremiumAuthModal";

/**
 * Contenedor de demostración no montado. Permite previsualizar el modal sin
 * conectar rutas ni alterar el componente Auth que usa Supabase actualmente.
 */
export function PremiumAuthModalDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-teal-100/30 bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <QrCode className="h-4 w-4" />
        Abrir acceso Cripqer
      </button>
      <PremiumAuthModal open={open} onOpenChange={setOpen} />
    </div>
  );
}
