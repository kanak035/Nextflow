import { Handle, Position } from "reactflow";
import { Crop } from "lucide-react";

export function CropImageNode() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-64 min-w-[250px]">
      <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold text-xs uppercase tracking-wider">
        <Crop size={16} className="text-pink-400" /> Crop Image
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">X (%)</label>
          <input type="number" defaultValue={0} className="w-full bg-slate-950/50 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-pink-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Y (%)</label>
          <input type="number" defaultValue={0} className="w-full bg-slate-950/50 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-pink-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Width (%)</label>
          <input type="number" defaultValue={80} className="w-full bg-slate-950/50 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-pink-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Height (%)</label>
          <input type="number" defaultValue={80} className="w-full bg-slate-950/50 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-pink-500" />
        </div>
      </div>

      {/* Input Handle (Takes Image URL) */}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900" />

      {/* Output Handle (Returns Cropped Image URL) */}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-pink-500 !border-2 !border-slate-900" />
    </div>
  );
}
