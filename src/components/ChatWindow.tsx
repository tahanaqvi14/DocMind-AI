"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, MessageSquareText, AlertCircle } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CitationChip } from "./CitationChip";
import type { Citation } from "@/types";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink-text">{children}</strong>,
  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-3 font-display text-base font-medium first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-3 font-display text-base font-medium first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-1.5 mt-2.5 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  code: ({ children }) => (
    <code className="rounded bg-ink-line/40 px-1.5 py-0.5 font-mono text-xs">{children}</code>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-teal underline">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto rounded-lg border border-ink-line/60">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ink-line/30">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-ink-line/60 px-2.5 py-1.5 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-ink-line/30 px-2.5 py-1.5 last:border-b-0">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-highlight/50 pl-3 text-ink-muted last:mb-0">
      {children}
    </blockquote>
  ),
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

const SUGGESTIONS = [
  "Summarize the key points",
  "What are the main takeaways?",
  "Are there any dates or numbers mentioned?",
];

export function ChatWindow({ documentId }: { documentId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const citationsRef = useRef<Citation[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(overrideText?: string) {
    const question = (overrideText ?? input).trim();
    if (!question || streaming) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, chatId, documentId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "The chat service is unavailable right now.");
      }
      if (!res.body) throw new Error("No response stream received.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let citationsParsed = false;
      citationsRef.current = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        if (!citationsParsed) {
          const newlineIdx = buffer.indexOf("\n");
          if (newlineIdx === -1) continue;
          const firstLine = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (firstLine.startsWith("@@CITATIONS@@")) {
            const parsed = JSON.parse(firstLine.replace("@@CITATIONS@@", ""));
            citationsRef.current = parsed.citations;
            if (!chatId) setChatId(parsed.chatId);
            citationsParsed = true;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                ...next[next.length - 1],
                citations: citationsRef.current,
              };
              return next;
            });
          }
        }

        if (citationsParsed && buffer) {
          const chunk = buffer;
          buffer = "";
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + chunk };
            return next;
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/30 shadow-sm md:h-[calc(100vh-6rem)]">
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-highlight/15 text-highlight">
              <MessageSquareText size={22} />
            </div>
            <p className="mt-4 font-display text-lg text-ink-text">
              Ask something about your documents
            </p>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              Answers are grounded only in what you&apos;ve uploaded — if it&apos;s not in there,
              DocMind will say so.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-full border border-ink-line px-4 py-2 text-xs text-ink-muted transition-colors hover:border-teal hover:text-ink-text"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.role === "user" ? "bg-ink-line text-ink-text" : "bg-highlight/15 text-highlight"
              }`}
            >
              {m.role === "user" ? (
                <span className="text-xs font-medium">You</span>
              ) : (
                <Sparkles size={13} />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-highlight text-paper-text"
                  : "border border-ink-line bg-ink text-ink-text"
              }`}
            >
              {m.content ? (
                m.role === "assistant" ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                )
              ) : streaming && i === messages.length - 1 ? (
                <span className="flex gap-1 py-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted" />
                </span>
              ) : null}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.citations.map((c, ci) => (
                    <CitationChip key={ci} citation={c} index={ci} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 px-6 pb-2 text-sm text-danger">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-ink-line/60 p-3 md:p-4">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // isComposing: Enter that confirms an IME candidate must not send.
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSend();
          }}
          maxLength={4000}
          placeholder="Ask a question about your documents…"
          className="flex-1 rounded-xl border border-ink-line bg-ink px-4 py-3 text-sm outline-none transition-colors focus:border-teal"
          disabled={streaming}
        />
        <button
          onClick={() => handleSend()}
          disabled={streaming || !input.trim()}
          className="flex shrink-0 items-center justify-center rounded-xl bg-highlight p-3 text-paper-text transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
