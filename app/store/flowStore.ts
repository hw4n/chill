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

export type ExecutionStatus = "idle" | "running" | "done" | "error";

export type ExecutionState = {
    status: ExecutionStatus;
    result: string | object | null;
    error?: string;
    startedAt?: number;
    finishedAt?: number;
};

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

    execution: Record<string, ExecutionState>;
    setExecution: (id: string, execution: ExecutionState) => void;
    resetExecutionStatuses: () => void;
    setExecutionStarted: (id: string) => void;
    setExecutionFinished: (id: string, result: string | object | null) => void;
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
        execution: {},

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
        setExecution: (id, execution) =>
            set((state) => {
                const nextExecution = { ...state.execution, [id]: execution };
                return {
                    execution: nextExecution,
                };
            }),
        resetExecutionStatuses: () => {
            set((state: FlowStoreState) => {
                const newExecution = state.nodes.reduce<
                    Record<string, ExecutionState>
                >((acc, node) => {
                    acc[node.id] = {
                        status: "idle",
                        result: null,
                        error: undefined,
                        startedAt: undefined,
                        finishedAt: undefined,
                    };
                    return acc;
                }, {});

                return {
                    execution: newExecution,
                };
            });
        },
        setExecutionStarted: (id: string) => {
            set((state) => {
                return {
                    execution: {
                        ...state.execution,
                        [id]: {
                            status: "running",
                            result: null,
                            error: undefined,
                            startedAt: Date.now(),
                        },
                    },
                };
            });
        },
        setExecutionFinished: (id: string, result: string | object | null) => {
            set((state) => {
                return {
                    execution: {
                        ...state.execution,
                        [id]: {
                            status: "done",
                            result,
                            error: undefined,
                            startedAt: state.execution[id].startedAt,
                            finishedAt: Date.now(),
                        },
                    },
                };
            });
        },
    }))
);

export default useFlowStore;
