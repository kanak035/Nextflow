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
