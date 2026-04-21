import React, { useState } from "react"; // Fix 1: explicit React import

interface ChatEvent {
  token?: string;
  done?: boolean;
  isFromFallback?: boolean;
  fallback?: boolean;
  intent?: string;
  confidence?: number;
  suggestions?: string[];
  error?: string;
  tool?: string;
}

/**
 * Fetch chat response and handle both Groq and Fallback bot
 */
export async function* streamChatResponse(
  question: string,
  history: Array<{ role: string; content: string }>
) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    let isFallback = false;
    let intent: string | undefined = undefined; // Fix 2: null → undefined
    let confidence = 0;
    const suggestions: string[] = [];

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.startsWith("data: ")) {
          try {
            const event: ChatEvent = JSON.parse(line.slice(6));

            if (event.fallback) {
              isFallback = true;
              intent = event.intent ?? undefined; // Fix 2: null-safe
              confidence = event.confidence || 0;
              if (event.suggestions) {
                suggestions.push(...event.suggestions);
              }

              yield {
                type: "fallback-metadata",
                intent,
                confidence,
                suggestions,
              };
            }

            if (event.token) {
              yield {
                type: "token",
                token: event.token,
                isFromFallback: event.isFromFallback || isFallback,
              };
            }

            if (event.done) {
              yield {
                type: "done",
                isFromFallback: event.isFromFallback || isFallback,
              };
              return;
            }

            if (event.error) {
              throw new Error(event.error);
            }
          } catch (e) {
            console.error("Parse error:", line, e);
          }
        }
      }
      buffer = lines[lines.length - 1];
    }
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Chat component
 */
export function ChatComponentExample() {
  // Fix 1: React.useState → useState
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fallbackStatus, setFallbackStatus] = useState<{
    active: boolean;
    intent?: string;
    confidence?: number;
  }>({ active: false });

  const handleSubmit = async (question: string) => {
    setIsLoading(true);
    let response = "";

    // Add user message immediately before streaming
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      for await (const event of streamChatResponse(question, messages)) {
        if (event.type === "fallback-metadata") {
          setFallbackStatus({
            active: true,
            intent: event.intent,
            confidence: event.confidence,
          });
        }

        if (event.type === "token") {
          response += event.token;

          // Update or append assistant message
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: response };
            } else {
              updated.push({ role: "assistant", content: response });
            }
            return updated;
          });
        }

        if (event.type === "done") {
          if (!event.isFromFallback) {
            setFallbackStatus({ active: false });
          }
        }

        if (event.type === "error") {
          console.error("Chat error:", event.error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fix 3: JSX must be in a .tsx file — this component returns JSX correctly
  return (
    <div className="chat-container">
      {fallbackStatus.active && (
        <div className="fallback-notice">
          ⚠️ Using fallback bot (Intent: {fallbackStatus.intent},{" "}
          {((fallbackStatus.confidence ?? 0) * 100).toFixed(0)}% confident)
        </div>
      )}
      {messages.map((msg, i) => (
        <div key={i} className={`message message--${msg.role}`}>
          {msg.content}
        </div>
      ))}
      {isLoading && <div className="message message--loading">Thinking...</div>}
    </div>
  );
}

/**
 * Fallback badge
 */
export function FallbackBadge({
  active,
  intent,
  confidence,
}: {
  active: boolean;
  intent?: string;
  confidence?: number;
}) {
  if (!active) return null;

  const colors: Record<"high" | "medium" | "low", string> = {
    high: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-red-100 text-red-800",
  };

  const level: "high" | "medium" | "low" =
    (confidence ?? 0) > 0.7 ? "high" : (confidence ?? 0) > 0.5 ? "medium" : "low";

  return (
    <div className={`px-3 py-1 rounded text-sm font-medium ${colors[level]}`}>
      Fallback: {intent} ({((confidence ?? 0) * 100).toFixed(0)}%)
    </div>
  );
}

/**
 * Save chat history — SSR safe
 */
export function saveChatHistory(
  messages: Array<{ role: string; content: string; isFallback?: boolean }>
) {
  if (typeof window === "undefined") return; // Fix: SSR guard

  const enriched = messages.map((msg) => ({
    ...msg,
    timestamp: new Date().toISOString(),
  }));

  localStorage.setItem("chatHistory", JSON.stringify(enriched));
}

/**
 * Analytics
 */
export function trackFallbackUsage(intent: string, confidence: number) {
  const event = {
    type: "fallback_used",
    intent,
    confidence,
    timestamp: new Date().toISOString(),
  };
  console.log("Analytics:", event);
}