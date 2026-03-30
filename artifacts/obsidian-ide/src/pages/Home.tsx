import { useState } from 'react';
import { CosmicBackground } from '@/components/CosmicBackground';
import { ChatPanel } from '@/components/ChatPanel';

export default function Home() {
  const [showChat, setShowChat] = useState(false);

  if (showChat) {
    return (
      <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative">
        <CosmicBackground />
        <header className="h-14 flex items-center px-6 z-20 shrink-0">
          <button onClick={() => setShowChat(false)} className="greek-title text-2xl tracking-[0.15em] hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none">
            OBSIDIAN
          </button>
        </header>
        <main className="flex-1 z-20 px-4 pb-4 min-h-0">
          <ChatPanel onCopyToEditor={() => {}} />
        </main>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col items-center justify-center overflow-hidden relative selection:bg-primary/30">
      <CosmicBackground />

      <div className="z-20 flex flex-col items-center text-center pointer-events-none absolute inset-0">
        <div className="pt-[5vh] md:pt-[6vh] landing-fade-in">
          <h1 className="greek-title text-[clamp(2.5rem,8vw,6rem)] leading-none tracking-[0.2em] select-none px-4">
            OBSIDIAN
          </h1>
          <div className="greek-title-shadow text-[clamp(2.5rem,8vw,6rem)] leading-none tracking-[0.2em] select-none px-4" aria-hidden="true">
            OBSIDIAN
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center gap-5 pb-[8vh]">
          <p className="text-sm md:text-base tracking-[0.35em] uppercase landing-fade-in"
            style={{ color: 'rgba(190, 210, 255, 0.9)', fontFamily: "'Space Mono', monospace", animationDelay: '0.3s', textShadow: '0 0 25px rgba(140, 170, 255, 0.5)' }}>
            Surrender to the darkness
          </p>

          <button
            onClick={() => setShowChat(true)}
            className="pointer-events-auto cta-button landing-fade-in"
            style={{ animationDelay: '0.6s' }}
          >
            <span className="cta-text">Begin Communion with Agent OBSIDIAN</span>
            <span className="cta-glow" />
          </button>
        </div>
      </div>
    </div>
  );
}
