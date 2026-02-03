import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
    applyEdgeChanges,
    applyNodeChanges,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
} from "reactflow";

import type { FlowNodeData, PromptNodeData } from "../components/flow/types";

export type StoredNode = {
    type: string;
    id: string;
    result: string | null;
    config: FlowNodeData | PromptNodeData;
    nextIds: string[];
};

type FlowStoreState = {
    nodes: Node<FlowNodeData | PromptNodeData>[];
    edges: Edge[];
    nodesById: Record<string, StoredNode>;
    results: Record<string, string | null>;
    setNodes: (
        updater:
            | Node<FlowNodeData | PromptNodeData>[]
            | ((
                  nodes: Node<FlowNodeData | PromptNodeData>[]
              ) => Node<FlowNodeData | PromptNodeData>[])
    ) => void;
    setEdges: (updater: Edge[] | ((edges: Edge[]) => Edge[])) => void;
    setResult: (id: string, result: string | null) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
};

const initialNodes: Node<FlowNodeData | PromptNodeData>[] = [
    {
        id: "prompt",
        type: "promptNode",
        position: { x: -280, y: 40 },
        data: {
            title: "Prompt Builder",
            badge: "Input",
            tone: "sky",
            systemPrompt:
                "You are a helpful assistant that follows the tool policy.",
            userPrompt:
                "Summarize the user's request and draft a plan for the flow.",
            model: "gemini-2.5-flash",
            returnJson: false,
        },
    },
    {
        id: "prompt-2",
        type: "promptNode",
        position: { x: 500, y: 40 },
        data: {
            title: "Prompt Builder",
            badge: "Input",
            tone: "violet",
            systemPrompt:
                "You are a planning assistant that converts tasks into steps.",
            userPrompt:
                "Generate the steps needed for the second model to execute.",
            model: "gemini-2.5-flash",
            returnJson: false,
        },
    },
];

const initialEdges: Edge[] = [
    {
        id: "e-prompt-prompt",
        source: "prompt",
        target: "prompt-2",
        targetHandle: "user",
        style: { stroke: "#ffffff" },
    },
];

const buildNodesMap = (
    nodes: Node<FlowNodeData | PromptNodeData>[],
    edges: Edge[],
    results: Record<string, string | null>
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
            result: results[node.id] ?? null,
            config: node.data,
            nextIds: Array.from(new Set(nextIds)),
        };
        return acc;
    }, {});
};

export const useFlowStore = create<FlowStoreState>()(
    devtools((set) => ({
        nodes: initialNodes,
        edges: initialEdges,
        results: {},
        nodesById: buildNodesMap(initialNodes, initialEdges, {}),
        setNodes: (updater) =>
            set((state) => {
                const nextNodes =
                    typeof updater === "function"
                        ? updater(state.nodes)
                        : updater;
                return {
                    nodes: nextNodes,
                    nodesById: buildNodesMap(
                        nextNodes,
                        state.edges,
                        state.results
                    ),
                };
            }),
        setEdges: (updater) =>
            set((state) => {
                const nextEdges =
                    typeof updater === "function"
                        ? updater(state.edges)
                        : updater;
                return {
                    edges: nextEdges,
                    nodesById: buildNodesMap(
                        state.nodes,
                        nextEdges,
                        state.results
                    ),
                };
            }),
        setResult: (id, result) =>
            set((state) => {
                const nextResults = { ...state.results, [id]: result };
                return {
                    results: nextResults,
                    nodesById: buildNodesMap(
                        state.nodes,
                        state.edges,
                        nextResults
                    ),
                };
            }),
        onNodesChange: (changes) =>
            set((state) => {
                const nextNodes = applyNodeChanges(changes, state.nodes);
                return {
                    nodes: nextNodes,
                    nodesById: buildNodesMap(
                        nextNodes,
                        state.edges,
                        state.results
                    ),
                };
            }),
        onEdgesChange: (changes) =>
            set((state) => {
                const nextEdges = applyEdgeChanges(changes, state.edges);
                return {
                    edges: nextEdges,
                    nodesById: buildNodesMap(
                        state.nodes,
                        nextEdges,
                        state.results
                    ),
                };
            }),
    }))
);
