import type { Connection, Edge } from "reactflow";

/**
 * Check if adding a connection would create a cycle in the graph
 */
export const createsCycle = (connection: Connection, edges: Edge[]) => {
    if (!connection.source || !connection.target) {
        return false;
    }

    if (connection.source === connection.target) {
        return true;
    }

    const adjacency = new Map<string, string[]>();
    const addEdgeToAdjacency = (source: string, target: string) => {
        const existing = adjacency.get(source) ?? [];
        adjacency.set(source, [...existing, target]);
    };

    edges.forEach((edge) => addEdgeToAdjacency(edge.source, edge.target));
    addEdgeToAdjacency(connection.source, connection.target);

    const visited = new Set<string>();
    const stack = [connection.target];

    while (stack.length) {
        const current = stack.pop();
        if (!current) {
            continue;
        }
        if (current === connection.source) {
            return true;
        }
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        const next = adjacency.get(current);
        if (next) {
            stack.push(...next);
        }
    }

    return false;
};
