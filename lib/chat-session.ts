// One id per browser/chat session, kept in sessionStorage so a page
// refresh mid-conversation still logs to the same sangam.chat_sessions row
// instead of splitting the transcript across rows. A brand new tab gets a
// fresh id (sessionStorage, not localStorage) -- intentional, since a new
// tab is a new conversation for analytics purposes.
//
// Bug fix (2026-09-30): this used to live only inside app/embed/chat/page.tsx
// and get sent as `sessionId` in that page's /api/chat request body. The
// main site's own chat widget (app/page.tsx) never generated or sent a
// sessionId at all -- and the server-side logger (logChatSession in
// app/api/chat/route.ts) silently no-ops on an empty sessionId -- so every
// conversation through the homepage widget (the one most customers actually
// use) never got a row in sangam.chat_sessions, even though the logging
// code itself has always run on every turn. Moved here so both chat
// surfaces share one implementation and neither one can regress this again.
export function getOrCreateChatSessionId(): string {
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
