import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface NodeLibraryProps {
    onAddPromptNode: () => void;
}

export const NodeLibrary = ({ onAddPromptNode }: NodeLibraryProps) => {
    const nodeTypes = [
        { name: "Prompt", desc: "System + user input" },
        { name: "Router", desc: "Branching logic" },
        { name: "LLM", desc: "Model invocation" },
        { name: "Tool", desc: "External call" },
        { name: "Output", desc: "Formatter + stream" },
    ];

    return (
        <aside className="border-r border-border/60 bg-background/70 p-5 overflow-y-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                    Node Library
                </h2>
                <Badge variant="outline" className="border-border/60">
                    5 types
                </Badge>
            </div>
            <div className="mt-5 space-y-3">
                {nodeTypes.map((item) => (
                    <Card
                        key={item.name}
                        size="sm"
                        className={`border-border/60 bg-card/70 ${
                            item.name === "Prompt"
                                ? "cursor-pointer transition hover:border-border hover:bg-card"
                                : ""
                        }`}
                        onClick={
                            item.name === "Prompt" ? onAddPromptNode : undefined
                        }
                    >
                        <CardHeader>
                            <CardTitle>{item.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-muted-foreground">
                            {item.desc}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Separator className="my-6 bg-border/60" />
            <Card size="sm" className="border-border/60 bg-card/70">
                <CardHeader>
                    <CardTitle>Flow Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                    Drag nodes to rewire, connect outputs to inputs, and
                    preview the response trace.
                </CardContent>
            </Card>
        </aside>
    );
};
