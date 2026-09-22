import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import { useEditor } from "../contexts/EditorContext";

export function Toaster() {
  const { toast, dismissToast } = useEditor();

  return (
    <div
      data-chrome="true"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 lg:bottom-8"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-black px-4 py-3 shadow-float"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15">
              <CheckIcon className="h-3 w-3 text-white" strokeWidth={2.6} />
            </span>
            <span className="text-[13.5px] font-medium text-white">{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={toast.onAction}
                className="ml-1 rounded-lg px-2 py-1 text-[13.5px] font-medium text-white underline decoration-white/40 underline-offset-4 transition-colors duration-150 ease-premium hover:decoration-white"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={dismissToast}
              className="ml-1 text-[13px] text-white/60 transition-colors duration-150 ease-premium hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
