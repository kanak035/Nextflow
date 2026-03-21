import { Handle, Position } from "reactflow";
import { ImagePlus, UploadCloud } from "lucide-react";

export function UploadImageNode() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-64 min-w-[250px]">
      <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold text-xs uppercase tracking-wider">
        <ImagePlus size={16} className="text-emerald-400" /> Upload Image
      </div>
      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 rounded-lg bg-slate-950/50 hover:bg-slate-800 transition-colors cursor-pointer group">
        <UploadCloud size={24} className="text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors" />
        <span className="text-[10px] text-slate-400 font-medium">Click or Drag Image here</span>
        <span className="text-[9px] text-slate-600 mt-1">supports jpg, png, webp</span>
      </div>
      {/* Output Handle - Image URL out */}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900" />
    </div>
  );
}
