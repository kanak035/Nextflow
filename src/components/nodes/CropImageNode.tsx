import { Handle, Position } from "reactflow";
import { Crop, Loader2, Play, X } from "lucide-react";
import { useTransition } from "react";
import { runCropNodeAction } from "../../app/actions/workflow";
import { useWorkflowStore } from "../../lib/store";

type CropImageNodeData = {
  inputImageUrl?: string;
  outputUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  inputImageConnected?: boolean;
  xConnected?: boolean;
  yConnected?: boolean;
  widthConnected?: boolean;
  heightConnected?: boolean;
  isRunning?: boolean;
  result?: string;
};

export function CropImageNode({ id, data }: { id: string; data: CropImageNodeData }) {
  const [isPending, startTransition] = useTransition();
  const { updateNodeData, workflowId, removeNode } = useWorkflowStore();

  const handleRun = async () => {
    if (!data.inputImageUrl) return;
    const inputImageUrl = data.inputImageUrl;
    updateNodeData(id, { isRunning: true, result: "Starting crop..." });

    startTransition(async () => {
      const result = await runCropNodeAction({
        workflowId: workflowId ?? undefined,
        nodeId: id,
        imageUrl: inputImageUrl,
        x: data.x || 0,
        y: data.y || 0,
        width: data.width || 80,
        height: data.height || 80,
      });

      if (result.success && result.outputUrl) {
        updateNodeData(id, { 
          isRunning: false,
          outputUrl: result.outputUrl,
          result: result.text || "Crop complete."
        });
      } else {
        updateNodeData(id, {
          isRunning: false,
          result: `Error: ${result.error || "Failed to crop image."}`
        });
      }
    });
  };

  const updateParam = (key: string, val: string) => {
    const parsed = Number.parseFloat(val);
    updateNodeData(id, { [key]: Number.isFinite(parsed) ? parsed : 0 });
  };

  return (
    <div className={`relative rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-64 min-w-[250px] transition-all duration-500 ${data.isRunning ? 'node-glow-active-emerald' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
          <Crop size={16} className="text-pink-400" /> Crop Image
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => removeNode(id)}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-rose-300"
            aria-label="Remove node"
          >
            <X size={14} />
          </button>
          <button 
            onClick={handleRun}
            disabled={isPending || !data.inputImageUrl}
            className="bg-pink-600 hover:bg-pink-700 disabled:bg-slate-700 text-white p-1.5 rounded-md transition-colors flex items-center justify-center"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          </button>
        </div>
      </div>

      <div className="mb-3 h-32 bg-slate-950/50 rounded flex items-center justify-center border border-slate-800 overflow-hidden relative group">
        {data.outputUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.outputUrl} alt="Cropped" className="w-full h-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 bg-emerald-500/10 backdrop-blur-sm p-1 text-[8px] text-emerald-400 text-center border-t border-emerald-500/20">
              Result Preview
            </div>
          </>
        ) : data.inputImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.inputImageUrl} alt="Input" className="w-full h-full object-contain opacity-50" />
        ) : (
          <span className="text-[9px] text-slate-600">Waiting for Image Input...</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">X (%)</label>
          <input type="number" value={data.x || 0} onChange={(e) => updateParam('x', e.target.value)} disabled={Boolean(data.xConnected)} className="w-full bg-slate-950/50 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-pink-500 disabled:cursor-not-allowed disabled:opacity-50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Y (%)</label>
          <input type="number" value={data.y || 0} onChange={(e) => updateParam('y', e.target.value)} disabled={Boolean(data.yConnected)} className="w-full bg-slate-950/50 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-pink-500 disabled:cursor-not-allowed disabled:opacity-50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Width (%)</label>
          <input type="number" value={data.width || 80} onChange={(e) => updateParam('width', e.target.value)} disabled={Boolean(data.widthConnected)} className="w-full bg-slate-950/50 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-pink-500 disabled:cursor-not-allowed disabled:opacity-50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Height (%)</label>
          <input type="number" value={data.height || 80} onChange={(e) => updateParam('height', e.target.value)} disabled={Boolean(data.heightConnected)} className="w-full bg-slate-950/50 border border-slate-700 rounded p-1 text-xs text-slate-200 focus:outline-none focus:border-pink-500 disabled:cursor-not-allowed disabled:opacity-50" />
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="image" style={{ top: "18%" }} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="x" style={{ top: "60%" }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="y" style={{ top: "72%" }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="width" style={{ top: "84%" }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="height" style={{ top: "96%" }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-pink-500 !border-2 !border-slate-900" />
    </div>
  );
}
