import { useEffect, useRef } from "react";
import { HighlightObsidian } from "@/lib/highlight";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function Editor({ content, onChange }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      HighlightObsidian(textareaRef.current);
    }
  }, [content]);

  return (
    <div className="flex-1 bg-black/40 border border-white/10 rounded-md overflow-hidden">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full p-4 bg-transparent text-white font-mono text-sm resize-none focus:outline-none"
        placeholder="Write your OBSIDIAN code here..."
      />
    </div>
  );
}
