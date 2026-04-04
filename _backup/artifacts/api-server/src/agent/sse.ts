type WritableResponse = {
  setHeader: (name: string, value: string) => void;
  write: (chunk: string) => void;
  end: () => void;
};

export type SsePayload =
  | { content: string }
  | { done: true; usage?: { chunks: number; durationMs: number } }
  | { error: string; code?: string };

export function initializeSse(res: WritableResponse) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

export function writeSse(res: WritableResponse, payload: SsePayload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function closeSse(res: WritableResponse) {
  res.end();
}
