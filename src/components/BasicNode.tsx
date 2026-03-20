"use client";

"use client";

import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

type BasicNodeData = {
  label: string;
  description?: string;
};

export function BasicNode({ data }: NodeProps<BasicNodeData>) {
  return (
    <div className="rounded-xl border border-purple-500/40 bg-slate-900/80 px-4 py-3 text-xs text-slate-100 shadow-md shadow-purple-500/10">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
        {data.label}
      </div>

      <div className="text-[11px] text-slate-500">
        {data.description ?? "Node content goes here"}
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !bg-purple-400 !border-none"
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !bg-purple-400 !border-none"
      />
    </div>
  );
}

