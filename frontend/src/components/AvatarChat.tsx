"use client";
import { useState, useRef, useEffect, useCallback } from "react";

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
    { role: "bot", text: "SIVA.EXE LOADED\n> Hey, ask me about my work." },
  ]);
  const [input, setInput]   = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blink, setBlink]   = useState(true);

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

  // Dot grid background
  const dotGrid = `radial-gradient(circle, #1a3a1a 1px, transparent 1px)`;

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
        background:      "#050f05",
        backgroundImage: `${dotGrid}`,
        backgroundSize:  "12px 12px",
        border:          "3px solid #39ff14",
        boxShadow:       "0 0 0 1px #000, 0 0 24px #39ff1455, inset 0 0 40px #00100a",
        fontFamily:      "'Press Start 2P', 'Courier New', monospace",
        fontSize:        9,
        color:           "#39ff14",
        letterSpacing:   0.5,
      }}>

        {/* Header bar */}
        <div style={{
          background:     "#39ff14",
          color:          "#000",
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
              background: "#000",
              border:     "2px solid #000",
              color:      "#39ff14",
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
          scrollbarColor: "#39ff14 #050f05",
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf:   m.role === "user" ? "flex-end" : "flex-start",
              maxWidth:    "90%",
            }}>
              {m.role === "bot" && (
                <div style={{ color: "#39ff1488", fontSize: 7, marginBottom: 2 }}>
                  SIVA.EXE
                </div>
              )}
              {m.role === "user" && (
                <div style={{ color: "#39ff1488", fontSize: 7, marginBottom: 2, textAlign: "right" }}>
                  YOU
                </div>
              )}
              <div style={{
                background:  m.role === "user" ? "#0a1a0a" : "#050f05",
                border:      `2px solid ${m.role === "user" ? "#39ff1466" : "#39ff14"}`,
                padding:     "6px 8px",
                whiteSpace:  "pre-wrap",
                wordBreak:   "break-word",
                lineHeight:  1.8,
                boxShadow:   m.role === "bot" ? "2px 2px 0 #39ff1433" : "none",
              }}>
                {m.role === "bot" && <span style={{ color: "#39ff1488", marginRight: 4 }}>&gt;</span>}
                {m.text || (loading && i === messages.length - 1
                  ? <span style={{ opacity: blink ? 1 : 0 }}>_</span>
                  : ""
                )}
              </div>
            </div>
          ))}

          {status && (
            <div style={{
              alignSelf:  "flex-start",
              color:      "#39ff1499",
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
            borderTop:      "1px solid #39ff1433",
            paddingTop:     6,
          }}>
            {QUICK_Q.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                  background:  "none",
                  border:      "1px solid #39ff14",
                  color:       "#39ff14",
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
        <div style={{ borderTop: "2px solid #39ff14", flexShrink: 0 }} />

        {/* Input row */}
        <div style={{
          display:     "flex",
          alignItems:  "center",
          background:  "#050f05",
          padding:     "4px 6px",
          gap:         4,
          flexShrink:  0,
        }}>
          <span style={{ color: "#39ff14", fontSize: 10, flexShrink: 0 }}>&gt;_</span>
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
              color:       "#39ff14",
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
              background:  loading ? "#111" : "#39ff14",
              border:      "none",
              color:       loading ? "#39ff14" : "#000",
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