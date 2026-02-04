import {
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
} from "reactflow";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { NodeData } from "../components/flow/types";

export type FlowStoreState = {
    nodes: Node<NodeData>[];
    edges: Edge[];
    setNodes: (nodes: Node<NodeData>[]) => void;
    addNode: (node: Node<NodeData>) => void;
    setEdges: (edges: Edge[]) => void;
    setHandleData: (id: string, handleId: string, value: string) => void;
    updateNode: (id: string, node: Node<NodeData>) => void;

    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;

    results: Record<string, string | null>;
    setResult: (id: string, result: string | null) => void;
};

const initialNodes: Node<NodeData>[] = [
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
            tone: "sky",
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
        targetHandle: "userPrompt",
    },
];

export const useFlowStore = create<FlowStoreState>()(
    devtools((set, get) => ({
        nodes: initialNodes,
        edges: initialEdges,
        results: {},

        onNodesChange: (changes) => {
            set({
                nodes: applyNodeChanges(changes, get().nodes),
            });
        },
        onEdgesChange: (changes) => {
            set({
                edges: applyEdgeChanges(changes, get().edges),
            });
        },
        onConnect: (connection) => {
            set({
                edges: addEdge(connection, get().edges),
            });
        },
        setNodes: (nodes) => {
            set({ nodes });
        },
        setHandleData: (id, handleId, value) => {
            set({
                nodes: get().nodes.map((node) =>
                    node.id === id
                        ? {
                              ...node,
                              data: {
                                  ...node.data,
                                  [handleId]: value,
                              },
                          }
                        : node
                ),
            });
        },
        updateNode: (id: string, node: Node<NodeData>) => {
            set({ nodes: get().nodes.map((n) => (n.id === id ? node : n)) });
        },
        addNode: (node: Node<NodeData>) => {
            set({ nodes: [...get().nodes, node] });
        },
        setEdges: (edges) => {
            set({ edges });
        },
        setResult: (id, result) =>
            set((state) => {
                const nextResults = { ...state.results, [id]: result };
                return {
                    results: nextResults,
                };
            }),
    }))
);

export default useFlowStore;
