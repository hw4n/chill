import { useMemo } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type NodeTypes,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
} from "reactflow";
import { Badge } from "@/components/ui/badge";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import FlowNode from "../flow/FlowNode";
import PromptNode from "../flow/PromptNode";
import type { NodeData } from "../flow/types";

interface FlowCanvasProps {
    nodes: Node<NodeData>[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    onNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
    onPaneContextMenu: (event: React.MouseEvent) => void;
    onPaneClick: () => void;
    flowBoundsRef: React.RefObject<HTMLDivElement | null>;
    contextMenu: { id: string; x: number; y: number } | null;
    onCopyNode: () => void;
    onDeleteNode: () => void;
    onCloseContextMenu: () => void;
}

export const FlowCanvas = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeContextMenu,
    onPaneContextMenu,
    onPaneClick,
    flowBoundsRef,
    contextMenu,
    onCopyNode,
    onDeleteNode,
    onCloseContextMenu,
}: FlowCanvasProps) => {
    const nodeTypes: NodeTypes = useMemo(
        () => ({ flowNode: FlowNode, promptNode: PromptNode }),
        []
    );

    return (
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
                        onPaneClick={onPaneClick}
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
                        Stage: Draft · {nodes.length} nodes · {edges.length}{" "}
                        edges
                    </Badge>
                </section>
            </ContextMenuTrigger>
            {contextMenu && (
                <ContextMenuContent
                    className="w-44 border-border/60 bg-popover text-popover-foreground shadow-xl shadow-black/20"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDownOutside={onCloseContextMenu}
                    onEscapeKeyDown={onCloseContextMenu}
                >
                    <ContextMenuItem onClick={onCopyNode} variant="default">
                        Copy node
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={onDeleteNode}
                        variant="destructive"
                    >
                        Delete node
                    </ContextMenuItem>
                </ContextMenuContent>
            )}
        </ContextMenu>
    );
};
