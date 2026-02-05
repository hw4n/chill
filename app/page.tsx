"use client";

import { useCallback, useRef, useState } from "react";
import { addEdge, type Connection, type Node } from "reactflow";
import "reactflow/dist/style.css";

import { FlowStoreState, useFlowStore } from "./store/flowStore";
import { useShallow } from "zustand/react/shallow";
import { createsCycle } from "./utils/graphUtils";
import { useTokenCosts } from "./hooks/useTokenCosts";
import { useFlowNodes } from "./hooks/useFlowNodes";
import { useFlowExecution } from "./hooks/useFlowExecution";
import { useFlowExport } from "./hooks/useFlowExport";
import { FlowHeader } from "./components/layout/FlowHeader";
import { NodeLibrary } from "./components/layout/NodeLibrary";
import { FlowCanvas } from "./components/layout/FlowCanvas";
import { Inspector } from "./components/layout/Inspector";

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

    // Custom hooks for business logic
    const tokenCosts = useTokenCosts(execution);

    const { addPromptNode, handleCopyNode, handleDeleteNode } = useFlowNodes({
        nodes,
        edges,
        addNode,
        setNodes,
        setEdges,
        contextMenu,
        setContextMenu,
    });

    const { runFlow } = useFlowExecution({
        nodes,
        edges,
        setHandleData,
        setExecutionStarted,
        setExecutionFinished,
        setExecution,
        resetExecutionStatuses,
    });

    const { exportFlow } = useFlowExport({ nodes, edges });

    // ReactFlow connection handler
    const onConnect = useCallback(
        (connection: Connection) => {
            if (createsCycle(connection, edges)) {
                return;
            }
            setEdges(addEdge(connection, edges));
        },
        [edges, setEdges]
    );

    // Context menu handlers
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

    return (
        <div className="min-h-screen bg-background text-foreground">
            <FlowHeader onRunFlow={runFlow} onExportFlow={exportFlow} />

            <div className="grid h-[calc(100vh-4rem)] grid-cols-[260px_1fr_320px]">
                <NodeLibrary onAddPromptNode={addPromptNode} />

                <FlowCanvas
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeContextMenu={onNodeContextMenu}
                    onPaneContextMenu={onPaneContextMenu}
                    onPaneClick={closeContextMenu}
                    flowBoundsRef={flowBoundsRef}
                    contextMenu={contextMenu}
                    onCopyNode={handleCopyNode}
                    onDeleteNode={handleDeleteNode}
                    onCloseContextMenu={closeContextMenu}
                />

                <Inspector tokenCosts={tokenCosts} />
            </div>
        </div>
    );
}
