import { useState } from "react";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { AlertCircle } from "lucide-react";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Ingresa a tu cuenta para editar tus enlaces."
              : "Crea una cuenta para generar tu QR y perfil público."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="border-green-500 text-green-600">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Registrarse"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
                setSuccessMessage(null);
              }}
            >
              {mode === "login"
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
