import React from 'react';
import { Terminal, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OutputConsoleProps {
  output: string[];
  error: string | null;
  onClear: () => void;
}

export function OutputConsole({ output, error, onClear }: OutputConsoleProps) {
  return (
    <div className="flex flex-col h-full glass-panel rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="text-secondary w-4 h-4" />
          <h3 className="font-bold text-sm tracking-wider text-glow">TELEMETRY</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClear}
          className="h-7 text-muted-foreground hover:text-white transition-colors"
        >
          <Trash2 size={14} className="mr-1" /> Clear
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-[#04010a]/80 leading-relaxed">
        {output.length === 0 && !error && (
          <div className="text-muted-foreground/40 italic flex items-center h-full justify-center">
            Awaiting execution protocol...
          </div>
        )}
        
        {output.map((line, i) => (
          <div key={i} className="text-foreground/90 break-words mb-1 animate-in fade-in duration-300">
            <span className="text-secondary/50 select-none mr-2">›</span>
            {line}
          </div>
        ))}
        
        {error && (
          <div className="mt-4 text-destructive flex items-start gap-2 bg-destructive/10 p-3 rounded border border-destructive/20 animate-in fade-in slide-in-from-bottom-1">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="break-words whitespace-pre-wrap">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}