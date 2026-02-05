import { useCallback } from "react";
import type { Node, Edge } from "reactflow";
import type { NodeData } from "../components/flow/types";
import { runNode } from "../flow/runNode";

interface UseFlowExecutionProps {
    nodes: Node<NodeData>[];
    edges: Edge[];
    setHandleData: (nodeId: string, handleId: string, value: string) => void;
    setExecutionStarted: (nodeId: string) => void;
    setExecutionFinished: (
        nodeId: string,
        result: string | object | null,
        inputTokens: number,
        outputTokens: number
    ) => void;
    setExecution: (
        nodeId: string,
        execution: {
            status: "idle" | "running" | "done" | "error";
            result: string | object | null;
            error?: string;
            startedAt: number;
            finishedAt: number;
            inputTokens?: number;
            outputTokens?: number;
        }
    ) => void;
    resetExecutionStatuses: () => void;
}

export const useFlowExecution = ({
    nodes,
    edges,
    setHandleData,
    setExecutionStarted,
    setExecutionFinished,
    setExecution,
    resetExecutionStatuses,
}: UseFlowExecutionProps) => {
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

    return { runFlow };
};
