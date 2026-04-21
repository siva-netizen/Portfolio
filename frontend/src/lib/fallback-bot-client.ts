/**
 * Example: Client-side handling of fallback bot responses
 * Use this in your chat component (e.g., AvatarChat.tsx)
 */

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
    let intent: string | null = null;
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

            // Track fallback status
            if (event.fallback) {
              isFallback = true;
              intent = event.intent || null;
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

            // Stream tokens
            if (event.token) {
              yield {
                type: "token",
                token: event.token,
                isFromFallback: event.isFromFallback || isFallback,
              };
            }

            // Handle completion
            if (event.done) {
              yield {
                type: "done",
                isFromFallback: event.isFromFallback || isFallback,
              };
              return;
            }

            // Handle errors
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
 * Example React component using fallback bot
 */
export function ChatComponentExample() {
  const [messages, setMessages] = React.useState<
    Array<{ role: string; content: string }>
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fallbackStatus, setFallbackStatus] = React.useState<{
    active: boolean;
    intent?: string;
    confidence?: number;
  }>({ active: false });

  const handleSubmit = async (question: string) => {
    setIsLoading(true);
    let response = "";

    try {
      for await (const event of streamChatResponse(question, messages)) {
        if (event.type === "fallback-metadata") {
          console.log(`Fallback bot active: ${event.intent}`);
          setFallbackStatus({
            active: true,
            intent: event.intent,
            confidence: event.confidence,
          });

          // Show notification to user
          // toast.info(`Using fallback bot - Intent: ${event.intent}`);
        }

        if (event.type === "token") {
          response += event.token;

          // Update message in real-time
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[updated.length - 1]?.role === "assistant") {
              updated[updated.length - 1].content = response;
            }
            return updated;
          });
        }

        if (event.type === "done") {
          // Add to history when complete
          setMessages((prev) => [
            ...prev,
            { role: "user", content: question },
            { role: "assistant", content: response },
          ]);

          // Clear fallback status
          if (!event.isFromFallback) {
            setFallbackStatus({ active: false });
          }
        }

        if (event.type === "error") {
          console.error("Chat error:", event.error);
          // Show error to user
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {fallbackStatus.active && (
        <div className="fallback-notice">
          ⚠️ Using fallback bot (Intent: {fallbackStatus.intent},{" "}
          {(fallbackStatus.confidence! * 100).toFixed(0)}% confident)
        </div>
      )}

      {/* Chat messages here */}
      {/* Input field that calls handleSubmit() */}
    </div>
  );
}

/**
 * Visual Indicator Component for Fallback Status
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

  const colors = {
    high: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-red-100 text-red-800",
  };

  const level =
    (confidence || 0) > 0.7 ? "high" : (confidence || 0) > 0.5 ? "medium" : "low";

  return (
    <div className={`px-3 py-1 rounded text-sm font-medium ${colors[level]}`}>
      Fallback: {intent} ({(confidence! * 100).toFixed(0)}%)
    </div>
  );
}

/**
 * Storage Pattern - Save conversation with fallback markers
 */
export function saveChatHistory(
  messages: Array<{ role: string; content: string; isFallback?: boolean }>
) {
  // Mark messages that came from fallback
  const enriched = messages.map((msg) => ({
    ...msg,
    timestamp: new Date().toISOString(),
  }));

  localStorage.setItem("chatHistory", JSON.stringify(enriched));
}

/**
 * Analytics - Track fallback usage
 */
export function trackFallbackUsage(intent: string, confidence: number) {
  const event = {
    type: "fallback_used",
    intent,
    confidence,
    timestamp: new Date().toISOString(),
  };

  // Send to analytics service
  console.log("Analytics:", event);

  // Example: send to server for monitoring
  // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) });
}
