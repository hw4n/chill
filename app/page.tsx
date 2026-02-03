"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    type Connection,
    type Edge,
    type Node,
    useEdgesState,
    useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

import FlowNode from "./components/flow/FlowNode";
import PromptNode from "./components/flow/PromptNode";
import type { FlowNodeData, PromptNodeData } from "./components/flow/types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "../components/ui/context-menu";
import { useFlowStore } from "./store/flowStore";

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
        },
    },
];

const edgeStyle = { stroke: "#ffffff" };

const createsCycle = (connection: Connection, edges: Edge[]) => {
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

const initialEdges: Edge[] = [
    {
        id: "e-prompt-prompt",
        source: "prompt",
        target: "prompt-2",
        targetHandle: "user",
        style: edgeStyle,
    },
];

export default function Home() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const flowBoundsRef = useRef<HTMLDivElement | null>(null);
    const nodesById = useFlowStore((state) => state.nodes);
    const setFromFlow = useFlowStore((state) => state.setFromFlow);
    const [contextMenu, setContextMenu] = useState<{
        id: string;
        x: number;
        y: number;
    } | null>(null);
    useEffect(() => {
        setFromFlow(nodes, edges);
    }, [edges, nodes, setFromFlow]);

    const onConnect = useCallback(
        (connection: Connection) => {
            if (createsCycle(connection, edges)) {
                return;
            }

            setEdges((eds) =>
                addEdge(
                    { ...connection, animated: true, style: edgeStyle },
                    eds
                )
            );
        },
        [edges, setEdges]
    );

    const nodeTypes = useMemo(
        () => ({ flowNode: FlowNode, promptNode: PromptNode }),
        []
    );

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            const bounds = flowBoundsRef.current?.getBoundingClientRect();
            const x = bounds ? event.clientX - bounds.left : event.clientX;
            const y = bounds ? event.clientY - bounds.top : event.clientY;

            setContextMenu({ id: node.id, x, y });
        },
        []
    );

    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu(null);
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const deleteNode = useCallback(() => {
        if (!contextMenu) {
            return;
        }
        const targetId = contextMenu.id;
        setNodes((current) => current.filter((node) => node.id !== targetId));
        setEdges((current) =>
            current.filter(
                (edge) => edge.source !== targetId && edge.target !== targetId
            )
        );
        setContextMenu(null);
    }, [contextMenu, setEdges, setNodes]);

    const runFlow = useCallback(() => {
        const route: string[] = [];

        const visited = new Set<string>();
        const stack = ["prompt"];

        while (stack.length) {
            const currentId = stack.pop();
            if (!currentId || visited.has(currentId)) {
                continue;
            }

            const currentNode = nodesById[currentId];
            if (!currentNode) {
                continue;
            }

            visited.add(currentId);
            route.push(currentId);

            if (currentNode.nextIds.length > 0) {
                stack.push(...currentNode.nextIds);
            }
        }

        console.log(
            `%c [RUN FLOW] ${route.join(" → ")}`,
            "color: #bada55; font-size: 14px;"
        );
    }, [nodesById]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur">
                <div>
                    <p className="text-sm font-semibold">LLM Flow Studio</p>
                    <p className="text-xs text-muted-foreground">
                        Multi-step prompt playground
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button size="sm">Save Draft</Button>
                    <Button size="sm" onClick={runFlow}>
                        Run Flow
                    </Button>
                </div>
            </header>

            <div className="grid h-[calc(100vh-4rem)] grid-cols-[260px_1fr_320px]">
                <aside className="border-r border-border/60 bg-background/70 p-5 overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                            Node Library
                        </h2>
                        <Badge variant="outline" className="border-border/60">
                            5 types
                        </Badge>
                    </div>
                    <div className="mt-5 space-y-3">
                        {[
                            { name: "Prompt", desc: "System + user input" },
                            { name: "Router", desc: "Branching logic" },
                            { name: "LLM", desc: "Model invocation" },
                            { name: "Tool", desc: "External call" },
                            { name: "Output", desc: "Formatter + stream" },
                        ].map((item) => (
                            <Card
                                key={item.name}
                                size="sm"
                                className="border-border/60 bg-card/70"
                            >
                                <CardHeader>
                                    <CardTitle>{item.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-muted-foreground">
                                    {item.desc}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Separator className="my-6 bg-border/60" />
                    <Card size="sm" className="border-border/60 bg-card/70">
                        <CardHeader>
                            <CardTitle>Flow Tips</CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground">
                            Drag nodes to rewire, connect outputs to inputs, and
                            preview the response trace.
                        </CardContent>
                    </Card>
                </aside>

                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <section className="relative" ref={flowBoundsRef}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeContextMenu={onNodeContextMenu}
                                onPaneContextMenu={onPaneContextMenu}
                                onPaneClick={closeContextMenu}
                                nodeTypes={nodeTypes}
                                fitView
                                className="bg-background"
                            >
                                <MiniMap
                                    className="bg-card/80!"
                                    nodeColor={() => "var(--muted-foreground)"}
                                    maskColor="color-mix(in oklch, var(--background) 70%, transparent)"
                                />
                                <Controls className="bg-card/80! text-foreground!" />
                                <Background
                                    gap={24}
                                    color="oklch(0.52 0.004 286.32)"
                                />
                            </ReactFlow>
                            <Badge
                                variant="outline"
                                className="absolute left-6 top-6 border-border/60 bg-background/80 text-xs text-muted-foreground"
                            >
                                Stage: Draft · {nodes.length} nodes ·{" "}
                                {edges.length} edges
                            </Badge>
                        </section>
                    </ContextMenuTrigger>
                    {contextMenu && (
                        <ContextMenuContent
                            className="w-44 border-border/60 bg-popover text-popover-foreground shadow-xl shadow-black/20"
                            onClick={(event) => event.stopPropagation()}
                            onPointerDownOutside={() => setContextMenu(null)}
                            onEscapeKeyDown={() => setContextMenu(null)}
                        >
                            <ContextMenuItem
                                onClick={deleteNode}
                                variant="destructive"
                            >
                                Delete node
                            </ContextMenuItem>
                        </ContextMenuContent>
                    )}
                </ContextMenu>

                <aside className="border-l border-border/60 bg-background/70 p-6">
                    <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                        Inspector
                    </h2>
                    <div className="mt-5 space-y-4 text-sm text-muted-foreground">
                        <Card className="border-border/60 bg-card/70">
                            <CardHeader className="p-4 pb-2 text-foreground">
                                <CardTitle>LLM Core</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    gpt-4.1-mini · temperature 0.4
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-2 p-4 pt-0 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Tokens
                                    </span>
                                    <span>1,280</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Latency
                                    </span>
                                    <span>1.2s</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Cost
                                    </span>
                                    <span>$0.008</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-border/60 bg-card/70">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm">
                                    Run Checklist
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                                <ul className="space-y-2">
                                    <li>✓ Prompt validated</li>
                                    <li>✓ Tools connected</li>
                                    <li>• Guardrails pending</li>
                                </ul>
                            </CardContent>
                        </Card>
                        <Button size="sm" className="w-full">
                            Open Trace Viewer
                        </Button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
