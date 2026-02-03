"use client";

import { useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
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
import { Textarea } from "../../../components/ui/textarea";
import { toneStyles, type PromptNodeData } from "./types";

const modelOptions = [
    { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
    { value: "gpt-4.1", label: "gpt-4.1" },
    { value: "gpt-4o-mini", label: "gpt-4o-mini" },
    { value: "gpt-4o", label: "gpt-4o" },
    { value: "o3-mini", label: "o3-mini" },
];

export default function PromptNode({ data }: NodeProps<PromptNodeData>) {
    const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt);
    const [userPrompt, setUserPrompt] = useState(data.userPrompt);
    const [model, setModel] = useState("gpt-4.1-mini");
    const modelAnchor = useComboboxAnchor();

    return (
        <Card className="min-w-[280px] border-border/60 bg-card/90 text-card-foreground shadow-lg shadow-black/20 backdrop-blur">
            <Handle
                type="source"
                position={Position.Right}
                className="h-3! w-3! border-2! border-white! bg-white!"
            />
            <CardHeader className="flex-row items-start justify-between space-y-0 p-4 pb-2">
                <CardTitle className="text-sm font-semibold">
                    {data.title}
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
                    value={model}
                    onValueChange={(value) => setModel(value ?? "")}
                >
                    <div ref={modelAnchor}>
                        <ComboboxInput
                            placeholder="Select model"
                            className="bg-background/60 text-xs"
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
            </CardContent>
            <CardContent className="space-y-3 p-4 pl-0 pt-0 text-xs text-muted-foreground">
                <div className="relative pl-4">
                    <Handle
                        id="system"
                        type="target"
                        position={Position.Left}
                        className="absolute -left-2 top-1 h-3! w-3! border-2! border-white! bg-white!"
                    />
                    <p className="text-[11px] uppercase text-muted-foreground">
                        System
                    </p>
                    <Textarea
                        value={systemPrompt}
                        onChange={(event) =>
                            setSystemPrompt(event.target.value)
                        }
                        className="mt-2 h-24 resize-none bg-background/60 text-xs"
                    />
                </div>
                <div className="relative pl-4">
                    <Handle
                        id="user"
                        type="target"
                        position={Position.Left}
                        className="absolute -left-2 top-1 h-3! w-3! border-2! border-white! bg-white!"
                    />
                    <p className="text-[11px] uppercase text-muted-foreground">
                        User
                    </p>
                    <Textarea
                        value={userPrompt}
                        onChange={(event) => setUserPrompt(event.target.value)}
                        className="mt-2 h-20 resize-none bg-background/60 text-xs"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
