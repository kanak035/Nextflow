import React, { useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "reactflow";
import { ImagePlus } from "lucide-react";
import Uppy from "@uppy/core";
import Transloadit from "@uppy/transloadit";
import Dashboard from "@uppy/react/dashboard";

import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

export function UploadImageNode({ id, data }: NodeProps) {
  const { setNodes } = useReactFlow();

  const uppy = useMemo(() => {
    return new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: [".jpg", ".jpeg", ".png", ".webp"],
      },
    }).use(Transloadit, {
      assemblyOptions: {
        params: {
          auth: { key: process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY || "" },
          steps: {
            resize: {
              use: ":original",
              robot: "/image/resize",
              width: 1280,
              height: 1280,
              resize_strategy: "fit",
            },
          },
        },
      },
      waitForEncoding: true,
    });
  }, []);

  uppy.on("transloadit:complete", (assembly) => {
    const uploadedUrl = assembly.results?.resize?.[0]?.ssl_url || assembly.results?.[":original"]?.[0]?.ssl_url;
    if (uploadedUrl) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: { ...n.data, imageUrl: uploadedUrl },
            };
          }
          return n;
        })
      );
    }
  });

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-lg p-3 w-80 min-w-[300px]">
      <div className="flex items-center gap-2 mb-3 text-slate-200 font-semibold text-xs uppercase tracking-wider">
        <ImagePlus size={16} className="text-emerald-400" /> Upload Image
      </div>

      {!data?.imageUrl ? (
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={data.imageUrl} 

            alt="Uploaded" 
            className="w-full h-32 object-cover rounded border border-slate-700"
          />
          <span className="text-[10px] text-slate-400 truncate mt-1">
            <strong>URL:</strong> {data.imageUrl}
          </span>
        </div>
      )}

      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900" 
      />
    </div>
  );
}
