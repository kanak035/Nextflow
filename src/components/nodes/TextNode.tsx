import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { MessageSquareText, X } from "lucide-react";
import { useWorkflowStore } from "../../lib/store";

export function TextNode({ id, data }: NodeProps) {
  const { setNodes } = useReactFlow();
  const { removeNode } = useWorkflowStore();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, text: newText } };
        }
        return node;
      })
    );
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-64 min-w-[250px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
          <MessageSquareText size={16} className="text-blue-400" /> Text Input
        </div>
          <button
            type="button"
            onClick={() => removeNode(id)}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-rose-300"
            aria-label="Remove node"
          >
          <X size={14} />
        </button>
      </div>
      <textarea 
        className="w-full h-24 bg-slate-950/50 border border-slate-700 rounded-md p-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-y transition-colors"
        placeholder="Enter prompt or content..."
        value={data.text || ""}
        onChange={handleChange}
      />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
    </div>
  );
}
