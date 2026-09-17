import { useCallback, useEffect, useState } from "react";
import {
  resolveQaProfileFn,
  type QaOwnedProfile,
  type QaProfileResolutionResult,
} from "@/lib/onboarding-v2";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { PremiumOnboardingFlow } from "../premium/PremiumOnboardingFlow";
import "./onboarding-test-profile-gate.css";

type GateState =
  | { status: "LOADING" }
  | { status: "RESOLVED"; profileId: string }
  | { status: "SELECT_PROFILE"; profiles: QaOwnedProfile[] }
  | { status: "MESSAGE"; message: string; retryable: boolean };

const initialState: GateState = { status: "LOADING" };

export function OnboardingTestProfileGate({
  requestedProfileId,
}: {
  requestedProfileId?: string | null;
}) {
  const [state, setState] = useState<GateState>(initialState);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const applyResolution = useCallback((result: QaProfileResolutionResult) => {
    if (result.status === "RESOLVED") {
      setState({ status: "RESOLVED", profileId: result.profileId });
      return;
    }
    if (result.status === "SELECT_PROFILE") {
      setSelectedProfileId(result.profiles[0]?.id ?? "");
      setState({ status: "SELECT_PROFILE", profiles: result.profiles });
      return;
    }
    setState({
      status: "MESSAGE",
      message: result.message,
      retryable: result.status === "LOOKUP_FAILED",
    });
  }, []);

  const resolve = useCallback(
    async (signal?: { cancelled: boolean }) => {
      setState({ status: "LOADING" });
      try {
        const {
          data: { session },
        } = await getBrowserSupabaseClient().auth.getSession();
        if (signal?.cancelled) return;
        if (!session?.access_token) {
          setState({
            status: "MESSAGE",
            message: "Debes iniciar sesión para ejecutar esta prueba QA.",
            retryable: false,
          });
          return;
        }

        const result = await resolveQaProfileFn({
          data: {
            accessToken: session.access_token,
            requestedProfileId: requestedProfileId ?? null,
          },
        });
        if (signal?.cancelled) return;
        applyResolution(result);
      } catch {
        if (!signal?.cancelled) {
          setState({
            status: "MESSAGE",
            message: "No pudimos verificar tus perfiles.",
            retryable: true,
          });
        }
      }
    },
    [applyResolution, requestedProfileId],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void resolve(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [resolve]);

  if (state.status === "RESOLVED") {
    return <PremiumOnboardingFlow enableInspector profileId={state.profileId} />;
  }

  if (state.status === "SELECT_PROFILE") {
    return (
      <main className="qa-profile-gate">
        <section className="qa-profile-gate__card" aria-labelledby="qa-profile-title">
          <p className="qa-profile-gate__eyebrow">Prueba QA</p>
          <h1 id="qa-profile-title">Elige el perfil de esta prueba</h1>
          <p>La sesión tiene más de un perfil propio. No mostramos perfiles de otros usuarios.</p>
          <label htmlFor="qa-profile-select">Perfil propio</label>
          <select
            id="qa-profile-select"
            value={selectedProfileId}
            onChange={(event) => setSelectedProfileId(event.target.value)}
          >
            {state.profiles.map((profile) => (
              <option value={profile.id} key={profile.id}>
                {profile.displayName}
                {profile.publicId ? ` · ${profile.publicId}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedProfileId}
            onClick={() => setState({ status: "RESOLVED", profileId: selectedProfileId })}
          >
            Continuar con este perfil
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="qa-profile-gate" aria-live="polite">
      <section className="qa-profile-gate__card" aria-labelledby="qa-profile-title">
        <p className="qa-profile-gate__eyebrow">Prueba QA</p>
        <h1 id="qa-profile-title">
          {state.status === "LOADING" ? "Verificando tu sesión" : "No podemos iniciar la prueba"}
        </h1>
        <p>
          {state.status === "LOADING"
            ? "Buscando un perfil propio disponible para esta sesión."
            : state.message}
        </p>
        {state.status === "MESSAGE" && state.retryable && (
          <button type="button" onClick={() => void resolve()}>
            Reintentar
          </button>
        )}
        {state.status === "MESSAGE" && !state.retryable && (
          <a href="/editor">Ir al inicio de sesión</a>
        )}
      </section>
    </main>
  );
}
