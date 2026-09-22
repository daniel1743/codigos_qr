import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  width?: string;
  padded?: boolean;
}

export function Modal({ open, onClose, label, children, width = 'max-w-lg', padded = true }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    
    // Lock background scroll
    const scrollContainer = document.getElementById('workspace-scroll-container');
    const originalOverflow = scrollContainer ? scrollContainer.style.overflow : '';
    if (scrollContainer) scrollContainer.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      if (scrollContainer) scrollContainer.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open &&
      <motion.div
        key="overlay"
        data-chrome="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            'relative max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-float sm:rounded-3xl',
            width
          )}>
          
            <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-hairline bg-surface/90 text-body backdrop-blur-sm transition-colors duration-150 ease-premium hover:bg-[#F5F2ED] hover:text-ink">
            
              <XIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
            <div className={cn('cq-scroll max-h-[92vh] overflow-y-auto', padded && 'p-6 sm:p-7')}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}