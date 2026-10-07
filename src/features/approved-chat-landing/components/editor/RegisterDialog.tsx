import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, Loader2Icon, XIcon } from 'lucide-react';
import { CripqerMark } from '../brand/CripqerLogo';

interface RegisterDialogProps {
  open: boolean;
  intent: 'save' | 'publish';
  pageName: string;
  onClose: () => void;
}

type Status = 'idle' | 'submitting' | 'done';

export function RegisterDialog({ open, intent, pageName, onClose }: RegisterDialogProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (open) {
      setStatus('idle');
      setError('');
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Escribe un correo válido para guardar tu página.');
      return;
    }
    setError('');
    setStatus('submitting');
    window.setTimeout(() => setStatus('done'), 1200);
  };

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby="register-title">
          <motion.div
          className="absolute inset-0 bg-ink/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose} />
        
          <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className="relative w-full max-w-[420px] rounded-t-[26px] bg-white p-6 shadow-2xl md:rounded-[26px] md:p-8">
          
            <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
            
              <XIcon className="h-[18px] w-[18px]" />
            </button>

            {status === 'done' ?
          <div className="py-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue">
                  <CheckIcon className="h-6 w-6 text-white" strokeWidth={2.5} />
                </span>
                <h2 id="register-title" className="mt-5 font-display text-[22px] font-bold text-ink">
                  {intent === 'publish' ? 'Tu página está casi publicada' : 'Página guardada'}
                </h2>
                <p className="mt-2 text-[14.5px] text-muted">Te enviamos un enlace a {email} para confirmar tu cuenta.</p>
                <button
              type="button"
              onClick={onClose}
              className="mt-6 h-11 w-full rounded-full bg-ink text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-ink/90">
              
                  Seguir editando
                </button>
              </div> :

          <>
                <CripqerMark size={36} />
                <h2 id="register-title" className="mt-5 font-display text-[22px] font-bold leading-tight text-ink">
                  Crea tu cuenta gratis para {intent === 'publish' ? 'publicar' : 'guardar'} tu página.
                </h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
                  «{pageName}» queda guardada tal como la dejaste. Toma menos de un minuto.
                </p>

                <button
              type="button"
              className="mt-6 flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-[14.5px] font-semibold text-ink shadow-[0_0_0_1px_rgba(15,26,46,0.14)] transition-colors duration-150 hover:bg-subtle">
              
                  <span className="text-[16px] font-bold text-brand-blue">G</span>
                  Continuar con Google
                </button>

                <div className="my-5 flex items-center gap-3 text-[12px] text-muted">
                  <span className="h-px flex-1 bg-line" />o con tu correo<span className="h-px flex-1 bg-line" />
                </div>

                <form onSubmit={submit} noValidate>
                  <label htmlFor="register-email" className="sr-only">
                    Correo electrónico
                  </label>
                  <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'register-error' : undefined}
                className={`h-12 w-full rounded-[14px] bg-subtle px-4 text-[15px] text-ink placeholder:text-muted/70 focus:bg-white focus:outline-none focus:ring-2 ${
                error ? 'ring-2 ring-red-500/70' : 'focus:ring-brand-blue'}`
                } />
              
                  {error &&
              <p id="register-error" className="mt-2 text-[12.5px] text-red-700">
                      {error}
                    </p>
              }
                  <button
                type="submit"
                disabled={status === 'submitting'}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-blue text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-blue-deep active:scale-[0.98] disabled:opacity-70">
                
                    {status === 'submitting' && <Loader2Icon className="h-4 w-4 animate-spin" />}
                    Crear cuenta gratis
                  </button>
                </form>
              </>
          }
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}