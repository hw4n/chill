import { useCallback } from "react";
import type { Node, Edge } from "reactflow";
import type { NodeData } from "../components/flow/types";

interface UseFlowNodesProps {
    nodes: Node<NodeData>[];
    edges: Edge[];
    addNode: (node: Node<NodeData>) => void;
    setNodes: (nodes: Node<NodeData>[]) => void;
    setEdges: (edges: Edge[]) => void;
    contextMenu: { id: string; x: number; y: number } | null;
    setContextMenu: (menu: { id: string; x: number; y: number } | null) => void;
}

export const useFlowNodes = ({
    nodes,
    edges,
    addNode,
    setNodes,
    setEdges,
    contextMenu,
    setContextMenu,
}: UseFlowNodesProps) => {
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
    }, [contextMenu, edges, nodes, setEdges, setNodes, setContextMenu]);

    return {
        addPromptNode,
        handleCopyNode,
        handleDeleteNode,
    };
};
