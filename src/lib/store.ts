import { create } from "zustand";
import { 
  type Node, 
  type Edge, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  type OnNodesChange, 
  type OnEdgesChange, 
  type OnConnect,
  Connection
} from "reactflow";
import { syncDataFlow } from "./workflow-graph";

type WorkflowState = {
  workflowId: string | null;
  workflowName: string;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  loadWorkflowGraph: (workflowId: string, workflowName: string, nodes: Node[], edges: Edge[]) => void;
  setWorkflowMeta: (workflowId: string, workflowName: string) => void;
  setWorkflowName: (workflowName: string) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  workflowName: "Untitled workflow",
  nodes: [],
  edges: [],
  
  onNodesChange: (changes) => {
    const currentNodes = get().nodes;
    const newNodes = applyNodeChanges(changes, currentNodes);
    const syncedNodes = syncDataFlow(newNodes, get().edges);
    set({ nodes: syncedNodes });
  },

  onEdgesChange: (changes) => {
    const newEdges = applyEdgeChanges(changes, get().edges);
    const syncedNodes = syncDataFlow(get().nodes, newEdges);
    set({ edges: newEdges, nodes: syncedNodes });
  },

  onConnect: (connection: Connection) => {
    const newEdges = addEdge({ ...connection, animated: true }, get().edges);
    const syncedNodes = syncDataFlow(get().nodes, newEdges);
    set({ edges: newEdges, nodes: syncedNodes });
  },
  
  addNode: (node) => {
    const newNodes = [...get().nodes, node];
    set({ nodes: syncDataFlow(newNodes, get().edges) });
  },

  setNodes: (nodes) => {
    set({ nodes: syncDataFlow(nodes, get().edges) });
  },

  setEdges: (edges) => {
    set({ edges, nodes: syncDataFlow(get().nodes, edges) });
  },

  loadWorkflowGraph: (workflowId, workflowName, nodes, edges) => {
    set({
      workflowId,
      workflowName,
      edges,
      nodes: syncDataFlow(nodes, edges),
    });
  },

  setWorkflowMeta: (workflowId, workflowName) => {
    set({
      workflowId,
      workflowName,
    });
  },

  setWorkflowName: (workflowName) => {
    set({ workflowName });
  },

  updateNodeData: (id, data) => {
    set({ 
      nodes: syncDataFlow(
        get().nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n),
        get().edges
      )
    });
  },
}));
