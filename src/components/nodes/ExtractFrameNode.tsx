import { Handle, Position } from "reactflow";
import { Scissors } from "lucide-react";

export function ExtractFrameNode() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-64 min-w-[250px]">
      <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold text-xs uppercase tracking-wider">
        <Scissors size={16} className="text-orange-400" /> Extract Frame
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <label className="text-[10px] text-slate-400 font-medium">Timestamp (seconds)</label>
        <input 
          type="number" 
          defaultValue={1} 
          className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500" 
        />
      </div>

      {/* Input Handle (Takes Video URL) */}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900" />

      {/* Output Handle (Returns Image URL) */}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-orange-500 !border-2 !border-slate-900" />
    </div>
  );
}
