"use client";

import { Handle, Position, type NodeProps } from "reactflow";

import { Badge } from "../../../components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../../components/ui/card";
import { toneStyles, type FlowNodeData } from "./types";

export default function FlowNode({ data }: NodeProps<FlowNodeData>) {
    return (
        <Card className="min-w-[220px] border-border/60 bg-card/90 text-card-foreground shadow-lg shadow-black/20 backdrop-blur">
            <Handle
                type="target"
                position={Position.Left}
                className="h-3! w-3! border-2! border-white! bg-white!"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="h-3! w-3! border-2! border-white! bg-white!"
            />
            <CardHeader className="flex-row items-start justify-between space-y-0 p-4 pb-2">
                <CardTitle className="text-sm font-semibold">
                    {data.title}
                </CardTitle>
                <Badge
                    variant="outline"
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        toneStyles[data.tone]
                    }`}
                >
                    {data.badge}
                </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <p className="text-xs uppercase text-muted-foreground">
                    {data.subtitle}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                    {data.detail}
                </p>
            </CardContent>
        </Card>
    );
}
