import { useState, lazy, Suspense } from "react";
import { CosmicBackground } from "@/components/CosmicBackground";
import { ChatPanel } from "@/components/ChatPanel";
import { FilePanel } from "@/components/FilePanel";
const Editor = lazy(() => import("@/components/Editor").then((m) => ({ default: m.Editor })));
import { Button } from "@/components/ui/button";
import { Code, MessageCircle, Play, Download } from "lucide-react";
import { runObsidian } from "@/lib/obsidian";

interface FileData {
  name: string;
  content: string;
}

export default function Home() {
  const [mode, setMode] = useState<"landing" | "chat" | "editor">("landing");
  const [files, setFiles] = useState<FileData[]>([
    {
      name: "main.obs",
      content: `struct Point {
  x: f64,
  y: f64,
}

enum Result {
  Ok { value: i64 },
  Err { message: str },
}

fn calculate_distance(p1: Point, p2: Point) -> f64 {
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;
  sqrt(dx * dx + dy * dy)
}

fn main() {
  let points = [Point { x: 0.0, y: 0.0 }, Point { x: 3.0, y: 4.0 }];
  let distances = points.map(|p| calculate_distance(Point { x: 0.0, y: 0.0 }, p));
  println(f"The distances are: {distances.join(", ")}");

  let result = if distances.len() > 0 {
    Result::Ok { value: floor(distances[0]) }
  } else {
    Result::Err { message: "No points" }
  };

  match result {
    Result::Ok { value } => println(f"Success: {value}"),
    Result::Err { message } => println(f"Error: {message}"),
  }
}`
    },
  ]);
  const [selectedFile, setSelectedFile] = useState<string>("main.obs");
  const [output, setOutput] = useState<string>("");

  const handleAddFile = (file: FileData) => {
    setFiles([...files, file]);
  };

  const handleSelectFile = (file: FileData) => {
    setSelectedFile(file.name);
  };

  const handleDeleteFile = (name: string) => {
    if (files.length > 1) {
      setFiles(files.filter((f) => f.name !== name));
      if (selectedFile === name) {
        setSelectedFile(files[0].name);
      }
    }
  };

  const handleContentChange = (content: string) => {
    setFiles(
      files.map((f) => (f.name === selectedFile ? { ...f, content } : f)),
    );
  };

  const currentFile = files.find((f) => f.name === selectedFile);

  const handleRun = () => {
    if (currentFile) {
      const result = runObsidian(currentFile.content);
      if (result.error) {
        setOutput(`Error: ${result.error}`);
      } else {
        setOutput(result.output.join("\n"));
      }
    }
  };

  const handleExport = () => {
    if (currentFile) {
      const blob = new Blob([currentFile.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFile;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (mode === "chat") {
    return (
      <div className="h-[100dvh] w-full flex flex-col overflow-hidden relative">
        <CosmicBackground />
        <header className="h-14 flex items-center justify-between px-6 z-20 shrink-0">
          <button
            onClick={() => setMode("landing")}
            className="greek-title text-2xl tracking-[0.15em] hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none"
          >
            OBSIDIAN
          </button>
          <div className="flex gap-2">
            <Button onClick={() => setMode("editor")} variant="ghost" size="sm">
              <Code className="w-4 h-4 mr-2" />
              Editor
            </Button>
            <Button variant="ghost" size="sm" disabled>
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </div>
        </header>
        <main className="flex-1 z-20 px-4 pb-4 min-h-0">
          <ChatPanel onCopyToEditor={() => {}} />
        </main>
      </div>
    );
  }

  if (mode === 'editor') {
    return (
      <div className="h-[100dvh] w-full flex overflow-hidden relative">
        <CosmicBackground />
        <FilePanel
          files={files}
          onAddFile={handleAddFile}
          onSelectFile={handleSelectFile}
          onDeleteFile={handleDeleteFile}
          selectedFile={selectedFile}
        />
        <div className="flex-1 flex flex-col z-20 p-4">
          <header className="h-14 flex items-center justify-between mb-4">
            <h2 className="text-white text-xl">{selectedFile}</h2>
            <div className="flex gap-2">
              <Button onClick={handleRun} variant="ghost" size="sm">
                <Play className="w-4 h-4 mr-2" />
                Run
              </Button>
              <Button onClick={handleExport} variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setMode('chat')} variant="ghost" size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </Button>
              <Button onClick={() => setMode('landing')} variant="ghost" size="sm">
                Home
              </Button>
            </div>
          </header>
          <div className="flex-1 flex gap-4 min-h-0">
            <Suspense fallback={<div className="flex-1 bg-black/40 border border-white/10 rounded-md flex items-center justify-center text-white">Loading Editor...</div>}>
              <Editor
                content={currentFile?.content || ""}
                onChange={handleContentChange}
              />
            </Suspense>
            <div className="w-64 bg-black/40 border border-white/10 rounded-md p-4">
              <h3 className="text-white text-lg mb-2">Output</h3>
              <pre className="text-white text-sm whitespace-pre-wrap font-mono">{output}</pre>
            </div>
          </div>
        </div>
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
          <div
            className="greek-title-shadow text-[clamp(2.5rem,8vw,6rem)] leading-none tracking-[0.2em] select-none px-4"
            aria-hidden="true"
          >
            OBSIDIAN
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col items-center gap-5 pb-[8vh]">
          <p className="text-sm md:text-base tracking-[0.35em] uppercase landing-fade-in"
            style={{ color: 'rgba(190, 210, 255, 0.9)', fontFamily: "'Space Mono', monospace", animationDelay: '0.3s', textShadow: '0 0 25px rgba(140, 170, 255, 0.5)' }}>
            Surrender to the darkness
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => setMode('editor')}
              className="pointer-events-auto cta-button landing-fade-in"
              style={{ animationDelay: "0.6s" }}
            >
              <span className="cta-text">Enter Editor</span>
              <span className="cta-glow" />
            </button>
            <button
              onClick={() => setMode('chat')}
              className="pointer-events-auto cta-button landing-fade-in"
              style={{ animationDelay: "0.8s" }}
            >
              <span className="cta-text">Start Chat</span>
              <span className="cta-glow" />
            </button>
          </div>
        </div>
            <span className="cta-text">
              Begin Communion with Agent OBSIDIAN
            </span>
            <span className="cta-glow" />
          </button>
        </div>
      </div>
    </div>
  );
}
