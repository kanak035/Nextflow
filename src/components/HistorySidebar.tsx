"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Clock, XCircle } from "lucide-react";

type NodeRun = {
  id: string;
  nodeId: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

type WorkflowRun = {
  id: string;
  scope: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  durationMs: number | null;
  nodes: NodeRun[];
};

function StatusIcon({ status }: { status: string }) {
  if (status === "SUCCESS") {
    return <CheckCircle2 size={12} className="text-emerald-500" />;
  }

  if (status === "FAILED") {
    return <XCircle size={12} className="text-rose-500" />;
  }

  if (status === "PARTIAL") {
    return <Clock size={12} className="text-orange-400" />;
  }

  return <Clock size={12} className="text-amber-500 animate-pulse" />;
}

export function HistorySidebar() {
  const [history, setHistory] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const response = await fetch("/api/history", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`Server returned ${response.status}: ${detail.slice(0, 50)}`);
        }

        const result = (await response.json()) as WorkflowRun[] | { error?: string };

        if (!cancelled) {
          if (!response.ok || !Array.isArray(result)) {
            setHistory([]);
            setErrorMessage(
              typeof result === "object" && result && "error" in result
                ? result.error ?? "Failed to load workflow history"
                : "Failed to load workflow history"
            );
          } else {
            setHistory(result);
            setErrorMessage(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setHistory([]);
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setIsLoading(false);
        }
      }
    }

    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
        Workflow History
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {isLoading ? (
          <div className="text-[10px] text-slate-600">Loading runs...</div>
        ) : errorMessage ? (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-200">
            {errorMessage}
          </div>
        ) : history.length === 0 ? (
          <div className="text-[10px] text-slate-600 italic">
            Run a workflow to see persisted run history here.
          </div>
        ) : (
          history.map((run) => {
            const expanded = expandedRunId === run.id;
            return (
              <div key={run.id} className="rounded-lg border border-slate-800 bg-slate-950/50">
                <button
                  onClick={() => setExpandedRunId(expanded ? null : run.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    {expanded ? (
                      <ChevronDown size={12} className="text-slate-500" />
                    ) : (
                      <ChevronRight size={12} className="text-slate-500" />
                    )}
                    <StatusIcon status={run.status} />
                    <div>
                      <div className="text-[11px] font-medium text-slate-200">
                        Run #{run.id.slice(-6)}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {run.scope.toLowerCase()} • {run.nodes.length} nodes •{" "}
                        {new Date(run.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-slate-500">
                    {run.status}
                  </div>
                </button>

                {expanded ? (
                  <div className="border-t border-slate-800 px-3 py-3 space-y-3">
                    {run.errorMessage ? (
                      <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-2 text-[10px] text-rose-300">
                        {run.errorMessage}
                      </div>
                    ) : null}
                    {run.nodes.map((node) => (
                      <div key={node.id} className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon status={node.status} />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                              Node {node.nodeId}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500">{node.status}</span>
                        </div>
                        {node.errorMessage ? (
                          <div className="mb-2 text-[10px] text-rose-300">{node.errorMessage}</div>
                        ) : null}
                        <div className="grid gap-2">
                          <div>
                            <div className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">
                              Input
                            </div>
                            <pre className="max-h-24 overflow-auto rounded bg-slate-950/80 p-2 text-[9px] text-slate-300">
                              {JSON.stringify(node.input, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 text-[9px] uppercase tracking-wide text-slate-500">
                              Output
                            </div>
                            <pre className="max-h-24 overflow-auto rounded bg-slate-950/80 p-2 text-[9px] text-slate-300">
                              {JSON.stringify(node.output, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
