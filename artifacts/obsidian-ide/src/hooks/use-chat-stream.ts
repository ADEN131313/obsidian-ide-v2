import { useState, useCallback, useRef } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const currentMessages = messagesRef.current;
    const newMessage: ChatMessage = { role: "user", content };
    const updatedHistory = [...currentMessages, newMessage];

    setMessages([...updatedHistory, { role: "assistant", content: "" }]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: currentMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            const lines = event.split("\n").filter((l) => l.startsWith("data: "));
            for (const line of lines) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated.length - 1;
                    if (updated[last]?.role === "assistant") {
                      updated[last] = {
                        ...updated[last],
                        content: updated[last].content + data.content,
                      };
                    }
                    return updated;
                  });
                }
                if (data.done) {
                  done = true;
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
  };
}
