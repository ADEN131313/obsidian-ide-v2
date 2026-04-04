import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useAuthStore } from "../stores/auth";

export function IDE() {
  const { user, logout } = useAuthStore();
  const [code, setCode] = useState(`fn main() {
    let greeting = "Hello, OBSIDIAN!";
    print(greeting);
    
    let sum = add(5, 3);
    print(sum);
}

fn add(a: i64, b: i64) -> i64 {
    return a + b;
}`);
  const [output, setOutput] = useState("");

  const handleRun = async () => {
    setOutput("Running...\n");
    // TODO: Integrate with OBSIDIAN VM
    setOutput((prev) => prev + "Hello, OBSIDIAN!\n8\n");
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg">OBSIDIAN IDE</h1>
          <span className="text-sm text-gray-400">v2.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button
            onClick={logout}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <PanelGroup direction="horizontal" className="flex-1">
        {/* File Explorer */}
        <Panel defaultSize={15} minSize={10}>
          <div className="h-full bg-gray-800 border-r border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">FILES</h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-700 rounded text-sm">
                <span className="text-blue-400">📄</span>
                <span>main.obs</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 hover:bg-gray-700 rounded text-sm cursor-pointer">
                <span className="text-gray-500">📄</span>
                <span>utils.obs</span>
              </div>
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-gray-600 transition-colors" />

        {/* Editor */}
        <Panel defaultSize={50}>
          <div className="h-full flex flex-col">
            <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4">
              <span className="text-sm">main.obs</span>
              <button
                onClick={handleRun}
                className="ml-auto px-4 py-1 bg-green-600 hover:bg-green-700 text-sm rounded flex items-center gap-2"
              >
                ▶ Run
              </button>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="obsidian"
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-gray-700 hover:bg-gray-600 transition-colors" />

        {/* Chat & Output */}
        <Panel defaultSize={35} minSize={20}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={60}>
              <div className="h-full bg-gray-800 border-l border-gray-700 flex flex-col">
                <div className="h-10 border-b border-gray-700 flex items-center px-4">
                  <span className="text-sm font-semibold">AI Assistant</span>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  <div className="space-y-4">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-sm text-gray-300">
                        Hello! I'm your OBSIDIAN coding assistant. How can I help you today?
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-700">
                  <input
                    type="text"
                    placeholder="Ask me anything..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="h-1 bg-gray-700 hover:bg-gray-600 transition-colors" />

            <Panel defaultSize={40}>
              <div className="h-full bg-gray-800 border-l border-gray-700 flex flex-col">
                <div className="h-10 border-b border-gray-700 flex items-center px-4">
                  <span className="text-sm font-semibold">Output</span>
                </div>
                <pre className="flex-1 p-4 font-mono text-sm text-gray-300 overflow-auto">
                  {output}
                </pre>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
