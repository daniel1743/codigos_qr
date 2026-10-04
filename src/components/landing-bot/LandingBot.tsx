import React, { useEffect, useRef, useState } from "react";
import { BotIcon, MessageCircleIcon, SendIcon, XIcon } from "lucide-react";
import { askLandingBotFn } from "../../lib/landing-bot/server";
import { landingBotWhatsAppLink } from "../../lib/landing-bot/config";
import type { LandingBotConfig } from "../../isolated/magic-page-editor/types/editor";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <strong key={`${keyPrefix}-b${i++}`} className="font-semibold">
        {m[1] ?? ""}
      </strong>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let buffer: string[] = [];
  let key = 0;
  const flush = () => {
    if (!buffer.length) return;
    const items = buffer;
    buffer = [];
    blocks.push(
      <ul key={`ul-${key++}`} className="my-1 list-disc space-y-1 pl-4 marker:text-blue-500">
        {items.map((item, idx) => (
          <li key={idx} className="whitespace-pre-wrap">
            {renderInline(item, `li-${key}-${idx}`)}
          </li>
        ))}
      </ul>,
    );
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      buffer.push(bullet[1] ?? "");
      continue;
    }
    flush();
    if (line.trim() === "") {
      blocks.push(<div key={`sp-${key++}`} className="h-2" aria-hidden="true" />);
      continue;
    }
    blocks.push(
      <p key={`p-${key++}`} className="whitespace-pre-wrap">
        {renderInline(line, `p-${key}`)}
      </p>,
    );
  }
  flush();
  return <>{blocks}</>;
}

function BotFace({ config }: { config: LandingBotConfig }) {
  if (config.persona === "custom" && config.avatarUrl) {
    return <img src={config.avatarUrl} alt="" className="h-full w-full object-cover" />;
  }
  return <BotIcon className="h-full w-full p-1.5" strokeWidth={1.8} />;
}

export function LandingBot({
  publicId,
  config,
  previewOnly = false,
  overlay = false,
}: {
  publicId?: string;
  config: LandingBotConfig;
  previewOnly?: boolean;
  /** Anchors the launcher to the nearest positioned ancestor instead of the viewport (editor canvases). */
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, open]);

  const waLink = config.whatsappEnabled
    ? landingBotWhatsAppLink(config.whatsapp, `Hola ${config.name}, te escribo desde tu página.`)
    : null;

  const send = async (value: string) => {
    const text = value.trim();
    if (!text || typing) return;
    const next = [...messages, { id: `${Date.now()}-u`, sender: "user" as const, text }];
    setMessages(next);
    setInput("");
    if (previewOnly || !publicId) {
      setTyping(true);
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            sender: "assistant",
            text: "Estás viendo una **vista previa**. Cuando publiques la página responderé con IA usando la información de tu página.",
          },
        ]);
        setTyping(false);
      }, 600);
      return;
    }
    setTyping(true);
    try {
      const res = await askLandingBotFn({
        data: { publicId, messages: next.map((m) => ({ role: m.sender, content: m.text })) },
      });
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, sender: "assistant", text: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-e`, sender: "assistant", text: "No pude responder ahora. Intenta de nuevo." },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (

    <div className={`${overlay ? "absolute" : "fixed"} bottom-5 right-5 flex flex-col items-end gap-3 ${overlay ? "z-[55]" : previewOnly ? "z-[30]" : "z-[70]"}`}>
      {open && (
        <div className="flex h-[70vh] max-h-[560px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
          <header className="flex items-center gap-3 border-b border-black/5 bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-3 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15">
              <BotFace config={config} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{config.name || "Asistente"}</p>
              <p className="text-[11.5px] text-white/75">
                {previewOnly ? "Vista previa · no conecta con IA" : "En línea · responde al instante"}
              </p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15">
              <XIcon className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4 text-[14px] text-gray-800">
            <div className="mr-auto max-w-[85%] rounded-2xl rounded-tl-md border border-gray-100 bg-white px-3.5 py-2.5 shadow-sm">
              <p>👋 ¡Hola! Soy {config.name || "el asistente"}. ¿En qué te puedo ayudar?</p>
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.sender === "user"
                    ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-blue-600 px-3.5 py-2.5 font-medium text-white shadow-sm"
                    : "mr-auto max-w-[85%] rounded-2xl rounded-tl-md border border-gray-100 bg-white px-3.5 py-2.5 shadow-sm"
                }
              >
                <FormattedMessage text={msg.text} />
              </div>
            ))}
            {typing && (
              <div className="mr-auto flex w-16 items-center gap-1 rounded-2xl rounded-tl-md border border-gray-100 bg-white px-3.5 py-3 shadow-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0.3s]" />
              </div>
            )}
            <div ref={endRef} className="h-1" />
          </div>

          {waLink && (
            <div className="px-3.5 pb-2">
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                <MessageCircleIcon className="h-4 w-4" /> Escribir por WhatsApp
              </a>
            </div>
          )}

          <div className="flex items-end gap-2 border-t border-black/5 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Escribe un mensaje…"
              aria-label="Mensaje"
              className="max-h-24 min-h-[42px] w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={!input.trim() || typing}
              aria-label="Enviar"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white transition-colors hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
        className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/25 ring-4 ring-white/60 transition-transform hover:scale-105"
      >
        {open ? <XIcon className="h-6 w-6" /> : <BotFace config={config} />}
      </button>
    </div>
  );
}

