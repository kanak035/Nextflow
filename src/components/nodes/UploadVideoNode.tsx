import React, { useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { Video, X } from "lucide-react";
import Uppy from "@uppy/core";
import Transloadit from "@uppy/transloadit";
import Dashboard from "@uppy/react/lib/Dashboard";
import { useWorkflowStore } from "../../lib/store";

export function UploadVideoNode({ id, data }: NodeProps) {
  const { setNodes } = useReactFlow();
  const { removeNode } = useWorkflowStore();

  const uppy = useMemo(() => {
    return new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: [".mp4", ".mov", ".webm", ".mkv"],
      },
    }).use(Transloadit, {
      assemblyOptions: {
        params: {
          auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY || "" },
          steps: {
            encode: {
              use: ":original",
              robot: "/video/encode",
              preset: "iphone-high",
            },
          },
        },
      },
      waitForEncoding: true,
    });
  }, []);

  uppy.on("transloadit:complete", (assembly) => {
    const uploadedUrl = assembly.results?.encode?.[0]?.ssl_url || assembly.results?.[":original"]?.[0]?.ssl_url;
    if (uploadedUrl) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: { ...n.data, videoUrl: uploadedUrl },
            };
          }
          return n;
        })
      );
    }
  });

  return (
    <div className="relative rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-80 min-w-[300px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
          <Video size={16} className="text-amber-400" /> Upload Video
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

      {!data?.videoUrl ? (
        <div className="bg-slate-950/50 rounded-lg overflow-hidden nodrag">
          <Dashboard 
            uppy={uppy} 
            theme="dark" 
            height={200} 
            hideUploadButton={false} 
            proudlyDisplayPoweredByUppy={false}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <video 
            src={data.videoUrl} 
            controls
            className="w-full h-32 object-cover rounded border border-slate-700"
          />
          <span className="text-[10px] text-slate-400 truncate mt-1">
            <strong>URL:</strong> {data.videoUrl}
          </span>
        </div>
      )}

      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900" 
      />
    </div>
  );
}
