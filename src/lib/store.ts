import { create } from "zustand";
import { 
  type Node, 
  type Edge, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  type NodeChange,
  type OnNodesChange, 
  type OnEdgesChange, 
  type OnConnect,
  type IsValidConnection,
  Connection
} from "reactflow";
import {
  isValidWorkflowConnection,
  syncDataFlow,
  wouldCreateCycle,
} from "./workflow-graph";

type WorkflowState = {
  workflowId: string | null;
  workflowName: string;
  nodes: Node[];
  edges: Edge[];
  canUndo: boolean;
  canRedo: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  isValidConnection: IsValidConnection;
  addNode: (node: Node) => void;
  removeEdgeById: (edgeId: string) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  loadWorkflowGraph: (workflowId: string, workflowName: string, nodes: Node[], edges: Edge[]) => void;
  setWorkflowMeta: (workflowId: string, workflowName: string) => void;
  setWorkflowName: (workflowName: string) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  undo: () => void;
  redo: () => void;
};

type WorkflowSnapshot = Pick<WorkflowState, "workflowId" | "workflowName" | "nodes" | "edges">;

type InternalWorkflowState = WorkflowState & {
  past: WorkflowSnapshot[];
  future: WorkflowSnapshot[];
};

function createSnapshot(state: InternalWorkflowState): WorkflowSnapshot {
  return {
    workflowId: state.workflowId,
    workflowName: state.workflowName,
    nodes: state.nodes,
    edges: state.edges,
  };
}

function applySnapshot(snapshot: WorkflowSnapshot) {
  return {
    workflowId: snapshot.workflowId,
    workflowName: snapshot.workflowName,
    edges: snapshot.edges,
    nodes: syncDataFlow(snapshot.nodes, snapshot.edges),
  };
}

function shouldTrackNodeChanges(changes: NodeChange[]) {
  return changes.some((change) => {
    if (change.type === "add" || change.type === "remove") {
      return true;
    }

    return false;
  });
}

export const useWorkflowStore = create<InternalWorkflowState>((set, get) => ({
  workflowId: null,
  workflowName: "Untitled workflow",
  nodes: [],
  edges: [],
  canUndo: false,
  canRedo: false,
  past: [],
  future: [],
  isValidConnection: (connection) => {
    return isValidWorkflowConnection(connection, get().nodes) &&
      !wouldCreateCycle(connection, get().edges);
  },
  
  onNodesChange: (changes) => {
    const currentNodes = get().nodes;
    const newNodes = applyNodeChanges(changes, currentNodes);
    const syncedNodes = syncDataFlow(newNodes, get().edges);
    const shouldTrackHistory = shouldTrackNodeChanges(changes);

    set((state) => ({
      ...(shouldTrackHistory
        ? {
            past: [...state.past, createSnapshot(state)],
            future: [],
            canUndo: true,
            canRedo: false,
          }
        : {}),
      nodes: syncedNodes,
    }));
  },

  onEdgesChange: (changes) => {
    const newEdges = applyEdgeChanges(changes, get().edges);
    const syncedNodes = syncDataFlow(get().nodes, newEdges);
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      edges: newEdges,
      nodes: syncedNodes,
    }));
  },

  onConnect: (connection: Connection) => {
    if (
      !isValidWorkflowConnection(connection, get().nodes) ||
      wouldCreateCycle(connection, get().edges)
    ) {
      return;
    }

    const newEdges = addEdge(
      {
        ...connection,
        animated: true,
        style: { stroke: "#a855f7", strokeWidth: 2 },
      },
      get().edges
    );
    const syncedNodes = syncDataFlow(get().nodes, newEdges);
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      edges: newEdges,
      nodes: syncedNodes,
    }));
  },
  
  addNode: (node) => {
    const newNodes = [...get().nodes, node];
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      nodes: syncDataFlow(newNodes, get().edges),
    }));
  },

  removeEdgeById: (edgeId) => {
    const newEdges = get().edges.filter((edge) => edge.id !== edgeId);
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      edges: newEdges,
      nodes: syncDataFlow(get().nodes, newEdges),
    }));
  },

  setNodes: (nodes) => {
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      nodes: syncDataFlow(nodes, get().edges),
    }));
  },

  setEdges: (edges) => {
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      edges,
      nodes: syncDataFlow(get().nodes, edges),
    }));
  },

  loadWorkflowGraph: (workflowId, workflowName, nodes, edges) => {
    set({
      workflowId,
      workflowName,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      edges,
      nodes: syncDataFlow(nodes, edges),
    });
  },

  setWorkflowMeta: (workflowId, workflowName) => {
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      workflowId,
      workflowName,
    }));
  },

  setWorkflowName: (workflowName) => {
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      workflowName,
    }));
  },

  updateNodeData: (id, data) => {
    set((state) => ({
      past: [...state.past, createSnapshot(state)],
      future: [],
      canUndo: true,
      canRedo: false,
      nodes: syncDataFlow(
        state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n),
        state.edges
      ),
    }));
  },

  undo: () => {
    const previous = get().past[get().past.length - 1];
    if (!previous) {
      return;
    }

    set((state) => ({
      ...applySnapshot(previous),
      past: state.past.slice(0, -1),
      future: [createSnapshot(state), ...state.future],
      canUndo: state.past.length > 1,
      canRedo: true,
    }));
  },

  redo: () => {
    const next = get().future[0];
    if (!next) {
      return;
    }

    set((state) => ({
      ...applySnapshot(next),
      past: [...state.past, createSnapshot(state)],
      future: state.future.slice(1),
      canUndo: true,
      canRedo: state.future.length > 1,
    }));
  },
}));
