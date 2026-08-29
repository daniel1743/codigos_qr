import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import {
  PremiumAuthModal,
  type PremiumAuthCredentials,
  type PremiumRegistrationDetails,
} from "./PremiumAuthModal";

/**
 * Contenedor de autenticación. Conserva la lógica original de Supabase
 * (inicio de sesión y registro) y delega la interfaz en el modal premium
 * diseñado por Manos. Se mantiene como `<Auth />` para no alterar los puntos
 * de uso existentes.
 */
export function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearStatus = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleLogin = async ({ email, password }: PremiumAuthCredentials) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = getBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // La sesión se establecerá automáticamente y el padre escuchará el onAuthStateChange
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

  const handleRegister = async ({ name, email, password }: PremiumRegistrationDetails) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!name.trim()) {
        throw new Error("Por favor, ingresa tu nombre.");
      }
      const supabase = getBrowserSupabaseClient();
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

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      navigate({ to: "/", replace: true });
    }
  };

  return (
    <PremiumAuthModal
      open
      onOpenChange={handleClose}
      loading={loading}
      error={error}
      successMessage={successMessage}
      onClearStatus={clearStatus}
      onLogin={handleLogin}
      onRegister={handleRegister}
    />
  );
}
