"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { getDynamicArjunGreeting } from "@/lib/greeting";
import { translateSuggestionLabel } from "@/lib/suggestion-i18n";

type ChatMsg = { role: "user" | "assistant"; content: string; displayContent?: string };

const INITIAL_SUGGESTIONS = [
  { label: "🏛️ Indoor Catering", text: "I want an Indoor AC Banquet Hall quote with standard packages" },
  { label: "🚚 Outdoor Catering", text: "I want Outdoor Catering with custom trays and food setup" },
];

function renderChatMessage(content: string, isUser = false, onEditSection?: (title: string) => void) {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <>
      {lines.map((line, lIdx) => {
        if (line.trim() === '') {
          return <span key={lIdx} style={{ display: 'block', height: 6 }} />;
        }
        if (line.startsWith('### ')) {
          const headerText = line.replace(/^###\s*/, '');
          const hasEditTag = headerText.includes('[✏️ Edit]');
          const cleanTitle = headerText.replace('[✏️ Edit]', '').trim();
          return (
            <div
              key={lIdx}
              style={{
                fontWeight: 700,
                fontSize: '13px',
                color: isUser ? '#fff' : '#8a1f2b',
                marginTop: 10,
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #f0e6d5',
                paddingBottom: 3,
              }}
            >
              <span>{cleanTitle}</span>
              {hasEditTag && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEditSection) onEditSection(cleanTitle);
                  }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isUser ? '#fff' : '#8a1f2b',
                    background: isUser ? 'rgba(255,255,255,0.2)' : '#faefe0',
                    border: isUser ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e2cfb4',
                    padding: '2px 8px',
                    borderRadius: 10,
                    letterSpacing: '0.02em',
                    cursor: onEditSection ? 'pointer' : 'default',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'all 0.15s ease',
                  }}
                  title={`Customize ${cleanTitle}`}
                >
                  ✏️ Edit
                </button>
              )}
            </div>
          );
        }
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return (
          <span key={lIdx} style={{ display: 'block', minHeight: 18 }}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} style={{ fontWeight: 700, color: isUser ? '#fff' : '#1f1a17' }}>
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <code key={pIdx} style={{ background: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(138,31,43,0.08)', color: isUser ? '#fff' : '#8a1f2b', padding: '1px 5px', borderRadius: 4, font: '600 12px monospace' }}>
                    {part.slice(1, -1)}
                  </code>
                );
              }
              return part;
            })}
          </span>
        );
      })}
    </>
  );
}

// Memoized so that typing in the input box -- which re-renders the whole
// EmbedChatPage component on every keystroke -- doesn't re-run
// renderChatMessage() (a split + per-line regex parse) for every past
// message in the conversation each time. Without this, INP got worse the
// longer a conversation ran, since each keystroke re-parsed the entire
// visible transcript synchronously on the main thread. React.memo skips
// re-invoking this component's body entirely when its props (content,
// isUser, onEditSection) are referentially unchanged from the previous
// render -- so only a genuinely new/changed message pays the parsing cost.
const MessageBubble = memo(function MessageBubble({
  content,
  isUser,
  onEditSection,
}: {
  content: string;
  isUser: boolean;
  onEditSection: (title: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 6,
      }}
    >
      <div
        style={{
          maxWidth: "88%",
          background: isUser ? "#8a1f2b" : "#fff",
          color: isUser ? "#fff" : "#3a352e",
          border: isUser ? "none" : "1px solid #ece2d2",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: "12px 16px",
          font: "400 14px/1.6 'DM Sans'",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        {renderChatMessage(content, isUser, onEditSection)}
      </div>
    </div>
  );
});

// One id per browser/embed session, kept in sessionStorage so a page
// refresh mid-conversation still logs to the same sangam.chat_sessions row
// instead of splitting the transcript across rows. A brand new tab gets a
// fresh id (sessionStorage, not localStorage) -- intentional, since a new
// tab is a new conversation for analytics purposes.
function getOrCreateChatSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const KEY = "sangam_chat_session_id";
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // sessionStorage can throw in some embed contexts (privacy mode,
    // sandboxed iframes) -- fall back to a per-load id rather than crash.
    return `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default function EmbedChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; text: string }>>(INITIAL_SUGGESTIONS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<'en' | 'te' | 'hi'>('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatDatePickerRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current) sessionIdRef.current = getOrCreateChatSessionId();
  // A ref that always points at the latest sendChat closure, so
  // handleEditSection below can stay referentially stable (empty deps)
  // across every render -- which is what lets MessageBubble's memo
  // actually skip re-rendering unchanged messages. If this called sendChat
  // directly instead, handleEditSection would get a new identity every
  // render (since sendChat itself is redefined each render), busting the
  // memo for every single message on every keystroke.
  const sendChatRef = useRef<(text?: string, displayText?: string) => void>(() => {});

  useEffect(() => {
    setMessages([
      { role: "assistant", content: getDynamicArjunGreeting() }
    ]);
  }, []);

  // Switching language before the customer has sent anything re-opens the
  // greeting in that language immediately, instead of waiting for the next
  // AI reply. Once a real conversation is underway, past AI messages are
  // left as-is (retranslating free-form AI text would need another AI
  // call) — only the still-untouched opening greeting is swapped.
  useEffect(() => {
    setMessages(prev =>
      prev.length === 1 && prev[0].role === "assistant"
        ? [{ role: "assistant", content: getDynamicArjunGreeting(lang) }]
        : prev
    );
  }, [lang]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendChat(text?: string, displayText?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const next: ChatMsg[] = [...messages, { role: "user", content: msg, displayContent: displayText }];
    setMessages(next);
    setInput("");
    setLoading(true);
    // Whatever quick-action chips were showing are now stale the moment a
    // message goes out — clear them so nothing lingers through the loading
    // state; the response brings its own fresh set.
    setSuggestions([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })), responseLanguage: lang, sessionId: sessionIdRef.current }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong connecting to our chat service. Please call us directly at +91 90638 44021.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }
  sendChatRef.current = sendChat;

  // Stable across every render (empty deps) so MessageBubble's memo isn't
  // busted just because EmbedChatPage re-rendered (e.g. from a keystroke).
  const handleEditSection = useCallback((sectionTitle: string) => {
    sendChatRef.current(`I would like to swap and customize dishes in the ${sectionTitle} section`);
  }, []);

  function handleChipClick(ct: { label: string; text: string; isCalendar?: boolean }) {
    if (ct.isCalendar || ct.label.toLowerCase().includes('calendar')) {
      if (chatDatePickerRef.current) {
        if ('showPicker' in HTMLInputElement.prototype) {
          try {
            chatDatePickerRef.current.showPicker();
          } catch {
            chatDatePickerRef.current.click();
          }
        } else {
          chatDatePickerRef.current.click();
        }
      }
    } else {
      sendChat(ct.text, translateSuggestionLabel(ct.label, lang));
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#fbf6ec",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#241510",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#c79a3a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "700 18px/1 'Playfair Display', serif",
            color: "#241510",
          }}
        >
          S
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "600 16px/1.2 'DM Sans'", color: "#fff" }}>
            Sangam Catering Concierge
          </div>
          <div style={{ font: "500 12px/1.3 'DM Sans'", color: "#9fd9a0" }}>
            ● Arjun (Hospitality Manager) · Online
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setLangMenuOpen(v => !v)}
            title="Chat language"
            style={{
              background: langMenuOpen ? "#c79a3a" : "rgba(255,255,255,.12)",
              border: "none",
              color: "#fff",
              width: 34,
              height: 34,
              borderRadius: 9,
              cursor: "pointer",
              font: "600 14px/1 'DM Sans'",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            🌐
          </button>
          {langMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 40,
                right: 0,
                background: "#fff",
                border: "1px solid #d6c9b6",
                borderRadius: 12,
                boxShadow: "0 12px 28px rgba(30,18,10,.22)",
                overflow: "hidden",
                zIndex: 90,
                minWidth: 150,
              }}
            >
              {([['en', 'English'], ['te', 'తెలుగు'], ['hi', 'हिन्दी']] as const).map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => { setLang(code); setLangMenuOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    cursor: "pointer",
                    background: lang === code ? "#fbf1de" : "#fff",
                    border: "none",
                    borderBottom: "1px solid #f1e9db",
                    color: "#241510",
                    padding: "9px 14px",
                    font: lang === code ? "700 13px/1 'DM Sans'" : "500 13px/1 'DM Sans'",
                    textAlign: "left",
                  }}
                >
                  <span>{name}</span>
                  {lang === code && <span style={{ color: "#8a1f2b" }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <a
          href="tel:+919063844021"
          style={{
            background: "#8a1f2b",
            color: "#fff",
            textDecoration: "none",
            padding: "7px 13px",
            borderRadius: 18,
            font: "600 12px/1 'DM Sans'",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          📞 Call
        </a>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflowY: "auto",
        }}
      >
        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            content={m.displayContent ?? m.content}
            isUser={m.role === "user"}
            onEditSection={handleEditSection}
          />
        ))}

        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#fff",
              border: "1px solid #ece2d2",
              borderRadius: "16px 16px 16px 4px",
              padding: "10px 16px",
              font: "400 13px/1 'DM Sans'",
              color: "#9b8c78",
            }}
          >
            <span style={{ display: "inline-flex", gap: 4 }}>
              <span className="animate-wfpulse" style={{ animationDelay: "0ms" }}>●</span>
              <span className="animate-wfpulse" style={{ animationDelay: "200ms" }}>●</span>
              <span className="animate-wfpulse" style={{ animationDelay: "400ms" }}>●</span>
            </span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Contextual Dynamic Step Action Chips above text field */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "10px 14px",
          background: "#fbf6ec",
          borderTop: "1px solid #ece2d2",
        }}
      >
        {suggestions.map((ct) => (
          <button
            key={ct.label}
            onClick={() => handleChipClick(ct)}
            style={{
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: "#fff",
              border: "1px solid #8a1f2b",
              color: "#8a1f2b",
              borderRadius: 16,
              padding: "6px 12px",
              font: "600 12px/1 'DM Sans'",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
            }}
          >
            <span>{translateSuggestionLabel(ct.label, lang)}</span>
          </button>
        ))}
      </div>

      {/* Hidden Date Picker triggered by "Pick from Calendar" */}
      <input
        type="date"
        ref={chatDatePickerRef}
        min={new Date().toISOString().split('T')[0]}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0, bottom: 0 }}
        onChange={(e) => {
          if (e.target.value) {
            const parts = e.target.value.split('-');
            if (parts.length === 3) {
              const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
              const d = parseInt(parts[2], 10);
              const m = parseInt(parts[1], 10) - 1;
              const y = parts[0];
              const dateFormatted = `${d} ${fullMonths[m]} ${y}`;
              sendChat(`The event date is ${dateFormatted}`);
            }
          }
        }}
      />

      {/* Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderTop: "1px solid #ece2d2",
          background: "#fff",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
          placeholder="Ask for catering quote, customize dishes, or save..."
          style={{
            flex: 1,
            background: "#f3eee0",
            border: "none",
            outline: "none",
            borderRadius: 24,
            padding: "12px 18px",
            font: "500 14px/1 'DM Sans'",
            color: "#2a201b",
          }}
        />
        <button
          onClick={() => sendChat()}
          disabled={loading || !input.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: loading ? "#c9a0a8" : "#8a1f2b",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            font: "700 16px/1 'DM Sans'",
            cursor: loading ? "default" : "pointer",
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
