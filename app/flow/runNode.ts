import axios from "axios";
import type { NodeData, PromptNodeData } from "../components/flow/types";
import type { Edge, Node } from "reactflow";

export async function runNode(
    node: Node<NodeData>,
    previousResult: unknown,
    inboundEdge: Edge | undefined,
    setHandleData: (id: string, handleId: string, value: string) => void
): Promise<unknown> {
    switch (node.type) {
        case "promptNode":
            const config = node.data as PromptNodeData;

            const inboundHandle = inboundEdge?.targetHandle;
            const isSystemPromptProvided = inboundHandle === "systemPrompt";
            const isUserPromptProvided = inboundHandle === "userPrompt";
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

            if (inboundHandle) {
                setHandleData(node.id, inboundHandle, normalizedPrevious);
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
