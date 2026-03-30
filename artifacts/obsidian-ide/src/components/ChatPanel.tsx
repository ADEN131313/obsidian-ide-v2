import React, { useState, useRef, useEffect } from 'react';
import { useChatStream } from '@/hooks/use-chat-stream';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Copy, Sparkles, User, Bot } from 'lucide-react';
import { HighlightObsidian } from '@/lib/highlight';

interface ChatPanelProps {
  onCopyToEditor: (code: string) => void;
}

export function ChatPanel({ onCopyToEditor }: ChatPanelProps) {
  const { messages, sendMessage, isLoading, error } = useChatStream();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    
    const blocks = content.split(/(```[\s\S]*?```)/g);
    
    return blocks.map((block, idx) => {
      if (block.startsWith('```')) {
        const lines = block.split('\n');
        const lang = lines[0].slice(3).trim();
        const code = lines.slice(1, -1).join('\n');
        
        return (
          <div key={idx} className="my-3 rounded-md overflow-hidden border border-white/10 bg-black/40">
            <div className="flex justify-between items-center px-3 py-1 bg-white/5 text-xs text-muted-foreground border-b border-white/5">
              <span>{lang || 'obsidian'}</span>
              <button 
                onClick={() => onCopyToEditor(code)}
                className="hover:text-primary transition-colors flex items-center gap-1"
                title="Copy to Editor"
              >
                <Copy size={12} />
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-sm font-mono leading-relaxed">
              <HighlightObsidian code={code} />
            </pre>
          </div>
        );
      }
      
      return <span key={idx} className="whitespace-pre-wrap">{block}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-black/20 flex items-center gap-2">
        <Sparkles className="text-primary w-5 h-5" />
        <h2 className="font-bold text-lg tracking-wider text-glow">COMM LINK</h2>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Sparkles className="w-12 h-12 mb-4 text-primary" />
            <p className="text-center max-w-xs leading-relaxed">
              Establish a connection with the intelligence. Ask for algorithms, patterns, or cosmic logic.
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
              <div className="text-xs text-muted-foreground mb-1 px-1 tracking-widest uppercase">
                {msg.role === 'user' ? 'Hacker' : 'Intelligence'}
              </div>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-secondary/10 text-secondary-foreground rounded-tr-sm border border-secondary/20' 
                  : 'bg-primary/10 text-primary-foreground rounded-tl-sm border border-primary/20'
              }`}>
                {msg.content === "" ? <span className="animate-pulse">...</span> : renderMessageContent(msg.content)}
              </div>
            </div>
          </div>
        ))}
        {error && (
          <div className="text-destructive text-sm text-center p-2 bg-destructive/10 rounded-md border border-destructive/20">
            Interference detected: {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-black/20 shrink-0">
        <div className="relative flex items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Transmit query..." 
            className="pr-12 bg-black/40 border-white/10 focus-visible:ring-primary h-12"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
            className="absolute right-1 h-10 w-10 bg-primary hover:bg-primary/80 text-white rounded-md transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
}