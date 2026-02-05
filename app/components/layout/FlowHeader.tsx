import { Button } from "@/components/ui/button";

interface FlowHeaderProps {
    onRunFlow: () => void;
    onExportFlow: () => void;
}

export const FlowHeader = ({ onRunFlow, onExportFlow }: FlowHeaderProps) => {
    return (
        <header className="flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur">
            <div>
                <p className="text-sm font-semibold">LLM Flow Studio</p>
                <p className="text-xs text-muted-foreground">
                    Multi-step prompt playground
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Button size="sm">Save Draft</Button>
                <Button size="sm" onClick={onRunFlow}>
                    Run Flow
                </Button>
                <Button size="sm" onClick={onExportFlow}>
                    Export Flow (Next.js route.ts)
                </Button>
            </div>
        </header>
    );
};
