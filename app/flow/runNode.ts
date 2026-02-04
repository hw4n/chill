import axios from "axios";
import type { NodeData, PromptNodeData } from "../components/flow/types";
import type { Edge, Node } from "reactflow";

type LLMResponse = {
    ok: boolean;
    inputTokens: number;
    outputTokens: number;
    output: unknown;
    error?: string;
};

export async function runNode(
    node: Node<NodeData>,
    inboundEdges: Edge[],
    resultByNode: Map<string, unknown>,
    setHandleData: (id: string, handleId: string, value: string) => void
): Promise<LLMResponse | undefined> {
    switch (node.type) {
        case "promptNode":
            const config = node.data as PromptNodeData;
            const inboundValuesByHandle = new Map<string, string>();
            const normalize = (value: unknown) => {
                if (value === null || value === undefined) {
                    return "";
                }
                if (typeof value === "string") {
                    return value;
                }
                try {
                    return JSON.stringify(value, null, 2);
                } catch {
                    return String(value);
                }
            };

            inboundEdges.forEach((edge) => {
                if (!edge.targetHandle) {
                    return;
                }
                const result = resultByNode.get(edge.source);
                const normalized = normalize(result);
                inboundValuesByHandle.set(edge.targetHandle, normalized);
                setHandleData(node.id, edge.targetHandle, normalized);
            });

            const hasSystemPrompt = inboundValuesByHandle.has("systemPrompt");
            const hasUserPrompt = inboundValuesByHandle.has("userPrompt");

            const response = await axios.post<LLMResponse>("/api/llm", {
                // model: config.model,
                systemPrompt: hasSystemPrompt
                    ? inboundValuesByHandle.get("systemPrompt") ?? ""
                    : config.systemPrompt,
                userPrompt: hasUserPrompt
                    ? inboundValuesByHandle.get("userPrompt") ?? ""
                    : config.userPrompt,
                returnAsJson: config.returnJson,
            });

            return response.data;
        default:
            return undefined;
    }
}
