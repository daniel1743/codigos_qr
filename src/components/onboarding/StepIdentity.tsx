import { useRef } from "react";

import Logo from "@/components/brand/Logo";
import { IDENTITY_LIMITS, type OnboardingIdentity } from "@/lib/onboarding/types";
import { BrandButton, Field, StepHeading, controlStyle, focusRing } from "./primitives";

/**
 * Avatar handling: the preview is an in-memory object URL owned by
 * OnboardingShell. This component never creates cleanup that could
 * invalidate state the parent flow still uses; it only reports the new URL.
 */
function AvatarPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-[var(--space-4)]">
      <span
        aria-hidden="true"
        className="grid shrink-0 place-items-center overflow-hidden"
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--brand-radius-pill)",
          backgroundColor: "var(--brand-primary-soft)",
          border: "1px solid var(--border-default)",
        }}
      >
        {value ? (
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Logo variant="symbol" width={30} height={30} title="" />
        )}
      </span>
      <div className="flex flex-wrap gap-[var(--space-2)]">
        <BrandButton variant="secondary" onClick={() => inputRef.current?.click()}>
          {value ? "Cambiar foto" : "Añadir foto"}
        </BrandButton>
        {value && (
          <BrandButton variant="ghost" onClick={() => onChange(null)}>
            Quitar
          </BrandButton>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Foto de perfil (opcional)"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(URL.createObjectURL(file));
          }}
        />
      </div>
    </div>
  );
}

export function StepIdentity({
  identity,
  onChange,
}: {
  identity: OnboardingIdentity;
  onChange: (identity: OnboardingIdentity) => void;
}) {
  return (
    <>
      <StepHeading title="Cuéntanos quién eres" note="Lo básico. Nada más." />
      <div className="grid gap-[var(--space-4)]">
        <AvatarPicker
          value={identity.avatar_preview}
          onChange={(url) => onChange({ ...identity, avatar_preview: url })}
        />
        <Field label="Nombre">
          <input
            type="text"
            maxLength={IDENTITY_LIMITS.name}
            value={identity.name}
            onChange={(e) => onChange({ ...identity, name: e.target.value })}
            placeholder="Camila Rojas"
            autoComplete="name"
            style={controlStyle()}
            className={focusRing}
          />
        </Field>
        <Field
          label="Profesión"
          counter={`${identity.profession.length}/${IDENTITY_LIMITS.profession}`}
        >
          <input
            type="text"
            maxLength={IDENTITY_LIMITS.profession}
            value={identity.profession}
            onChange={(e) => onChange({ ...identity, profession: e.target.value })}
            placeholder="Diseñadora de uñas"
            style={controlStyle()}
            className={focusRing}
          />
        </Field>
        <Field label="Sobre ti" hint="Opcional." counter={`${identity.bio.length}/${IDENTITY_LIMITS.bio}`}>
          <textarea
            rows={3}
            maxLength={IDENTITY_LIMITS.bio}
            value={identity.bio}
            onChange={(e) => onChange({ ...identity, bio: e.target.value })}
            placeholder="Una frase que explique lo que ofreces."
            style={{ ...controlStyle(), resize: "vertical" }}
            className={focusRing}
          />
        </Field>
      </div>
    </>
  );
}
