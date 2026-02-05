import { useCallback } from "react";
import type { Node, Edge } from "reactflow";
import type { PromptNodeData } from "../components/flow/types";
import { toast } from "sonner";

interface UseFlowExportProps {
    nodes: Node[];
    edges: Edge[];
}

export const useFlowExport = ({ nodes, edges }: UseFlowExportProps) => {
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
            toast.success("클립보드에 복사 완료!", {
                description: "Next.js API route가 클립보드에 복사되었습니다.",
            });
            console.log(
                "%c [EXPORT FLOW] API route copied to clipboard",
                "color: #bada55; font-size: 14px;"
            );
        } catch (error) {
            toast.error("복사 실패", {
                description: "클립보드 접근 권한이 없습니다.",
            });
            console.log(
                "%c [EXPORT FLOW] Clipboard unavailable, showing code below",
                "color: #bada55; font-size: 14px;"
            );
            console.log(template);
        }
    }, [edges, nodes]);

    return { exportFlow };
};
