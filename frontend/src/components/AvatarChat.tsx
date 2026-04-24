"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";

interface AvatarChatProps {
  avatarPos: { x: number; y: number };
  onClose: () => void;
}

const TOOL_LABELS: Record<string, string> = {
  get_profile:      "> LOADING PROFILE...",
  get_experience:   "> LOADING EXPERIENCE...",
  get_projects:     "> LOADING PROJECTS...",
  get_skills:       "> LOADING SKILLS...",
  get_achievements: "> LOADING ACHIEVEMENTS...",
};

const QUICK_Q = [
  "Best project?",
  "Tech stack?",
  "Hire you?",
  "Experience?",
];

const BUBBLE_W = 320;
const BUBBLE_H = 420;

export default function AvatarChat({ avatarPos, onClose }: AvatarChatProps) {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: "Hey! I am  Siva from Pixel World. Just Ask things that you need to know about me" },
  ]);
  const [input, setInput]   = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blink, setBlink]   = useState(true);
  const isDark = typeof document !== "undefined"
    ? document.documentElement.classList.contains("dark")
    : true;

  // Theme tokens
  const bg       = isDark ? "#050f05"  : "#ffffff";
  const fg       = isDark ? "#d4aaff"  : "#000000";
  const fgMuted  = isDark ? "#bc8fe788" : "#00000088";
  const msgBgBot = isDark ? "#050f05"  : "#f5f5f5";
  const msgBgUsr = isDark ? "#1a0a2e"  : "#e8e8e8";
  const inputBg  = isDark ? "#050f05"  : "#ffffff";
  const boldColor = isDark ? "#8d4beb" : "#000000";
  const linkColor = "#0073CF";

  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const inputRef   = useRef<HTMLInputElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // Blinking cursor
  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Bubble position — above avatar, clamped to viewport
  const vw   = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const vh   = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(Math.max(avatarPos.x - BUBBLE_W / 2, 8), vw - BUBBLE_W - 8);
  const top  = Math.max(avatarPos.y - BUBBLE_H - 16, 8);

  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);
    setStatus(null);

    historyRef.current.push({ role: "user", content: q });
    setMessages(m => [...m, { role: "user", text: q }, { role: "bot", text: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: historyRef.current.slice(0, -1) }),
      });

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let botText   = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          const event = JSON.parse(line.slice(6));
          if (event.tool) {
            setStatus(TOOL_LABELS[event.tool] ?? `> ${event.tool.toUpperCase()}...`);
          } else if (event.token) {
            setStatus(null);
            botText += event.token;
            const captured = botText;
            setMessages(m => [...m.slice(0, -1), { role: "bot", text: captured }]);
          } else if (event.done) {
            setStatus(null);
          } else if (event.error) {
            setMessages(m => [...m.slice(0, -1), { role: "bot", text: `ERR: ${event.error}` }]);
          }
        }
      }
      historyRef.current.push({ role: "assistant", content: botText });
    } catch {
      setMessages(m => [...m.slice(0, -1), { role: "bot", text: "CONNECTION LOST. RETRY." }]);
    } finally {
      setLoading(false);
      setStatus(null);
    }
  }, [input, loading]);

  // Renders markdown-lite text: bold, italic, bullet points, newlines, and hyperlinks
function renderText(text: string, fg: string, fgMuted: string, boldColor: string, linkColor: string) {
  const URL_RE = /https?:\/\/[^\s)>\]]+/g;

  return text.split("\n").map((line, li) => {
    const trimmed = line.trimStart();
    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ");
    const content = isBullet ? trimmed.slice(2) : line;

    // Split by URLs, then apply inline bold/italic
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(content)) !== null) {
      if (m.index > last) parts.push(...inlineFormat(content.slice(last, m.index), fgMuted, boldColor));
      parts.push(
        <a key={m.index} href={m[0]} target="_blank" rel="noopener noreferrer"
          style={{ color: linkColor, textDecoration: "underline", wordBreak: "break-all" }}>
          {m[0]}
        </a>
      );
      last = m.index + m[0].length;
    }
    if (last < content.length) parts.push(...inlineFormat(content.slice(last), fgMuted, boldColor));

    return (
      <div key={li} style={{ display: "flex", gap: 4, marginBottom: isBullet ? 2 : 0 }}>
        {isBullet && <span style={{ color: fgMuted, flexShrink: 0 }}>▸</span>}
        <span>{parts}</span>
      </div>
    );
  });
}

function inlineFormat(text: string, fgMuted: string, boldColor: string): React.ReactNode[] {
  // Handle **bold** and *italic*
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index} style={{ color: boldColor, fontWeight: 700 }}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}


  const dotGrid = isDark
    ? `radial-gradient(circle, #1a3a1a 1px, transparent 1px)`
    : `radial-gradient(circle, #cccccc 1px, transparent 1px)`;

  return (
    <>
      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

      <div style={{
        position:        "fixed",
        left,
        top,
        width:           BUBBLE_W,
        height:          BUBBLE_H,
        zIndex:          10000,
        display:         "flex",
        flexDirection:   "column",
        background:      undefined,
        backgroundColor: bg,
        backgroundImage: `${dotGrid}`,
        backgroundSize:  "12px 12px",
        border:          `3px solid ${fg}`,
        boxShadow:       isDark ? "0 0 0 1px #000, 0 0 24px #bc8fe755, inset 0 0 40px #00100a" : "0 0 0 1px #ccc, 0 0 24px #00000022",
        fontFamily:      "'Press Start 2P', 'Courier New', monospace",
        fontSize:        9,
        color:           fg,
        letterSpacing:   0.5,
      }}>

        {/* Header bar */}
        <div style={{
          background:     fg,
          color:          isDark ? "#000" : "#fff",
          padding:        "6px 10px",
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          flexShrink:     0,
        }}>
          <span style={{ fontSize: 8, letterSpacing: 2 }}>SIVA.EXE v1.0</span>
          <button
            onClick={onClose}
            style={{
              background: isDark ? "#000" : "#fff",
              border:     `2px solid ${isDark ? "#000" : "#fff"}`,
              color:      fg,
              cursor:     "pointer",
              fontFamily: "inherit",
              fontSize:   8,
              padding:    "2px 6px",
              lineHeight: 1,
            }}
          >X</button>
        </div>

        {/* Messages */}
        <div style={{
          flex:          1,
          overflowY:     "auto",
          padding:       "10px 8px",
          display:       "flex",
          flexDirection: "column",
          gap:           8,
          scrollbarWidth: "thin",
          scrollbarColor: `${fg} ${bg}`,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf:   m.role === "user" ? "flex-end" : "flex-start",
              maxWidth:    "90%",
            }}>
              {m.role === "bot" && (
                <div style={{ color: fgMuted, fontSize: 7, marginBottom: 2 }}>
                  SIVA.EXE
                </div>
              )}
              {m.role === "user" && (
                <div style={{ color: fgMuted, fontSize: 7, marginBottom: 2, textAlign: "right" }}>
                  YOU
                </div>
              )}
              <div style={{
                background:  m.role === "user" ? msgBgUsr : msgBgBot,
                border:      `2px solid ${m.role === "user" ? fg + "66" : fg}`,
                padding:     "6px 8px",
                whiteSpace:  m.role === "user" ? "pre-wrap" : "normal",
                wordBreak:   "break-word",
                lineHeight:  1.8,
                boxShadow:   m.role === "bot" ? `2px 2px 0 ${fg}33` : "none",
                color:       fg,
              }}>
                {m.role === "bot" && <span style={{ color: fgMuted, marginRight: 4 }}>&gt;</span>}
                {m.text
                  ? (m.role === "bot" ? renderText(m.text, fg, fgMuted, boldColor, linkColor) : m.text)
                  : (loading && i === messages.length - 1
                    ? <span style={{ opacity: blink ? 1 : 0 }}>_</span>
                    : ""
                  )
                }
              </div>
            </div>
          ))}

          {status && (
            <div style={{
              alignSelf:  "flex-start",
              color:      fgMuted,
              fontStyle:  "italic",
              fontSize:   8,
              animation:  "pulse 1s infinite",
            }}>
              {status}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        {messages.length <= 2 && !loading && (
          <div style={{
            padding:        "0 8px 6px",
            display:        "flex",
            flexWrap:       "wrap",
            gap:            4,
            borderTop:      `1px solid ${fg}33`,
            paddingTop:     6,
          }}>
            {QUICK_Q.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  background:  "none",
                  border:      `1px solid ${fg}`,
                  color:       fg,
                  fontFamily:  "inherit",
                  fontSize:    7,
                  padding:     "4px 6px",
                  cursor:      "pointer",
                  letterSpacing: 0.5,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: `2px solid ${fg}`, flexShrink: 0 }} />

        {/* Input row */}
        <div style={{
          display:     "flex",
          alignItems:  "center",
          background:  inputBg,
          padding:     "4px 6px",
          gap:         4,
          flexShrink:  0,
        }}>
          <span style={{ color: fg, fontSize: 10, flexShrink: 0 }}>&gt;_</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="TYPE CMD..."
            style={{
              flex:        1,
              background:  "none",
              border:      "none",
              outline:     "none",
              color:       fg,
              fontFamily:  "inherit",
              fontSize:    8,
              padding:     "4px 0",
              letterSpacing: 1,
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading}
            style={{
              background:  loading ? (isDark ? "#111" : "#ddd") : fg,
              border:      "none",
              color:       loading ? fg : (isDark ? "#000" : "#fff"),
              fontFamily:  "inherit",
              fontSize:    7,
              padding:     "4px 8px",
              cursor:      loading ? "not-allowed" : "pointer",
              letterSpacing: 1,
            }}
          >
            {loading ? "..." : "SEND"}
          </button>
        </div>

      </div>
    </>
  );
}