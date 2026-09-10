"use client";

import { useState, useRef, useEffect } from "react";
import { getDynamicArjunGreeting } from "@/lib/greeting";

type ChatMsg = { role: "user" | "assistant"; content: string };

const INITIAL_SUGGESTIONS = [
  { label: "🏛️ Indoor Banquet Packages", text: "I want an Indoor AC Banquet Hall quote with standard packages" },
  { label: "🚚 Outdoor Catering & Trays", text: "I want Outdoor Catering with custom trays and live food setup" },
  { label: "🍛 Custom Menu Quote", text: "I want to share my custom dish list for catering to calculate tray quantities and pricing" },
  { label: "📍 Explore Branches & Halls", text: "What banquet halls and branches do you have available?" },
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

export default function EmbedChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; text: string }>>(INITIAL_SUGGESTIONS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatDatePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages([
      { role: "assistant", content: getDynamicArjunGreeting() }
    ]);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendChat(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const next: ChatMsg[] = [...messages, { role: "user", content: msg }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
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
      sendChat(ct.text);
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
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: m.role === "user" ? "flex-end" : "flex-start",
              gap: 6,
            }}
          >
            <div
              style={{
                maxWidth: "88%",
                background: m.role === "user" ? "#8a1f2b" : "#fff",
                color: m.role === "user" ? "#fff" : "#3a352e",
                border: m.role === "user" ? "none" : "1px solid #ece2d2",
                borderRadius:
                  m.role === "user"
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                padding: "12px 16px",
                font: "400 14px/1.6 'DM Sans'",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              {renderChatMessage(m.content, m.role === "user", (sectionTitle) => {
                sendChat(`I would like to swap and customize dishes in the ${sectionTitle} section`);
              })}
            </div>
          </div>
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
            <span>{ct.label}</span>
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
