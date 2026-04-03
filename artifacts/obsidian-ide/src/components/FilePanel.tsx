import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, File, Trash } from "lucide-react";

interface FileData {
  name: string;
  content: string;
}

interface FilePanelProps {
  files: FileData[];
  onAddFile: (file: FileData) => void;
  onSelectFile: (file: FileData) => void;
  onDeleteFile: (name: string) => void;
  selectedFile: string | null;
}

export function FilePanel({
  files,
  onAddFile,
  onSelectFile,
  onDeleteFile,
  selectedFile,
}: FilePanelProps) {
  const [newFileName, setNewFileName] = useState("");

  const handleAddFile = () => {
    if (newFileName.trim() && !files.find((f) => f.name === newFileName)) {
      onAddFile({ name: newFileName, content: "" });
      setNewFileName("");
    }
  };

  return (
    <div className="w-64 bg-black/60 border-r border-white/10 p-4">
      <h3 className="text-white text-lg mb-4">Files</h3>
      <div className="flex gap-2 mb-4">
        <Input
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="File name"
          className="bg-gray-800 border-gray-600 text-white"
          onKeyDown={(e) => e.key === "Enter" && handleAddFile()}
        />
        <Button onClick={handleAddFile} size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.name}
            className={`flex items-center justify-between p-2 rounded cursor-pointer ${
              selectedFile === file.name ? "bg-white/10" : "hover:bg-white/5"
            }`}
            onClick={() => onSelectFile(file)}
          >
            <div className="flex items-center gap-2 text-white">
              <File className="w-4 h-4" />
              <span className="text-sm">{file.name}</span>
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFile(file.name);
              }}
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
