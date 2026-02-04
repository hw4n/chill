"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    MiniMap,
    type Connection,
    type Edge,
    type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import FlowNode from "./components/flow/FlowNode";
import PromptNode from "./components/flow/PromptNode";
import type { NodeData } from "./components/flow/types";
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
import { FlowStoreState, useFlowStore } from "./store/flowStore";
import { runNode } from "./flow/runNode";
import { useShallow } from "zustand/react/shallow";

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

const selector = (state: FlowStoreState) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    setNodes: state.setNodes,
    addNode: state.addNode,
    setEdges: state.setEdges,
    setHandleData: state.setHandleData,
    setExecution: state.setExecution,
    setExecutionStarted: state.setExecutionStarted,
    setExecutionFinished: state.setExecutionFinished,
    resetExecutionStatuses: state.resetExecutionStatuses,
});

export default function Home() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        setNodes,
        addNode,
        setEdges,
        setHandleData,
        setExecution,
        setExecutionStarted,
        setExecutionFinished,
        resetExecutionStatuses,
    } = useFlowStore(useShallow(selector));
    const flowBoundsRef = useRef<HTMLDivElement | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        id: string;
        x: number;
        y: number;
    } | null>(null);

    const addPromptNode = useCallback(() => {
        const id = `prompt-${Date.now()}`;
        const offset = nodes.length * 40;
        addNode({
            id,
            type: "promptNode",
            position: { x: -120 + offset, y: 80 + offset },
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
        });
    }, [addNode, nodes.length]);

    const onConnect = useCallback(
        (connection: Connection) => {
            if (createsCycle(connection, edges)) {
                return;
            }

            setEdges(addEdge(connection, edges));
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

    const handleCopyNode = useCallback(() => {
        if (!contextMenu) {
            return;
        }
        const targetNode = nodes.find((node) => node.id === contextMenu.id);
        if (!targetNode) {
            return;
        }
        addNode({
            ...targetNode,
            id: `${targetNode.id}-${Date.now()}`,
            position: {
                x: targetNode.position.x + 100,
                y: targetNode.position.y + 100,
            },
        });
    }, [contextMenu, nodes, addNode]);

    const handleDeleteNode = useCallback(() => {
        if (!contextMenu) {
            return;
        }
        const targetId = contextMenu.id;
        setNodes(nodes.filter((node) => node.id !== targetId));
        setEdges(
            edges.filter(
                (edge) => edge.source !== targetId && edge.target !== targetId
            )
        );
        setContextMenu(null);
    }, [contextMenu, edges, nodes, setEdges, setNodes]);

    const runFlow = useCallback(async () => {
        const nodesById = new Map<string, Node<NodeData>>(
            nodes.map((node) => [node.id, node])
        );
        const adjacency = new Map<string, string[]>();
        const incomingByTarget = new Map<string, string[]>();
        const remainingDeps = new Map<string, number>();
        const resultByNode = new Map<string, unknown>();

        nodes.forEach((node) => {
            remainingDeps.set(node.id, 0);
            adjacency.set(node.id, []);
            incomingByTarget.set(node.id, []);
        });

        edges.forEach((edge) => {
            const list = adjacency.get(edge.source) ?? [];
            adjacency.set(edge.source, [...list, edge.target]);

            const incoming = incomingByTarget.get(edge.target) ?? [];
            incomingByTarget.set(edge.target, [...incoming, edge.source]);

            remainingDeps.set(
                edge.target,
                (remainingDeps.get(edge.target) ?? 0) + 1
            );
        });

        const ready: string[] = [];
        const enqueued = new Set<string>();
        const enqueue = (nodeId: string) => {
            if (enqueued.has(nodeId)) {
                return;
            }
            enqueued.add(nodeId);
            ready.push(nodeId);
        };

        remainingDeps.forEach((count, nodeId) => {
            if (count === 0) {
                enqueue(nodeId);
            }
        });

        if (ready.length === 0) {
            nodes.forEach((node) => enqueue(node.id));
        }

        console.log(
            `%c [RUN FLOW] ready: ${ready.join(", ")}`,
            "color: #bada55; font-size: 14px;"
        );

        resetExecutionStatuses();

        let aborted = false;

        const runOne = async (nodeId: string) => {
            const node = nodesById.get(nodeId);
            if (!node) {
                return { nodeId, status: "skipped" as const, result: null };
            }

            const inboundEdges = edges.filter((edge) => edge.target === nodeId);

            const startedAt = Date.now();
            setExecutionStarted(nodeId);
            try {
                const result = await runNode(
                    node,
                    inboundEdges,
                    resultByNode,
                    setHandleData
                );
                const executionResult =
                    result === null || result === undefined
                        ? null
                        : typeof result === "string" ||
                          typeof result === "object"
                        ? result
                        : String(result);
                setExecutionFinished(nodeId, executionResult);
                resultByNode.set(nodeId, result);
                return { nodeId, status: "done" as const, result };
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                setExecution(nodeId, {
                    status: "error",
                    result: null,
                    error: message,
                    startedAt,
                    finishedAt: Date.now(),
                });
                return { nodeId, status: "error" as const, result: message };
            }
        };

        const running = new Map<
            string,
            Promise<{
                nodeId: string;
                status: "done" | "error" | "skipped";
                result: unknown;
            }>
        >();

        while (ready.length > 0 || running.size > 0) {
            while (!aborted && ready.length > 0) {
                const nodeId = ready.shift();
                if (!nodeId) {
                    continue;
                }
                const task = runOne(nodeId);
                running.set(nodeId, task);
            }

            if (running.size === 0) {
                break;
            }

            const finished = await Promise.race(running.values());
            running.delete(finished.nodeId);

            if (finished.status === "error") {
                aborted = true;
                continue;
            }

            const nextIds = adjacency.get(finished.nodeId) ?? [];
            nextIds.forEach((nextId) => {
                const nextCount = (remainingDeps.get(nextId) ?? 0) - 1;
                remainingDeps.set(nextId, nextCount);
                if (nextCount !== 0 || aborted) {
                    return;
                }
                const incoming = incomingByTarget.get(nextId) ?? [];
                const allInputsReady = incoming.every((sourceId) =>
                    resultByNode.has(sourceId)
                );
                if (allInputsReady) {
                    enqueue(nextId);
                }
            });
        }

        if (aborted && running.size > 0) {
            await Promise.allSettled(running.values());
        }
    }, [
        edges,
        nodes,
        setHandleData,
        setExecutionStarted,
        setExecutionFinished,
        setExecution,
        resetExecutionStatuses,
    ]);

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
                                className={`border-border/60 bg-card/70 ${
                                    item.name === "Prompt"
                                        ? "cursor-pointer transition hover:border-border hover:bg-card"
                                        : ""
                                }`}
                                onClick={
                                    item.name === "Prompt"
                                        ? addPromptNode
                                        : undefined
                                }
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
                                onClick={handleCopyNode}
                                variant="default"
                            >
                                Copy node
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={handleDeleteNode}
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
