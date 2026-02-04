export type BaseNodeData = {
    title: string;
    subtitle?: string;
    detail?: string;
    badge: string;
    tone: "emerald" | "violet" | "amber" | "sky";
};

export type FlowNodeData = BaseNodeData;

export type PromptNodeData = BaseNodeData & {
    systemPrompt: string;
    userPrompt: string;
    model: string;
    returnJson: boolean;
};

export type NodeData = FlowNodeData | PromptNodeData;

export const toneStyles: Record<FlowNodeData["tone"], string> = {
    emerald: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
    violet: "bg-violet-500/10 text-violet-200 border-violet-500/30",
    amber: "bg-amber-500/10 text-amber-200 border-amber-500/30",
    sky: "bg-sky-500/10 text-sky-200 border-sky-500/30",
};
