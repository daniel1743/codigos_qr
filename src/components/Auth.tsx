import { useState } from "react";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  QrCode,
  Sparkles,
  User,
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabase = getBrowserSupabaseClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === "signup") {
        if (!termsAccepted) {
          throw new Error("Debes aceptar los términos y condiciones para continuar.");
        }
        if (!name.trim()) {
          throw new Error("Por favor, ingresa tu nombre.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;
        setSuccessMessage(
          "Revisa tu correo para confirmar la cuenta (o ingresa si el auto-confirm está activado).",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // La sesión se establecerá automáticamente y el padre escuchará el onAuthStateChange
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Ha ocurrido un error durante la autenticación.");
      } else {
        setError("Ha ocurrido un error durante la autenticación.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen overflow-hidden bg-[#0b1020] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <div className="relative grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/40 lg:min-h-[680px] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_18%_15%,#5b6cff_0%,transparent_34%),linear-gradient(135deg,#28105f_0%,#4b148f_48%,#111d5e_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.12)_45%,transparent_46%)] opacity-60" />
            <div className="absolute -left-20 top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute bottom-16 right-12 h-36 w-36 rounded-full bg-fuchsia-500/30 blur-3xl" />

            <div className="relative z-10 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold tracking-tight">QR Links</p>
                <p className="text-xs text-white/70">Tu página instalable en un escaneo</p>
              </div>
            </div>

            <div className="relative z-10 mx-auto w-full max-w-md">
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="rounded-[1.5rem] bg-white p-5 text-slate-950 shadow-xl">
                  <div className="h-24 rounded-2xl bg-[linear-gradient(135deg,#2563eb,#8b5cf6_55%,#06b6d4)]" />
                  <div className="-mt-10 flex flex-col items-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-white shadow-lg">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h2 className="mt-4 text-3xl font-extrabold tracking-tight">Tu Marca</h2>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      Enlaces, WhatsApp y QR permanente con una presencia cuidada.
                    </p>
                  </div>
                  <div className="mt-6 space-y-3">
                    {["WhatsApp", "Portafolio", "Reservar hora"].map((item) => (
                      <div
                        key={item}
                        className="flex h-12 items-center justify-between rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white"
                      >
                        {item}
                        <ArrowRight className="h-4 w-4 opacity-70" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs font-semibold text-white/80">
                {["QR estable", "Más de 50 fuentes", "Editor visual"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-2"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <p className="relative z-10 max-w-sm text-sm leading-6 text-white/70">
              Crea una página que se sienta tuya, no una plantilla genérica.
            </p>
          </section>

          <section className="relative flex items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fc_100%)] px-5 py-10 text-slate-950 sm:px-8 lg:px-12">
            <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-[5rem] bg-blue-50" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-tr-[4rem] bg-slate-100" />

            <form
              onSubmit={handleAuth}
              className="relative z-10 w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0f172a] text-white shadow-xl shadow-slate-900/20">
                <LockKeyhole className="h-7 w-7" />
              </div>

              <div className="text-center">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Acceso seguro
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {isLogin ? "Iniciar sesión" : "Crear cuenta"}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {isLogin
                    ? "Ingresa a tu editor para actualizar enlaces, diseño y QR."
                    : "Crea tu acceso para generar tu QR y publicar tu página."}
                </p>
              </div>

              <div className="mt-7 space-y-4">
                {error && (
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {successMessage && (
                  <Alert className="rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700">
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}

                {!isLogin && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500"
                    >
                      Nombre completo
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Tu nombre"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                        className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-slate-950 shadow-inner shadow-slate-900/[0.02] focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500"
                  >
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-slate-950 shadow-inner shadow-slate-900/[0.02] focus-visible:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500"
                  >
                    Contraseña
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-11 text-slate-950 shadow-inner shadow-slate-900/[0.02] focus-visible:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 hover:text-slate-500 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      className="border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none text-slate-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Acepto los términos y condiciones
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-7 space-y-3">
                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#2563eb,#6d28d9)] text-sm font-bold text-white shadow-lg shadow-blue-900/20 hover:opacity-95"
                  disabled={loading}
                >
                  {loading ? "Procesando..." : isLogin ? "Entrar al editor" : "Crear mi cuenta"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full rounded-2xl text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
