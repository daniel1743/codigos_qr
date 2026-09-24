import React, { useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  Loader2Icon,
  MonitorIcon,
  PenLineIcon,
  Redo2Icon,
  Settings2Icon,
  SmartphoneIcon,
  Undo2Icon,
} from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { templateOrder, templates } from "../../data/templates";
import { cx } from "../../utils/cx";
import type { TemplateId } from "../../types/editor";
import Logo from "../../../../components/brand/Logo";

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "grid h-9 w-9 shrink-0 place-items-center rounded-[10px] transition-colors duration-150 disabled:pointer-events-none disabled:opacity-30",
        active ? "bg-select-soft text-select" : "text-ink hover:bg-[#F2F3F5]",
      )}
    >
      {children}
    </button>
  );
}

export function TopBar() {
  const ed = useEditor();
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const meta = templates[ed.templateId];
  const tab = (active: boolean) =>
    cx(
      "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 text-[12.5px] font-medium transition-colors duration-150",
      active
        ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.1)]"
        : "text-mute hover:text-ink",
    );

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-white px-3 lg:gap-3 lg:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[9px]"
          aria-label="Cripqer"
        >
          <Logo variant="symbol" width={20} height={20} title="Cripqer" className="h-5 w-5" />
        </div>
        <div className="hidden min-w-0 2xl:block">
          <p className="text-[13px] font-semibold leading-tight text-ink">Cripqer</p>
          <p className="truncate text-[11.5px] leading-tight text-mute">cripqer.com/{meta.slug}</p>
        </div>
        <span className="hidden h-8 items-center rounded-[8px] bg-white px-3 text-[12.5px] font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.1)] sm:flex">
          Editor Magic
        </span>
      </div>

      <>
        <div
          className="mx-auto hidden rounded-[10px] bg-[#F2F3F5] p-0.5 md:flex"
          role="tablist"
          aria-label="Plantilla"
        >
          {templateOrder.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={ed.templateId === id}
              onClick={() => ed.setTemplateId(id)}
              className={tab(ed.templateId === id)}
            >
              <span className="hidden lg:inline">{templates[id].name}</span>
              <span className="lg:hidden">{templates[id].short}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 md:hidden">
          <select
            aria-label="Plantilla"
            value={ed.templateId}
            onChange={(e) => ed.setTemplateId(e.target.value as TemplateId)}
            className="h-9 w-full appearance-none rounded-[10px] border border-line bg-white px-2 pr-8 text-[13px]"
          >
            {templateOrder.map((id) => (
              <option key={id} value={id}>
                {templates[id].short}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div
            className="mr-1 hidden rounded-[10px] bg-[#F2F3F5] p-0.5 md:flex"
            role="radiogroup"
            aria-label="Dispositivo"
          >
            <button
              type="button"
              role="radio"
              aria-checked={ed.device === "desktop"}
              aria-label="Escritorio"
              title="Escritorio"
              onClick={() => ed.setDevice("desktop")}
              className={tab(ed.device === "desktop")}
            >
              <MonitorIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={ed.device === "mobile"}
              aria-label="Móvil"
              title="Móvil"
              onClick={() => ed.setDevice("mobile")}
              className={tab(ed.device === "mobile")}
            >
              <SmartphoneIcon className="h-4 w-4" />
            </button>
          </div>
          <IconButton
            label="Deshacer"
            onClick={ed.undo}
            disabled={!ed.canUndo || ed.mode === "preview"}
          >
            <Undo2Icon className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Rehacer"
            onClick={ed.redo}
            disabled={!ed.canRedo || ed.mode === "preview"}
          >
            <Redo2Icon className="h-4 w-4" />
          </IconButton>
          <span
            className="flex min-w-0 max-w-[78px] shrink items-center gap-1 whitespace-nowrap px-1 text-[11px] text-mute sm:max-w-[92px] sm:gap-1.5 sm:px-1.5 sm:text-[12px]"
            aria-live="polite"
          >
            {ed.saveState === "saving" ? (
              <>
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> Guardando…
              </>
            ) : (
              <>
                <CheckIcon className="h-3.5 w-3.5 text-[#16A34A]" /> Guardado
              </>
            )}
          </span>
          <IconButton
            label="Ajustes avanzados de página"
            onClick={() => ed.setSettingsOpen(true)}
            active={ed.settingsOpen}
            disabled={ed.mode === "preview"}
          >
            <Settings2Icon className="h-4 w-4" />
          </IconButton>
          <button
            type="button"
            onClick={() => ed.setMode(ed.mode === "edit" ? "preview" : "edit")}
            className={cx(
              "ml-1 hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-medium transition-colors duration-150 md:inline-flex",
              ed.mode === "preview" ? "bg-select-soft text-select" : "text-ink hover:bg-[#F2F3F5]",
            )}
          >
            {ed.mode === "preview" ? (
              <PenLineIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {ed.mode === "preview" ? "Editar" : "Vista previa"}
            </span>
          </button>
          <button
            type="button"
            onClick={ed.publish}
            disabled={ed.publishing}
            className="ml-1 hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-70 md:inline-flex"
          >
            {ed.publishing && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
            Publicar
          </button>
          <div className="relative ml-1 md:hidden">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={mobileActionsOpen}
              aria-label="Ver y publicar"
              onClick={() => setMobileActionsOpen((open) => !open)}
              className="inline-flex h-9 items-center gap-1 rounded-[10px] bg-ink px-2.5 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-90"
            >
              {ed.publishing && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />}
              <span>{ed.mode === "preview" ? "Editar" : "Acciones"}</span>
              <ChevronDownIcon
                className={cx(
                  "h-3.5 w-3.5 transition-transform",
                  mobileActionsOpen && "rotate-180",
                )}
              />
            </button>
            {mobileActionsOpen && (
              <div
                role="menu"
                className="absolute right-0 top-11 z-50 min-w-[150px] rounded-[10px] border border-line bg-white p-1.5 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    ed.setMode(ed.mode === "edit" ? "preview" : "edit");
                    setMobileActionsOpen(false);
                  }}
                  className="flex h-9 w-full items-center rounded-[8px] px-3 text-left text-[13px] text-ink hover:bg-[#F2F3F5]"
                >
                  {ed.mode === "preview" ? "Editar" : "Vista previa"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    ed.publish();
                    setMobileActionsOpen(false);
                  }}
                  disabled={ed.publishing}
                  className="flex h-9 w-full items-center rounded-[8px] px-3 text-left text-[13px] font-semibold text-ink hover:bg-[#F2F3F5] disabled:opacity-60"
                >
                  Publicar
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    </header>
  );
}
