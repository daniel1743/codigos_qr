import { useEffect, useId, useRef } from "react";

/**
 * Landing Launch Lite V2 - read-only preview of a demonstrative sample card.
 *
 * The public gallery ships eight *demonstrative* samples. There is no template
 * document and no certified capture behind them: `TEMPLATE_SHOTS` is `null` for
 * every label and the labels themselves map to no real template family, so this
 * preview never invents a design. It shows the very same sample the tile already
 * renders - enlarged and readable - and, once a real capture is wired into
 * `TEMPLATE_SHOTS`, it shows that capture through the same read-only viewer.
 *
 * It is deliberately NOT a selection surface: no "Usar esta", no "Elegir
 * plantilla", no editable field, no internal selection route, and it never
 * touches the base Bio card. Closing it is the only action.
 */
export interface SampleCardPreviewProps {
  /** Sample family label, e.g. "Belleza". Shown verbatim on the tile. */
  label: string;
  /** Certified capture for this sample, when one exists. */
  shot?: string | null;
  /** Decorative mock values, used while no capture exists. */
  bg: string;
  av: string;
  avc: string;
  bar: string;
  nameColor: string;
  onClose: () => void;
}

/** Product copy required by the launch contract: a sample, not a template. */
export const SAMPLE_PREVIEW_COPY =
  "Esta es una muestra de diseño. Puedes comenzar creando y personalizando tu propia tarjeta.";

export function SampleCardPreview({
  label,
  shot,
  bg,
  av,
  avc,
  bar,
  nameColor,
  onClose,
}: SampleCardPreviewProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // Scroll lock: the panel owns the scroll while it is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      data-testid="sample-card-preview-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        background: "rgba(9,9,9,0.74)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="sample-card-preview"
        data-sample={label}
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 380,
          maxHeight: "calc(100vh - 36px)",
          overflowY: "auto",
          borderRadius: 20,
          background: "#FAF8F3",
          color: "#111111",
          padding: 18,
          boxShadow: "0 30px 70px rgba(0,0,0,0.45)",
        }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar vista previa"
          data-testid="sample-card-preview-close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 3,
            width: 34,
            height: 34,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #e3ded2",
            borderRadius: 999,
            background: "rgba(250,248,243,0.94)",
            color: "#111111",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        {/* The sample itself: the real capture when one exists, otherwise the
            exact same decorative mock the gallery tile renders. */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "9 / 15",
            borderRadius: 16,
            overflow: "hidden",
            background: shot ? undefined : bg,
            boxShadow: "0 14px 30px rgba(9,9,9,0.14)",
          }}
        >
          {shot ? (
            <img
              src={shot}
              alt={`Muestra de diseño ${label}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 26,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: av,
                  color: avc,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 17,
                }}
              >
                {label[0]}
              </div>
              <span
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 14,
                  color: nameColor,
                }}
              >
                Nombre Apellido
              </span>
              <div
                style={{
                  width: "70%",
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <i style={{ height: 16, borderRadius: 7, display: "block", background: bar }} />
                <i style={{ height: 16, borderRadius: 7, display: "block", background: bar }} />
                <i style={{ height: 16, borderRadius: 7, display: "block", background: bar }} />
              </div>
            </div>
          )}
        </div>

        <p
          id={titleId}
          style={{
            margin: "16px 0 0",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Muestra · {label}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6, color: "#4c4c4a" }}>
          {SAMPLE_PREVIEW_COPY}
        </p>
      </div>
    </div>
  );
}
