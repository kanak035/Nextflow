import { Node, Edge } from "reactflow";

/**
 * Basic DAG Execution Engine
 * This will help determine the order in which nodes should be executed.
 */

// Function to get topological sort of nodes
export function getExecutionOrder(nodes: Node[], edges: Edge[]): Node[] {
  const result: Node[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(nodeId: string) {
    if (visiting.has(nodeId)) {
      throw new Error("Cycle detected in workflow!");
    }
    if (!visited.has(nodeId)) {
      visiting.add(nodeId);
      
      // Find all source nodes that point to this node
      const incomingEdges = edges.filter(e => e.target === nodeId);
      incomingEdges.forEach(edge => {
        visit(edge.source);
      });

      visiting.delete(nodeId);
      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) result.push(node);
    }
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      visit(node.id);
    }
  });

  return result;
}

export function getExecutionBatches(
  nodes: Node[],
  edges: Edge[],
  allowedNodeIds?: Set<string>
): Node[][] {
  const scopedNodes = allowedNodeIds
    ? nodes.filter((node) => allowedNodeIds.has(node.id))
    : nodes;
  const scopedNodeIds = new Set(scopedNodes.map((node) => node.id));
  const scopedEdges = edges.filter(
    (edge) => scopedNodeIds.has(edge.source) && scopedNodeIds.has(edge.target)
  );

  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of scopedNodes) {
    inDegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of scopedEdges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }

  const batches: Node[][] = [];
  let readyIds = scopedNodes
    .filter((node) => (inDegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const remaining = new Set(scopedNodes.map((node) => node.id));

  while (readyIds.length > 0) {
    const batch = scopedNodes.filter((node) => readyIds.includes(node.id));
    batches.push(batch);

    const nextReady = new Set<string>();

    for (const nodeId of readyIds) {
      remaining.delete(nodeId);

      for (const targetId of outgoing.get(nodeId) ?? []) {
        const nextDegree = (inDegree.get(targetId) ?? 0) - 1;
        inDegree.set(targetId, nextDegree);

        if (nextDegree === 0 && remaining.has(targetId)) {
          nextReady.add(targetId);
        }
      }
    }

    readyIds = [...nextReady];
  }

  if (remaining.size > 0) {
    throw new Error("Cycle detected in workflow!");
  }

  return batches;
}

// Function to check if a node is ready (all inputs are present)
export function isNodeReady(node: Node, nodes: Node[], edges: Edge[]): boolean {
  const incomingEdges = edges.filter(e => e.target === node.id);
  
  // If it's a root node (no inputs needed), it's always ready
  if (incomingEdges.length === 0) return true;

  // Otherwise, check if all sources have data
  return incomingEdges.every(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    if (!sourceNode) return false;
    
    // Check if source has output data (e.g. text, imageUrl, etc)
    const data = sourceNode.data;
    return !!(data.text || data.imageUrl || data.videoUrl || data.outputUrl);
  });
}
