import axios from "axios";
import { PromptNodeData } from "../components/flow/types";
import type { StoredNode } from "../store/flowStore";
import { useFlowStore } from "../store/flowStore";
import type { Edge } from "reactflow";

export async function runNode(
    node: StoredNode,
    previousResult: unknown,
    inboundEdge: Edge | undefined
): Promise<unknown> {
    switch (node.type) {
        case "promptNode":
            const config = node.config as PromptNodeData;
            const { setNodes } = useFlowStore.getState();

            const isSystemPromptProvided =
                inboundEdge?.targetHandle === "system";
            const isUserPromptProvided = inboundEdge?.targetHandle === "user";
            const normalizedPrevious =
                previousResult === null || previousResult === undefined
                    ? ""
                    : typeof previousResult === "string"
                    ? previousResult
                    : (() => {
                          try {
                              return JSON.stringify(previousResult, null, 2);
                          } catch {
                              return String(previousResult);
                          }
                      })();

            if (isSystemPromptProvided) {
                setNodes((nodes) =>
                    nodes.map((existing) =>
                        existing.id === node.id
                            ? {
                                  ...existing,
                                  data: {
                                      ...existing.data,
                                      systemPrompt: normalizedPrevious,
                                  },
                              }
                            : existing
                    )
                );
            }

            if (isUserPromptProvided) {
                setNodes((nodes) =>
                    nodes.map((existing) =>
                        existing.id === node.id
                            ? {
                                  ...existing,
                                  data: {
                                      ...existing.data,
                                      userPrompt: normalizedPrevious,
                                  },
                              }
                            : existing
                    )
                );
            }

            const response = await axios.post("/api/llm", {
                // model: config.model,
                systemPrompt: isSystemPromptProvided
                    ? normalizedPrevious
                    : config.systemPrompt,
                userPrompt: isUserPromptProvided
                    ? normalizedPrevious
                    : config.userPrompt,
                returnAsJson: config.returnJson,
            });

            return response.data.output;
        default:
            return previousResult;
    }
}
