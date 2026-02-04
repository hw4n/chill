"use client";

import { useCallback, useMemo } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "reactflow";

import { Badge } from "../../../components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../../components/ui/card";
import {
    Combobox,
    ComboboxContent,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    useComboboxAnchor,
} from "../../../components/ui/combobox";
import { Switch } from "../../../components/ui/switch";
import { Textarea } from "../../../components/ui/textarea";
import { useFlowStore } from "../../store/flowStore";
import { toneStyles, type PromptNodeData } from "./types";

const modelOptions = [{ value: "gemini-2.5-flash", label: "gemini-2.5-flash" }];

export default function PromptNode({ data, id }: NodeProps<PromptNodeData>) {
    const modelAnchor = useComboboxAnchor();
    const { setNodes } = useReactFlow<PromptNodeData>();
    const execution = useFlowStore((state) => state.execution);

    const updateNodeData = useCallback(
        (partial: Partial<PromptNodeData>) => {
            setNodes((nodes) =>
                nodes.map((node) =>
                    node.id === id
                        ? { ...node, data: { ...node.data, ...partial } }
                        : node
                )
            );
        },
        [id, setNodes]
    );

    const executionStatus = useMemo(
        () => execution[id]?.status ?? "idle",
        [execution, id]
    );

    const executionTime = useMemo(() => {
        if (!execution[id]) {
            return "never started";
        }

        if (!execution[id].startedAt || !execution[id].finishedAt) {
            return "running...";
        }

        return `${
            (execution[id].finishedAt - execution[id].startedAt) / 1000
        }s`;
    }, [execution, id]);

    const statusBorderClass = useMemo(() => {
        switch (executionStatus) {
            case "running":
                return "ring-2 ring-blue-500/70";
            case "error":
                return "ring-2 ring-red-500/70";
            case "done":
                return "ring-2 ring-emerald-500/70";
            default:
                return "";
        }
    }, [executionStatus]);

    return (
        <Card
            className={`min-w-[280px] rounded-xl border-border/60 bg-card/90 text-card-foreground shadow-lg shadow-black/20 backdrop-blur ${statusBorderClass}`}
        >
            <CardHeader className="flex-row items-start justify-between space-y-0 p-4 pb-2">
                <CardTitle className="text-sm font-semibold">
                    {data.title}
                    <p className="text-[11px] text-muted-foreground"># {id}</p>
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                            toneStyles[data.tone]
                        }`}
                    >
                        {data.badge}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-xs">
                <p className="text-[11px] uppercase text-muted-foreground">
                    Model
                </p>
                <Combobox
                    value={data.model}
                    onValueChange={(value) => {
                        updateNodeData({ model: value ?? "" });
                    }}
                >
                    <div ref={modelAnchor}>
                        <ComboboxInput
                            placeholder="Select model"
                            className="nodrag bg-background/60 text-xs"
                        />
                    </div>
                    <ComboboxContent anchor={modelAnchor}>
                        <ComboboxList>
                            {modelOptions.map((option) => (
                                <ComboboxItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </ComboboxItem>
                            ))}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/60 px-2 py-1.5">
                    <span className="text-[11px] uppercase text-muted-foreground">
                        Return JSON
                    </span>
                    <Switch
                        checked={data.returnJson}
                        onCheckedChange={(checked) => {
                            updateNodeData({ returnJson: checked });
                        }}
                    />
                </div>
            </CardContent>
            <CardContent className="space-y-3 p-4 pl-0 pt-0 text-xs text-muted-foreground">
                <div className="relative pl-4">
                    <Handle
                        id="systemPrompt"
                        type="target"
                        position={Position.Left}
                        className="absolute -left-2 top-1 h-3! w-3! border-2! border-white! bg-white!"
                    />
                    <p className="text-[11px] uppercase text-muted-foreground">
                        System
                    </p>
                    <Textarea
                        defaultValue={data.systemPrompt}
                        onBlur={(event) => {
                            updateNodeData({
                                systemPrompt: event.target.value,
                            });
                        }}
                        key={`${id}-system-${data.systemPrompt}`}
                        className="nodrag mt-2 h-24 resize-none bg-background/60 text-xs"
                        onWheelCapture={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                    />
                </div>
                <div className="relative pl-4">
                    <Handle
                        id="userPrompt"
                        type="target"
                        position={Position.Left}
                        className="absolute -left-2 top-1 h-3! w-3! border-2! border-white! bg-white!"
                    />
                    <p className="text-[11px] uppercase text-muted-foreground">
                        User
                    </p>
                    <Textarea
                        defaultValue={data.userPrompt}
                        onBlur={(event) => {
                            updateNodeData({
                                userPrompt: event.target.value,
                            });
                        }}
                        key={`${id}-user-${data.userPrompt}`}
                        className="nodrag mt-2 h-20 resize-none bg-background/60 text-xs"
                        onWheelCapture={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                    />
                </div>
                <div className="relative pl-4">
                    <Handle
                        type="source"
                        position={Position.Right}
                        className="absolute -right-2 top-1 h-3! w-3! translate-x-4 translate-y-2 border-2! border-white! bg-white!"
                    />
                    <p className="text-[11px] uppercase text-muted-foreground">
                        Result
                    </p>
                    <Textarea
                        value={(() => {
                            const current = execution[id];
                            if (!current) {
                                return "...";
                            }
                            if (current.status === "running") {
                                return "Running...";
                            }
                            if (current.status === "error") {
                                return `Error: ${
                                    current.error ?? "Unknown error"
                                }`;
                            }
                            if (typeof current.result === "string") {
                                return current.result;
                            }
                            if (current.result) {
                                try {
                                    return JSON.stringify(
                                        current.result,
                                        null,
                                        2
                                    );
                                } catch {
                                    return String(current.result);
                                }
                            }
                            return "";
                        })()}
                        readOnly
                        className="nodrag mt-2 h-20 resize-none bg-background/60 text-xs"
                        onWheelCapture={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                    />
                </div>
                <div className="relative pl-4 text-[11px] text-muted-foreground">
                    Last execution:
                    <p className="text-[11px] pl-2 text-muted-foreground">
                        {executionTime}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
