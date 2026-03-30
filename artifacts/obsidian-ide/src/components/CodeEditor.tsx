import React, { useRef } from 'react';
import { HighlightObsidian } from '@/lib/highlight';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  onRun: () => void;
}

export function CodeEditor({ value, onChange, onRun }: CodeEditorProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  
  const handleScroll = () => {
    if (preRef.current && textRef.current) {
      preRef.current.scrollTop = textRef.current.scrollTop;
      preRef.current.scrollLeft = textRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Need a timeout to set selection after React render
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
    
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onRun();
    }
  };

  return (
    <div className="relative w-full h-full font-mono text-sm overflow-hidden rounded-md border border-white/5 bg-[#0a0515]/60">
      <pre 
        ref={preRef}
        className="absolute inset-0 p-4 m-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden leading-relaxed" 
        style={{ tabSize: 2 }}
        aria-hidden="true"
      >
        <HighlightObsidian code={value} />
      </pre>
      <textarea
        ref={textRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        className="absolute inset-0 w-full h-full p-4 m-0 bg-transparent text-transparent caret-white resize-none outline-none whitespace-pre-wrap break-words overflow-auto leading-relaxed"
        spellCheck={false}
        style={{ tabSize: 2 }}
      />
    </div>
  );
}