import { Handle, Position } from "reactflow";
import { Scissors, Loader2, Play, X } from "lucide-react";
import { useTransition } from "react";
import { runExtractFrameAction } from "../../app/actions/workflow";
import { useWorkflowStore } from "../../lib/store";

type ExtractFrameNodeData = {
  inputVideoUrl?: string;
  outputUrl?: string;
  timestamp?: string | number;
  inputVideoConnected?: boolean;
  timestampConnected?: boolean;
  isRunning?: boolean;
  result?: string;
};

export function ExtractFrameNode({ id, data }: { id: string; data: ExtractFrameNodeData }) {
  const [isPending, startTransition] = useTransition();
  const { updateNodeData, workflowId, removeNode } = useWorkflowStore();

  const handleRun = async () => {
    if (!data.inputVideoUrl) return;
    const inputVideoUrl = data.inputVideoUrl;
    updateNodeData(id, { isRunning: true, result: "Starting extraction..." });

    startTransition(async () => {
      const result = await runExtractFrameAction({
        workflowId: workflowId ?? undefined,
        nodeId: id,
        videoUrl: inputVideoUrl,
        timestamp: String(data.timestamp || "1"),
      });

      if (result.success && result.outputUrl) {
        updateNodeData(id, {
          isRunning: false,
          outputUrl: result.outputUrl,
          result: result.text || "Frame extracted.",
        });
      } else {
        updateNodeData(id, {
          isRunning: false,
          result: `Error: ${result.error || "Failed to extract frame."}`,
        });
      }
    });
  };

  return (
    <div className={`relative rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-64 min-w-[250px] transition-all duration-500 ${data.isRunning ? "node-glow-active-emerald" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
          <Scissors size={16} className="text-orange-400" /> Extract Frame
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
            disabled={isPending || !data.inputVideoUrl}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 text-white p-1.5 rounded-md transition-colors flex items-center justify-center"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          </button>
        </div>
      </div>

      <div className="mb-3 h-32 bg-slate-950/50 rounded flex items-center justify-center border border-slate-800 overflow-hidden text-center relative group">
        {data.outputUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.outputUrl} alt="Extracted Frame" className="w-full h-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 bg-orange-500/10 backdrop-blur-sm p-1 text-[8px] text-orange-400 text-center border-t border-orange-500/20">
              Extracted Frame
            </div>
          </>
        ) : data.inputVideoUrl ? (
          <div className="text-[9px] text-orange-400/70 italic px-2">
            Video Connected: ready to extract frame at {String(data.timestamp || "1")}
          </div>
        ) : (
          <span className="text-[9px] text-slate-600">Waiting for Video Input...</span>
        )}
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <label className="text-[10px] text-slate-400 font-medium">Timestamp (seconds or %)</label>
        <input
          type="text"
          value={String(data.timestamp || "1")}
          onChange={(event) =>
            updateNodeData(id, { timestamp: event.target.value || "1" })
          }
          disabled={Boolean(data.timestampConnected)}
          className="w-full bg-slate-950/50 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Handle type="target" position={Position.Left} id="video" style={{ top: "34%" }} className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="timestamp" style={{ top: "86%" }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-orange-500 !border-2 !border-slate-900" />
    </div>
  );
}
