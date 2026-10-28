"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SPEECH_LOCALE, cleanTranscript, createTranscript, type ChatLang } from "@/lib/voice";

// Minimal typing for the browser speech API (not in every TS DOM lib).
type SpeechResultEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type Recognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognizerCtor = new () => Recognizer;

function getRecognizerCtor(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// The guest is "done" after this much silence following speech; the mic keeps
// listening through shorter pauses instead of cutting off mid-sentence.
const SILENCE_MS = 2500;
// Give up if nothing at all was said for this long, and never listen longer than the cap.
const NO_SPEECH_MS = 8000;
const MAX_LISTEN_MS = 60000;
// Errors that retrying can't fix.
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);
// Mobile browsers repeat words in continuous mode, so there the engine runs one
// phrase at a time and is restarted by us; desktop browsers listen continuously.
const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const ERROR_NOTE: Record<string, string> = {
  "not-allowed": "Microphone is blocked — allow it in your browser to speak.",
  "service-not-allowed": "Microphone is blocked — allow it in your browser to speak.",
  "no-speech": "I didn't hear anything — tap the mic and try again.",
  "audio-capture": "No microphone found.",
  network: "Voice needs an internet connection.",
};

/**
 * Mic button for the chat input. Tap, speak, and the words stream into the
 * input; when the guest stops talking the final text is handed to `onSpoken`
 * (which sends it like a typed message). Renders nothing in browsers without
 * speech recognition (e.g. Firefox).
 */
export function VoiceMicButton({
  lang,
  disabled,
  onInterim,
  onSpoken,
  size = 38,
}: {
  lang: ChatLang;
  disabled?: boolean;
  onInterim: (text: string) => void;
  onSpoken: (text: string) => void;
  size?: number;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");
  const recRef = useRef<Recognizer | null>(null);
  const transcriptRef = useRef(createTranscript());
  const activeRef = useRef(false); // the guest wants the mic open
  const deliveredRef = useRef(false);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deliverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest callbacks, so a long-lived recognizer never calls a stale closure.
  const cbRef = useRef({ onInterim, onSpoken });
  cbRef.current = { onInterim, onSpoken };
  const langRef = useRef(lang);
  langRef.current = lang;

  const clearTimers = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (hardTimer.current) clearTimeout(hardTimer.current);
    if (deliverTimer.current) clearTimeout(deliverTimer.current);
    silenceTimer.current = hardTimer.current = deliverTimer.current = null;
  };

  // Hands the finished text over exactly once.
  const deliver = useCallback(() => {
    if (deliveredRef.current) return;
    deliveredRef.current = true;
    clearTimers();
    setListening(false);
    transcriptRef.current.endSegment();
    const spoken = cleanTranscript(transcriptRef.current.text());
    transcriptRef.current.reset();
    if (spoken) cbRef.current.onSpoken(spoken);
    else setNote((n) => n || ERROR_NOTE["no-speech"]);
  }, []);

  // Close the mic (silence, cap, or the guest tapped stop); the text is
  // delivered once the engine has flushed its last words (its "end" event).
  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    // If the browser never reports "end", don't hang.
    deliverTimer.current = setTimeout(deliver, 1500);
  }, [deliver]);

  const armSilence = (ms: number) => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(finish, ms);
  };

  const startEngine = useCallback(() => {
    const Ctor = getRecognizerCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = SPEECH_LOCALE[langRef.current];
    rec.interimResults = true;
    rec.continuous = !isMobile();
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      cbRef.current.onInterim(transcriptRef.current.push(e.results, e.resultIndex));
      armSilence(SILENCE_MS); // still talking — restart the silence clock
    };
    rec.onerror = (e) => {
      if (FATAL_ERRORS.has(e.error)) {
        setNote(ERROR_NOTE[e.error] ?? "");
        activeRef.current = false; // nothing to restart; "end" delivers whatever we have
      } else if (e.error === "network") {
        setNote(ERROR_NOTE.network);
      }
      // "no-speech" / "aborted": the silence timers decide what happens next.
    };
    rec.onend = () => {
      transcriptRef.current.endSegment(); // keep words that were never finalised
      if (activeRef.current) {
        // The engine stopped by itself (browsers do this after a pause or on
        // mobile after each phrase) but the guest hasn't finished: keep going.
        setTimeout(() => {
          if (!activeRef.current) return deliver();
          try { startEngine(); } catch { activeRef.current = false; deliver(); }
        }, 120);
        return;
      }
      deliver();
    };
    recRef.current = rec;
    rec.start();
  }, [deliver]);

  const start = useCallback(() => {
    if (!getRecognizerCtor()) return;
    setNote("");
    transcriptRef.current.reset();
    deliveredRef.current = false;
    activeRef.current = true;
    clearTimers();
    try {
      startEngine();
      setListening(true);
      armSilence(NO_SPEECH_MS); // nothing said at all → close
      hardTimer.current = setTimeout(finish, MAX_LISTEN_MS);
    } catch {
      activeRef.current = false;
      setListening(false);
    }
  }, [startEngine, finish]);

  useEffect(() => {
    setSupported(!!getRecognizerCtor());
    return () => {
      activeRef.current = false;
      clearTimers();
      recRef.current?.abort();
    };
  }, []);

  const toggle = () => {
    if (listening) finish();
    else start();
  };

  if (!supported) return null;
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled && !listening}
        title={listening ? "Stop listening" : "Speak your request"}
        aria-label={listening ? "Stop listening" : "Speak your request"}
        aria-pressed={listening}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: listening ? "none" : "1.5px solid #c79a3a",
          background: listening ? "#c0392b" : "#fff",
          color: listening ? "#fff" : "#8a1f2b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          cursor: disabled && !listening ? "default" : "pointer",
          opacity: disabled && !listening ? 0.5 : 1,
          flexShrink: 0,
          animation: listening ? "sangamMicPulse 1.1s ease-in-out infinite" : undefined,
        }}
      >
        {listening ? "■" : "🎤"}
      </button>
      <style>{`@keyframes sangamMicPulse{0%,100%{box-shadow:0 0 0 0 rgba(192,57,43,.45)}50%{box-shadow:0 0 0 8px rgba(192,57,43,0)}}`}</style>
      {note && (
        <span role="status" style={{ position: "absolute", left: 16, right: 16, bottom: "100%", padding: "6px 10px", background: "#fff4e5", color: "#7a4a00", font: "500 12px/1.4 'DM Sans'", borderRadius: 8 }}>
          {note}
        </span>
      )}
    </>
  );
}
