import { Handle, Position } from "reactflow";
import { MessageSquareText } from "lucide-react";
import { useState } from "react";

export function TextNode() {
  const [text, setText] = useState("");

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-64 min-w-[250px]">
      <div className="flex items-center gap-2 mb-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
        <MessageSquareText size={16} className="text-blue-400" /> Text Input
      </div>
      <textarea 
        className="w-full h-24 bg-slate-950/50 border border-slate-700 rounded-md p-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-y transition-colors"
        placeholder="Enter some text, system prompt, or input..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {/* Output Handle */}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
    </div>
  );
}
