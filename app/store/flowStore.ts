import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Edge, Node } from "reactflow";

import type { FlowNodeData, PromptNodeData } from "../components/flow/types";

export type StoredNode = {
    type: string;
    id: string;
    config: FlowNodeData | PromptNodeData;
    nextIds: string[];
};

type FlowStoreState = {
    nodes: Record<string, StoredNode>;
    edges: Edge[];
    setFromFlow: (
        nodes: Node<FlowNodeData | PromptNodeData>[],
        edges: Edge[]
    ) => void;
};

const buildNodesMap = (
    nodes: Node<FlowNodeData | PromptNodeData>[],
    edges: Edge[]
) => {
    const adjacency = new Map<string, string[]>();
    edges.forEach((edge) => {
        const existing = adjacency.get(edge.source) ?? [];
        adjacency.set(edge.source, [...existing, edge.target]);
    });

    return nodes.reduce<Record<string, StoredNode>>((acc, node) => {
        const nextIds = adjacency.get(node.id) ?? [];
        acc[node.id] = {
            type: node.type ?? "default",
            id: node.id,
            config: node.data,
            nextIds: Array.from(new Set(nextIds)),
        };
        return acc;
    }, {});
};

export const useFlowStore = create<FlowStoreState>()(
    devtools((set) => ({
        nodes: {},
        edges: [],
        setFromFlow: (nodes, edges) =>
            set(() => ({
                nodes: buildNodesMap(nodes, edges),
                edges,
            })),
    }))
);
