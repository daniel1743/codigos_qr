import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidPageAlias, normalizePageAlias } from "@/lib/page-alias";

type CustomPublicLinkControlProps = {
  currentAlias: string | null;
  publicUrlPrefix: string;
  getPublicUrl: (alias: string) => string;
  checkAvailability: (alias: string) => Promise<boolean>;
  saveAlias: (alias: string | null) => Promise<string | null>;
};

/**
 * Compact friendly public-link editor, relocated from the Power Editor into the
 * QR area. It reuses the existing `page-alias` normalization/validation authority
 * and never touches `public_id`.
 */
export function CustomPublicLinkControl({
  currentAlias,
  publicUrlPrefix,
  getPublicUrl,
  checkAvailability,
  saveAlias,
}: CustomPublicLinkControlProps) {
  const [draft, setDraft] = useState(currentAlias ?? "");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const normalized = normalizePageAlias(draft);

  useEffect(() => {
    if (!normalized || !isValidPageAlias(normalized)) {
      setAvailable(null);
      setChecking(false);
      return;
    }
    if (normalized === currentAlias) {
      setAvailable(true);
      setChecking(false);
      return;
    }

    let active = true;
    setChecking(true);
    const timer = window.setTimeout(() => {
      void checkAvailability(normalized)
        .then((result) => {
          if (active) setAvailable(result);
        })
        .catch(() => {
          if (active) setAvailable(null);
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkAvailability, currentAlias, normalized]);

  const save = async () => {
    setMessage(null);
    const next = normalized || null;
    if (next && !isValidPageAlias(next)) {
      setMessage({ kind: "error", text: "Ese enlace no es válido." });
      return;
    }
    if (next && available !== true) {
      setMessage({ kind: "error", text: "Este enlace ya está en uso. Prueba con otro." });
      return;
    }

    setSaving(true);
    try {
      const saved = await saveAlias(next);
      setDraft(saved ?? "");
      setAvailable(saved ? true : null);
      setMessage({ kind: "success", text: "Enlace guardado" });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setMessage({
        kind: "error",
        text:
          code === "23505"
            ? "Este enlace ya está en uso. Prueba con otro."
            : "No se pudo guardar el enlace.",
      });
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!normalized) return;
    try {
      await navigator.clipboard.writeText(getPublicUrl(normalized));
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const friendlyUrl = normalized && isValidPageAlias(normalized) ? getPublicUrl(normalized) : "";

  return (
    <section
      className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm"
      aria-label="Personaliza tu enlace"
    >
      <div className="space-y-1">
        <h4 className="font-semibold">Personaliza tu enlace</h4>
        <p className="text-xs text-muted-foreground">
          Elige un enlace fácil de recordar y compartir.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qr-public-link" className="text-xs font-semibold">
          Tu enlace
        </Label>
        <div className="flex items-center gap-1">
          <span className="shrink-0 text-xs text-muted-foreground">{publicUrlPrefix}</span>
          <Input
            id="qr-public-link"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setMessage(null);
            }}
            placeholder="bienestar-personal"
            maxLength={60}
            autoComplete="off"
            className="h-9"
          />
          {checking && (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
              aria-label="Comprobando disponibilidad"
            />
          )}
          {!checking && available === true && (
            <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Enlace disponible" />
          )}
        </div>
        {normalized &&
          isValidPageAlias(normalized) &&
          available === true &&
          normalized !== currentAlias && (
            <p className="text-xs text-emerald-600">Este enlace está disponible.</p>
          )}
        {!checking && available === false && normalized !== currentAlias && (
          <p className="text-xs text-destructive">Este enlace ya está en uso. Prueba con otro.</p>
        )}
        {draft && !isValidPageAlias(normalized) && (
          <p className="text-xs text-destructive">Ese enlace no es válido.</p>
        )}
        {message && (
          <p
            className={
              message.kind === "success" ? "text-xs text-emerald-600" : "text-xs text-destructive"
            }
          >
            {message.text}
          </p>
        )}
      </div>

      {friendlyUrl && (
        <p className="truncate text-xs text-muted-foreground">URL pública: {friendlyUrl}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void save()} disabled={saving || checking}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar enlace
        </Button>
        {normalized && isValidPageAlias(normalized) && (
          <>
            <Button size="sm" variant="outline" onClick={() => void copy()}>
              <Copy className="mr-2 h-4 w-4" /> Copiar
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={getPublicUrl(normalized)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir
              </a>
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
