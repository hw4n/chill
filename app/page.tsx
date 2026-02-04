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
import type { NodeData, PromptNodeData } from "./components/flow/types";
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
    execution: state.execution,
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
        execution,
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

    const tokenCosts = useMemo(() => {
        const totals = Object.values(execution).reduce(
            (acc, current) => {
                acc.input += current.inputTokens ?? 0;
                acc.output += current.outputTokens ?? 0;
                return acc;
            },
            { input: 0, output: 0 }
        );
        const inputCost = (totals.input / 1_000_000) * 0.3;
        const outputCost = (totals.output / 1_000_000) * 2.5;
        return {
            inputTokens: totals.input,
            outputTokens: totals.output,
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
        };
    }, [execution]);

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

    const buildExecutionPlan = useCallback(() => {
        const nodesById = new Map<string, Node<NodeData>>(
            nodes.map((node) => [node.id, node])
        );
        const adjacency = new Map<string, string[]>();
        const incomingByTarget = new Map<string, string[]>();
        const remainingDeps = new Map<string, number>();

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
        remainingDeps.forEach((count, nodeId) => {
            if (count === 0) {
                ready.push(nodeId);
            }
        });

        if (ready.length === 0) {
            nodes.forEach((node) => ready.push(node.id));
        }

        return {
            nodesById,
            adjacency,
            incomingByTarget,
            remainingDeps,
            ready,
        };
    }, [edges, nodes]);

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
        const { nodesById, adjacency, incomingByTarget, remainingDeps, ready } =
            buildExecutionPlan();
        const resultByNode = new Map<string, unknown>();

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
                    result?.ok === false ? result.error : result?.output;
                setExecutionFinished(
                    nodeId,
                    typeof executionResult === "string" ||
                        typeof executionResult === "object" ||
                        executionResult === null
                        ? executionResult
                        : String(executionResult),
                    result?.inputTokens || -1,
                    result?.outputTokens || -1
                );
                resultByNode.set(nodeId, executionResult);
                return {
                    nodeId,
                    status: "done" as const,
                    result: executionResult,
                };
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

        const queue = [...ready];
        const enqueued = new Set<string>(ready);
        const enqueue = (nodeId: string) => {
            if (enqueued.has(nodeId)) {
                return;
            }
            enqueued.add(nodeId);
            queue.push(nodeId);
        };

        while (queue.length > 0 || running.size > 0) {
            while (!aborted && queue.length > 0) {
                const nodeId = queue.shift();
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
        buildExecutionPlan,
        edges,
        setHandleData,
        setExecutionStarted,
        setExecutionFinished,
        setExecution,
        resetExecutionStatuses,
    ]);

    const exportFlow = useCallback(async () => {
        // Build adjacency and in-degree for topological sort
        const adjacency = new Map<string, string[]>();
        const inDegree = new Map<string, number>();

        nodes.forEach((node) => {
            adjacency.set(node.id, []);
            inDegree.set(node.id, 0);
        });

        edges.forEach((edge) => {
            const targets = adjacency.get(edge.source) ?? [];
            adjacency.set(edge.source, [...targets, edge.target]);
            inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
        });

        // Topological sort into levels (for parallel execution)
        const levels: string[][] = [];
        const remaining = new Map(inDegree);
        let queue: string[] = [];

        // Find all entry points (nodes with no incoming edges)
        inDegree.forEach((degree, nodeId) => {
            if (degree === 0) queue.push(nodeId);
        });

        if (queue.length === 0) {
            queue = nodes.map((n) => n.id);
        }

        while (queue.length > 0) {
            levels.push([...queue]);
            const nextQueue: string[] = [];

            queue.forEach((nodeId) => {
                const neighbors = adjacency.get(nodeId) ?? [];
                neighbors.forEach((neighbor) => {
                    const newDegree = (remaining.get(neighbor) ?? 0) - 1;
                    remaining.set(neighbor, newDegree);
                    if (newDegree === 0) {
                        nextQueue.push(neighbor);
                    }
                });
            });

            queue = nextQueue;
        }

        // Find entry points and sinks
        const entryPoints = levels[0] || [];
        const sinks = nodes
            .map((n) => n.id)
            .filter((id) => (adjacency.get(id) ?? []).length === 0);

        // Build minimal node data
        const minimalNodes = nodes.map((node) => {
            const data = node.data as PromptNodeData;
            let systemPrompt = data.systemPrompt || "";

            // Bake returnJson into systemPrompt
            if (data.returnJson) {
                systemPrompt +=
                    "\n\nReturn the response as single line JSON. You must not include any other text such as markdown or formatting.";
            }

            return {
                id: node.id,
                model: data.model || "gemini-2.5-flash",
                systemPrompt,
                parseJson: data.returnJson || false,
            };
        });

        // Simplify edges (only connection info)
        const minimalEdges = edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle || null,
            targetHandle: edge.targetHandle || null,
        }));

        const serializedNodes = JSON.stringify(minimalNodes, null, 2);
        const serializedEdges = JSON.stringify(minimalEdges, null, 2);
        const serializedLevels = JSON.stringify(levels, null, 2);
        const serializedEntryPoints = JSON.stringify(entryPoints, null, 2);
        const serializedSinks = JSON.stringify(sinks, null, 2);

        const template = `/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * 
 * This API route was automatically generated from LLM Flow Studio.
 * 
 * INPUT FORMAT:
 * POST request body should contain:
 * {
 *   "inputs": {
 *     "<entry-node-id>": "Your input text here",
 *     // Add more entries if you have multiple entry points
 *   }
 * }
 * 
 * For single entry point (most common):
 * {
 *   "inputs": {
 *     "${entryPoints[0] || "node-id"}": "Your prompt or question"
 *   }
 * }
 * 
 * OUTPUT FORMAT:
 * Response will be:
 * {
 *   "ok": true,
 *   "output": "Final result" // or { "node1": result1, "node2": result2 } if multiple sinks
 * }
 * 
 * Or on error:
 * {
 *   "ok": false,
 *   "error": "Error message"
 * }
 */

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const nodes = ${serializedNodes};
const edges = ${serializedEdges};
const levels = ${serializedLevels};
const entryPoints = ${serializedEntryPoints};
const sinks = ${serializedSinks};

const nodesById = new Map(nodes.map((n) => [n.id, n]));

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const inputs = body?.inputs ?? {};

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const results = new Map();

  try {
    // Execute level by level (parallel within each level)
    for (const level of levels) {
      const tasks = level.map(async (nodeId) => {
        const node = nodesById.get(nodeId);
        if (!node) return;

        // Gather inputs from incoming edges
        const incomingEdges = edges.filter((e) => e.target === nodeId);
        let userPrompt = "";

        if (incomingEdges.length === 0) {
          // Entry point: use provided input
          userPrompt = inputs[nodeId] ?? "";
        } else {
          // Combine inputs from source nodes
          const inputValues = incomingEdges.map((edge) => {
            const sourceResult = results.get(edge.source);
            if (!sourceResult) return "";
            
            // Handle multiple outputs via sourceHandle
            if (edge.sourceHandle && typeof sourceResult === "object") {
              return sourceResult[edge.sourceHandle] ?? "";
            }
            
            return typeof sourceResult === "string" 
              ? sourceResult 
              : JSON.stringify(sourceResult);
          });

          userPrompt = inputValues.filter(Boolean).join("\\n\\n");
        }

        // Call LLM
        const response = await ai.models.generateContent({
          model: node.model,
          contents: userPrompt,
          config: {
            systemInstruction: node.systemPrompt,
          },
        });

        if (!response?.text) {
          throw new Error(\`No response from model at node \${nodeId}\`);
        }

        let output = response.text;

        // Parse JSON if needed
        if (node.parseJson) {
          try {
            output = JSON.parse(response.text);
          } catch {
            throw new Error(\`Failed to parse JSON at node \${nodeId}\`);
          }
        }

        results.set(nodeId, output);
      });

      await Promise.all(tasks);
    }

    // Build final output from sink nodes
    const output = {};
    sinks.forEach((sinkId) => {
      output[sinkId] = results.get(sinkId);
    });

    return NextResponse.json({
      ok: true,
      output: sinks.length === 1 ? output[sinks[0]] : output,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
`;

        try {
            await navigator.clipboard.writeText(template);
            console.log(
                "%c [EXPORT FLOW] API route copied to clipboard",
                "color: #bada55; font-size: 14px;"
            );
        } catch {
            console.log(
                "%c [EXPORT FLOW] Clipboard unavailable, showing code below",
                "color: #bada55; font-size: 14px;"
            );
            console.log(template);
        }
    }, [edges, nodes]);

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
                    <Button size="sm" onClick={exportFlow}>
                        Export Flow (Next.js route.ts)
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
                            <CardHeader className="p-4 -mb-6 text-foreground">
                                <CardTitle>gemini-2.5-flash</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">
                                        Input
                                    </span>
                                    <span>$0.3/1M</span>
                                    <span className="text-muted-foreground">
                                        Output
                                    </span>
                                    <span>$2.5/1M</span>
                                </div>
                            </CardContent>
                            <CardHeader className="p-4 -mb-6">
                                <CardTitle className="text-sm">
                                    Token Cost
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                                <div className="space-y-2 pb-2">
                                    <p>
                                        Input:{" "}
                                        {tokenCosts.inputTokens.toLocaleString()}{" "}
                                        tokens → $
                                        {tokenCosts.inputCost.toFixed(4)}
                                    </p>
                                    <p>
                                        Output:{" "}
                                        {tokenCosts.outputTokens.toLocaleString()}{" "}
                                        tokens → $
                                        {tokenCosts.outputCost.toFixed(4)}
                                    </p>
                                    <p>
                                        Total: $
                                        {tokenCosts.totalCost.toFixed(4)}
                                    </p>
                                </div>
                                <Separator className="my-2 bg-border/60" />
                                {[1, 2, 3, 4, 5].map((pow) => (
                                    <div
                                        key={pow}
                                        className="flex items-center justify-between"
                                    >
                                        <span>{10 ** pow} api calls</span>
                                        <span>
                                            $
                                            {(
                                                tokenCosts.totalCost *
                                                10 ** pow
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </aside>
            </div>
        </div>
    );
}
