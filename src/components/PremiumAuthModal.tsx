import { useEffect, useId, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  QrCode,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

export type PremiumAuthMode = "login" | "register";

export type PremiumAuthCredentials = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type PremiumRegistrationDetails = PremiumAuthCredentials & {
  name: string;
  termsAccepted: boolean;
};

type PremiumAuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: PremiumAuthMode;
  loading?: boolean;
  error?: string | null;
  successMessage?: string | null;
  onClearStatus?: () => void;
  onLogin?: (credentials: PremiumAuthCredentials) => void;
  onRegister?: (details: PremiumRegistrationDetails) => void;
  onForgotPassword?: (email: string) => void;
};

function FieldShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#b6d5d9]/65 pb-2.5 text-[#e8f7f7] transition-colors focus-within:border-white">
      {children}
    </div>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="shrink-0 text-[#bfdce0]">{children}</span>;
}

/**
 * Modal aislado de autenticación. Sus botones cambian estados locales y emiten
 * callbacks opcionales; no importa ni ejecuta clientes de Supabase.
 */
export function PremiumAuthModal({
  open,
  onOpenChange,
  defaultMode = "login",
  loading = false,
  error = null,
  successMessage = null,
  onClearStatus,
  onLogin,
  onRegister,
  onForgotPassword,
}: PremiumAuthModalProps) {
  const [mode, setMode] = useState<PremiumAuthMode>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const passwordId = useId();
  const confirmationId = useId();
  const emailId = useId();
  const nameId = useId();
  const rememberId = useId();
  const termsId = useId();
  const isLogin = mode === "login";

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setNotice("");
    }
  }, [defaultMode, open]);

  const changeMode = (nextMode: PremiumAuthMode) => {
    setMode(nextMode);
    setNotice("");
    setShowPassword(false);
    setShowConfirmation(false);
    onClearStatus?.();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPassword("");
      setConfirmation("");
      setNotice("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    onClearStatus?.();

    if (!isLogin && password !== confirmation) {
      setNotice("Las contraseñas no coinciden. Revisa ambos campos.");
      return;
    }

    if (!isLogin && !termsAccepted) {
      setNotice("Debes aceptar los términos y condiciones para continuar.");
      return;
    }

    if (isLogin) {
      const credentials = { email: email.trim(), password, rememberMe };
      onLogin?.(credentials);
      if (!onLogin) {
        setNotice("Interfaz lista: conectaremos este botón al acceso real cuando lo apruebes.");
      }
      return;
    }

    const details = {
      name: name.trim(),
      email: email.trim(),
      password,
      rememberMe,
      termsAccepted,
    };
    onRegister?.(details);
    if (!onRegister) {
      setNotice("Interfaz lista: conectaremos el registro real en una fase separada.");
    }
  };

  const requestPasswordHelp = () => {
    onForgotPassword?.(email.trim());
    if (!onForgotPassword) {
      setNotice("Recuperación preparada: el envío de correo se conectará en una fase separada.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[31rem] gap-0 overflow-y-auto border border-[#86b7bc]/55 bg-transparent p-0 text-[#edf9fa] shadow-[0_32px_100px_rgba(0,26,30,0.65)] sm:rounded-[1.75rem]">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_5%,rgba(160,225,222,0.22),transparent_30%),radial-gradient(circle_at_88%_94%,rgba(0,0,0,0.38),transparent_37%),linear-gradient(145deg,#34777d_0%,#14565d_48%,#063940_100%)] px-7 pb-8 pt-14 sm:px-11 sm:pb-10 sm:pt-16">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(20deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:30px_30px,42px_42px] opacity-30" />
          <div className="pointer-events-none absolute -left-20 top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-16 bottom-[-7rem] h-64 w-64 rounded-full border border-white/10" />

          <div className="relative mx-auto flex w-full max-w-sm flex-col items-center">
            <div className="relative mb-7 flex h-[7.35rem] w-[7.35rem] items-center justify-center rounded-full border border-[#d7f1f2]/75 bg-[#0f5259]/50 shadow-[inset_0_1px_20px_rgba(255,255,255,0.15),0_14px_38px_rgba(0,15,18,0.3)] backdrop-blur-md">
              <div className="absolute inset-2 rounded-full border border-white/15" />
              <QrCode className="relative h-12 w-12 stroke-[1.35] text-[#e7f8f7]" aria-hidden="true" />
              <span className="absolute -bottom-2 rounded-full border border-[#d7f1f2]/45 bg-[#155e66] px-2.5 py-1 text-[0.55rem] font-bold tracking-[0.22em] text-white shadow-lg">
                QR
              </span>
            </div>

            <div className="text-center">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.3em] text-[#c7e9e9]/80">Cripqer</p>
              <DialogTitle className="mt-2 text-3xl font-light tracking-[0.06em] text-white sm:text-[2rem]">
                {isLogin ? "Bienvenido" : "Crea tu acceso"}
              </DialogTitle>
              <DialogDescription className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-[#d5edef]/85">
                {isLogin
                  ? "Gestiona tu identidad digital, enlaces y códigos QR desde un solo lugar."
                  : "Prepara tu espacio para crear, editar y compartir tu identidad QR."}
              </DialogDescription>
            </div>

            <form className="mt-8 w-full" onSubmit={handleSubmit} noValidate>
              <div className="space-y-6">
                {!isLogin && (
                  <label className="block" htmlFor={nameId}>
                    <span className="sr-only">Nombre completo</span>
                    <FieldShell>
                      <FieldIcon><UserRound className="h-5 w-5 stroke-[1.55]" /></FieldIcon>
                      <input
                        id={nameId}
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Nombre completo"
                        className="min-w-0 flex-1 bg-transparent text-base tracking-wide text-white outline-none placeholder:text-[#d7ecee]/70"
                      />
                    </FieldShell>
                  </label>
                )}

                <label className="block" htmlFor={emailId}>
                  <span className="sr-only">Correo electrónico</span>
                  <FieldShell>
                    <FieldIcon><Mail className="h-5 w-5 stroke-[1.55]" /></FieldIcon>
                    <input
                      id={emailId}
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Correo electrónico"
                      className="min-w-0 flex-1 bg-transparent text-base tracking-wide text-white outline-none placeholder:text-[#d7ecee]/70"
                    />
                  </FieldShell>
                </label>

                <label className="block" htmlFor={passwordId}>
                  <span className="sr-only">Contraseña</span>
                  <FieldShell>
                    <FieldIcon><LockKeyhole className="h-5 w-5 stroke-[1.55]" /></FieldIcon>
                    <input
                      id={passwordId}
                      required
                      minLength={6}
                      type={showPassword ? "text" : "password"}
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Contraseña"
                      className="min-w-0 flex-1 bg-transparent text-base tracking-wide text-white outline-none placeholder:text-[#d7ecee]/70"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="rounded p-1 text-[#d7ecee]/75 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </FieldShell>
                </label>

                {!isLogin && (
                  <label className="block" htmlFor={confirmationId}>
                    <span className="sr-only">Repetir contraseña</span>
                    <FieldShell>
                      <FieldIcon><KeyRound className="h-5 w-5 stroke-[1.55]" /></FieldIcon>
                      <input
                        id={confirmationId}
                        required
                        minLength={6}
                        type={showConfirmation ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        placeholder="Repetir contraseña"
                        className="min-w-0 flex-1 bg-transparent text-base tracking-wide text-white outline-none placeholder:text-[#d7ecee]/70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmation((visible) => !visible)}
                        className="rounded p-1 text-[#d7ecee]/75 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-white"
                        aria-label={showConfirmation ? "Ocultar repetición de contraseña" : "Mostrar repetición de contraseña"}
                        aria-pressed={showConfirmation}
                      >
                        {showConfirmation ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </FieldShell>
                  </label>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 text-sm">
                <label className="group flex cursor-pointer items-center gap-2.5 text-[#e1f3f3]" htmlFor={isLogin ? rememberId : termsId}>
                  <input
                    id={isLogin ? rememberId : termsId}
                    type="checkbox"
                    checked={isLogin ? rememberMe : termsAccepted}
                    onChange={(event) => {
                      if (isLogin) setRememberMe(event.target.checked);
                      else setTermsAccepted(event.target.checked);
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-[#d3ecee]/70 bg-[#0b434a]/60 transition peer-checked:border-white peer-checked:bg-[#d5edef]">
                    <Check className="h-3.5 w-3.5 text-[#0a454c] opacity-0 transition peer-checked:opacity-100" strokeWidth={3} />
                  </span>
                  <span className="leading-5">
                    {isLogin ? "Mantener sesión iniciada" : "Acepto los términos y condiciones"}
                  </span>
                </label>

                {isLogin && (
                  <button
                    type="button"
                    onClick={requestPasswordHelp}
                    className="shrink-0 rounded text-right italic text-[#e4f5f4] underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>

              {!isLogin && (
                <p className="mt-3 flex gap-2 text-xs leading-5 text-[#d5edef]/75">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Tus datos no se enviarán desde esta maqueta hasta que conectemos el flujo real.
                </p>
              )}

              <div aria-live="polite" className="mt-5 min-h-5 text-center text-xs leading-5 text-[#d9f1f0]">
                {error ? (
                  <span className="text-red-200">{error}</span>
                ) : successMessage ? (
                  <span className="text-emerald-200">{successMessage}</span>
                ) : (
                  notice
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-14 w-full items-center justify-center gap-2 bg-[#78aeb3] px-6 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_28px_rgba(0,24,28,0.28)] transition duration-150 hover:bg-[#8bc1c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12545b] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Procesando..." : isLogin ? "Iniciar sesión" : "Registrarse"}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>

              <p className="mt-6 text-center text-sm text-[#dbeff0]">
                {isLogin ? "¿Aún no tienes una cuenta?" : "¿Ya tienes una cuenta?"}{" "}
                <button
                  type="button"
                  onClick={() => changeMode(isLogin ? "register" : "login")}
                  className="font-semibold text-white underline underline-offset-4 transition hover:text-[#b9e0e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {isLogin ? "Crear cuenta" : "Iniciar sesión"}
                </button>
              </p>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
