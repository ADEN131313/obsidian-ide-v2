import React, { useState } from 'react';
import { CosmicBackground } from '@/components/CosmicBackground';
import { ChatPanel } from '@/components/ChatPanel';
import { CodeEditor } from '@/components/CodeEditor';
import { OutputConsole } from '@/components/OutputConsole';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { runObsidian } from '@/lib/obsidian';

const DEFAULT_CODE = `// Welcome to OBSIDIAN
fn fibonacci(n: i64) -> i64 {
  if n <= 1 {
    return n;
  }
  let a: i64 = 0;
  let b: i64 = 1;
  let i: i64 = 2;
  while i <= n {
    let temp: i64 = b;
    b = a + b;
    a = temp;
    i = i + 1;
  }
  return b;
}

fn main() {
  let i: i64 = 0;
  while i <= 10 {
    print(fibonacci(i));
    i = i + 1;
  }
}`;

export default function Home() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRun = () => {
    const result = runObsidian(code);
    setOutput(result.output);
    setError(result.error);
  };

  const handleClear = () => {
    setOutput([]);
    setError(null);
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col overflow-hidden relative selection:bg-primary/30">
      <CosmicBackground />
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 z-10 glass-panel border-b-0 rounded-none shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <h1 className="text-2xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] font-sans">
              OBSIDIAN
            </h1>
            <div className="absolute inset-0 text-glow opacity-50 blur-[2px] -z-10 mix-blend-screen text-primary font-black tracking-[0.2em]">
              OBSIDIAN
            </div>
          </div>
          <span className="text-xs tracking-widest text-muted-foreground border-l border-white/20 pl-4 uppercase hidden sm:inline-block">
            AI-Powered Code Intelligence
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 min-h-0 z-10">
        {/* Left Panel - Chat */}
        <div className="w-full md:w-[400px] lg:w-[450px] shrink-0 h-[40vh] md:h-auto md:self-stretch">
          <ChatPanel onCopyToEditor={setCode} />
        </div>

        {/* Right Panel - Editor & Console */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
          {/* Editor Section */}
          <div className="flex-1 flex flex-col glass-panel rounded-xl overflow-hidden min-h-0">
            <div className="h-12 border-b border-white/10 bg-black/20 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs font-mono text-muted-foreground tracking-wider">main.obs</span>
              </div>
              <Button 
                onClick={handleRun}
                className="h-8 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold shadow-[0_0_15px_rgba(40,180,255,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <Play size={14} className="mr-1 fill-current" /> RUN PROTOCOL
              </Button>
            </div>
            <div className="flex-1 p-3 min-h-0">
              <CodeEditor value={code} onChange={setCode} onRun={handleRun} />
            </div>
          </div>

          {/* Console Section */}
          <div className="h-[30%] shrink-0 min-h-[150px]">
            <OutputConsole output={output} error={error} onClear={handleClear} />
          </div>
        </div>
      </main>
    </div>
  );
}