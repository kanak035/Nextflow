import { Handle, Position } from "reactflow";
import { Sparkles } from "lucide-react";

export function LLMNode() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-72 min-w-[280px]">
      <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold text-xs uppercase tracking-wider">
        <Sparkles size={16} className="text-purple-400" /> Run Any LLM
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Model</label>
          <select className="bg-slate-950/50 border border-slate-700 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500">
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          </select>
        </div>
      </div>

      {/* Input Handles for Image and Prompts */}
      <Handle type="target" position={Position.Left} id="system" style={{ top: '30%' }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="user" style={{ top: '50%' }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="image" style={{ top: '70%' }} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900" />

      {/* Output Handle for LLM Text Response */}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-900" />
    </div>
  );
}
