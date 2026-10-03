import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import OpenAI from "openai";
import { matchProduct } from "./fuxionProductRouter";
import { detectHealthIntent, getHealthSafetyInstruction } from "./healthIntentGate";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || "sk-5142df348fc147b093350aae6c39b7b1",
  dangerouslyAllowBrowser: true,
});

const fallbackOpenai = new OpenAI({
  baseURL: import.meta.env.VITE_FALLBACK_BASE_URL || "https://oneprovider.dev/api/v1", // o la URL correcta
  apiKey: import.meta.env.VITE_FALLBACK_API_KEY || "sk-f57ae0c749ca44cd5924caf65357e28d3acef7ade53a4d7d7e29085a2198dc7f",
  dangerouslyAllowBrowser: true,
});

const SUGGESTED_PROMPTS = [
  "¿Para qué sirve este producto?",
  "¿Cómo se prepara?",
  "¿Cuáles son sus ingredientes principales?",
  "¿Tiene cafeína?",
];

const MOCK_RESPONSE =
  "Esta es una respuesta de demostración. La conexión con el asesor asistente se habilitará después de aprobar esta interfaz.";

/**
 * Minimal, dependency-free inline parser.
 * Converts **bold** markdown into <strong> nodes while leaving the rest as text.
 * Returns plain React nodes (no dangerouslySetInnerHTML), so it is safe.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <strong key={`${keyPrefix}-b${i++}`} className="font-semibold">
        {match[1] ?? ""}
      </strong>,
    );
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

interface FormattedMessageProps {
  text: string;
  isUser: boolean;
}

/**
 * Lightweight markdown-lite renderer for chat bubbles.
 * - Renders **negrita** as bold text.
 * - Renders lines starting with "- ", "* " or "• " as a bullet list.
 * - Preserves blank lines as vertical spacing (proper paragraph separation).
 * - Preserves line breaks within a line.
 */
function FormattedMessage({ text, isUser }: FormattedMessageProps) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer;
    listBuffer = [];
    blocks.push(
      <ul
        key={`ul-${key++}`}
        className={`my-1 list-disc space-y-1 pl-4 ${
          isUser ? "marker:text-white/80" : "marker:text-blue-500"
        }`}
      >
        {items.map((item, idx) => (
          <li key={idx} className="whitespace-pre-wrap">
            {renderInline(item, `li-${key}-${idx}`)}
          </li>
        ))}
      </ul>,
    );
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);

    if (bullet) {
      listBuffer.push(bullet[1] ?? "");
      continue;
    }

    flushList();

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

  flushList();

  return <>{blocks}</>;
}

interface FuxionAssistantProps {
  pageId: string;
}

export function FuxionAssistant({ pageId: _pageId }: FuxionAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: text.trim(),
    };

    const newMessagesList = [...messages, newUserMsg];
    setMessages(newMessagesList);
    setInputValue("");
    setIsTyping(true);


    const matchedProduct = matchProduct(text);
    let systemPrompt = [
      "Eres el Asesor Asistente, un experto amable y profesional en productos y bienestar de FuXion. Responde siempre en español, de forma concisa, cálida y clara.",
      "",
      "FORMATO DE RESPUESTA (obligatorio):",
      "- Comienza con un emoji relevante y usa algunos emojis para separar ideas (por ejemplo 🌿, ✨, 💧, ✅, 🌙, 🍵). No satures la respuesta de emojis.",
      "- Separa las ideas en líneas cortas con saltos de línea y deja una línea en blanco entre párrafos.",
      "- Cuando enumeres ingredientes, pasos o beneficios, usa una lista con guiones (\"- \").",
      "- Usa **negrita** únicamente para resaltar el nombre del producto y datos clave como el precio. No abuses de los asteriscos ni dejes asteriscos sueltos.",
      "- No uses encabezados con #, tablas ni bloques de código.",
      "- Termina con una pregunta breve que invite a seguir conversando.",
    ].join("\n");

    if (matchedProduct) {
      systemPrompt += "\n\nINFORMACIÓN DEL PRODUCTO CONSULTADO:\n" +
        "Nombre: " + matchedProduct.canonical_name + "\n" +
        "Precio: " + matchedProduct.price + "\n" +
        "Categoría: " + matchedProduct.category + "\n" +
        "Descripción: " + matchedProduct.short_description + "\n" +
        "Detalles: " + matchedProduct.details;
    }
// Detect health intent and augment system prompt if needed
const healthIntent = detectHealthIntent(text);
const healthInstruction = getHealthSafetyInstruction(healthIntent);
if (healthInstruction) {
  systemPrompt += `\n\n${healthInstruction}`;
}

let responseText = "";
    try {
      // Intento 1: DeepSeek
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...newMessagesList.map((msg) => ({
            role: msg.sender,
            content: msg.text,
          })),
        ],
        model: "deepseek-chat",
      });
      responseText = completion.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.warn("Fallo DeepSeek, intentando fallback OneProvider...", error);
      try {
        // Intento 2: Fallback (OneProvider con qwen)
        const fallbackCompletion = await fallbackOpenai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            ...newMessagesList.map((msg) => ({
              role: msg.sender,
              content: msg.text,
            })),
          ],
          model: "qwen3.8-flash", // Ajustar nombre exacto de ser necesario
        });
        responseText = fallbackCompletion.choices[0]?.message?.content || "";
      } catch (fallbackError: any) {
        console.error("Error en Fallback:", fallbackError);
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: "Hubo un error de conexin con la IA (ambos proveedores fallaron). Por favor intenta nuevamente.",
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsTyping(false);
        return;
      }
    }

    const newAssistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: "assistant",
      text: responseText || "Lo siento, no pude procesar tu solicitud.",
    };
    setMessages((prev) => [...prev, newAssistantMsg]);
    setIsTyping(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            aria-label="Abrir Asesor Asistente"
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/20 ring-4 ring-white/50 backdrop-blur-sm transition-shadow hover:shadow-2xl hover:shadow-blue-900/30"
          >
            <MessageSquare size={24} className="drop-shadow-sm" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f8fafc] shadow-2xl sm:bottom-6 sm:right-6 sm:h-[650px] sm:max-h-[calc(100vh-3rem)] sm:w-[420px] sm:rounded-[28px] sm:border sm:border-white/60 sm:ring-1 sm:ring-black/5"
          >
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-gray-100/80 bg-white/80 p-4 px-5 backdrop-blur-xl">
              <div className="flex items-center gap-3.5">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-600/20">
                  <Bot size={22} />
                  <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f8fafc] p-[2px]">
                    <div className="h-full w-full rounded-full bg-green-500" />
                  </div>
                </div>
                <div>
                  <h2 className="flex items-center gap-1.5 text-base font-bold tracking-tight text-gray-900">
                    Asesor Asistente <Sparkles size={14} className="text-amber-500" />
                  </h2>
                  <p className="text-[13px] font-medium text-gray-500">Siempre en línea</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar asistente"
                className="group flex h-9 w-9 items-center justify-center rounded-full bg-gray-100/50 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
              >
                <ChevronDown size={20} className="transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.1 }}
                  className="flex h-full flex-col justify-end gap-5 pb-2"
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shadow-inner">
                    <Bot size={40} strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <h3 className="mb-2 text-lg font-bold text-gray-900">¡Hola! Soy tu asistente</h3>
                    <p className="px-4 text-[14px] leading-relaxed text-gray-500">
                      Pregúntame sobre cualquier producto, sus ingredientes, preparación o beneficios para tu salud.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2.5">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                      <motion.button
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                        key={idx}
                        onClick={() => handleSend(prompt)}
                        className="group flex items-center justify-between rounded-2xl border border-gray-200/60 bg-white px-5 py-3.5 text-left text-[14px] font-medium text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 hover:shadow-md hover:shadow-blue-900/5 active:scale-[0.98]"
                      >
                        {prompt}
                        <span className="text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">&rarr;</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-5">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95, transformOrigin: msg.sender === "user" ? "bottom right" : "bottom left" }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.sender === "assistant" && (
                          <div className="mr-2 mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                            <Bot size={14} />
                          </div>
                        )}
                        <div
                          className={`relative max-w-[80%] px-4.5 py-3 text-[14.5px] leading-relaxed shadow-sm ${
                            msg.sender === "user"
                              ? "rounded-[20px] rounded-tr-[4px] bg-gradient-to-br from-blue-600 to-indigo-600 font-medium text-white shadow-blue-900/20"
                              : "rounded-[20px] rounded-tl-[4px] border border-gray-100 bg-white text-gray-800 shadow-gray-200/40"
                          }`}
                        >
                          <FormattedMessage text={msg.text} isUser={msg.sender === "user"} />
                        </div>
                      </motion.div>
                    ))}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, originY: 1 }}
                        className="flex w-full justify-start"
                      >
                        <div className="mr-2 mt-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                          <Bot size={14} />
                        </div>
                        <div className="flex items-center gap-1.5 rounded-[20px] rounded-tl-[4px] border border-gray-100 bg-white px-4.5 py-4 shadow-sm shadow-gray-200/40">
                          <motion.div className="h-1.5 w-1.5 rounded-full bg-gray-400" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                          <motion.div className="h-1.5 w-1.5 rounded-full bg-gray-400" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                          <motion.div className="h-1.5 w-1.5 rounded-full bg-gray-400" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} className="h-1" />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="relative z-10 border-t border-gray-100 bg-white p-4 pb-5 pt-3">
              <div className="relative flex items-end gap-2 rounded-[24px] border border-gray-200 bg-gray-50/50 p-1.5 shadow-sm transition-all focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Pregunta algo sobre FuXion..."
                  className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-3 pl-4 pr-2 text-[14.5px] font-medium text-gray-900 outline-none placeholder:text-gray-400 scrollbar-thin"
                  rows={1}
                  aria-label="Mensaje para el asistente"
                />
                <button
                  onClick={() => handleSend(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="Enviar mensaje"
                  className="mb-1 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-blue-900/20 disabled:scale-95 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none active:scale-95"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </div>
              <div className="mt-3 text-center">
                <span className="text-[11px] font-medium text-gray-400">
                  El asistente puede cometer errores. Verifica la información.
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
