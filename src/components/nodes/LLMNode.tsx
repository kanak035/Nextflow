import { Handle, Position } from "reactflow";
import { Sparkles, Loader2, Play } from "lucide-react";
import { useTransition } from "react";
import { runLLMNodeAction } from "../../app/actions/workflow";
import { useWorkflowStore } from "../../lib/store";

const DEFAULT_MODEL = "gemini-2.5-flash";

type LLMNodeData = {
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
  imageInput?: string;
  imageInputs?: string[];
  isRunning?: boolean;
  result?: string;
};

export function LLMNode({ id, data }: { id: string; data: LLMNodeData }) {
  const [isPending, startTransition] = useTransition();
  const { updateNodeData, workflowId } = useWorkflowStore();
  const imageCount = data.imageInputs?.length ?? (data.imageInput ? 1 : 0);

  const handleRun = async () => {
    updateNodeData(id, { isRunning: true, result: "Calling Gemini..." });
    startTransition(async () => {
      const result = await runLLMNodeAction({
        workflowId: workflowId ?? undefined,
        nodeId: id,
        model: data.model || DEFAULT_MODEL,
        systemPrompt: data.systemPrompt || "",
        userPrompt: data.userPrompt || "",
        imageUrls: data.imageInputs?.length ? data.imageInputs : data.imageInput ? [data.imageInput] : []
      });

      if (result.success && result.text) {
        updateNodeData(id, { isRunning: false, result: result.text });
      } else {
        updateNodeData(id, { isRunning: false, result: `Error: ${result.error || "Unknown error"}` });
      }
    });
  };

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-72 min-w-[280px] transition-all duration-500 ${data.isRunning ? 'node-glow-active-purple' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
          <Sparkles size={16} className="text-purple-400" /> Run Any LLM
        </div>
        <button 
          onClick={handleRun}
          disabled={isPending}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white p-1.5 rounded-md transition-colors flex items-center justify-center"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Model</label>
          <select 
            className="bg-slate-950/50 border border-slate-700 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 w-full"
            value={data.model || DEFAULT_MODEL}
            onChange={(e) => {
              updateNodeData(id, { model: e.target.value });
            }}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>

        {/* Status indicator */}
        <div className="text-[9px] text-slate-500 flex flex-col gap-1 bg-slate-950/30 p-2 rounded">
          <div className={`${data.systemPrompt ? 'text-blue-400' : 'text-slate-600'}`}>• System Prompt: {data.systemPrompt ? 'Connected' : 'Empty'}</div>
          <div className={`${data.userPrompt ? 'text-blue-400' : 'text-slate-600'}`}>• User Prompt: {data.userPrompt ? 'Connected' : 'Empty'}</div>
          <div className={`${imageCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>• Image Input: {imageCount > 0 ? `${imageCount} connected` : 'Empty'}</div>
        </div>

        {data.result && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="text-[10px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-purple-500/30 shadow-inner group relative">
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {data.result}
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(data.result ?? "")}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 p-1 rounded text-[8px] hover:bg-slate-700"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Handles */}
      <Handle type="target" position={Position.Left} id="system" style={{ top: '25%' }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="user" style={{ top: '45%' }} className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left} id="image" style={{ top: '65%' }} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-purple-500 !border-2 !border-slate-900" />
    </div>
  );
}
