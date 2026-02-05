import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface InspectorProps {
    tokenCosts: {
        inputTokens: number;
        outputTokens: number;
        inputCost: number;
        outputCost: number;
        totalCost: number;
    };
}

export const Inspector = ({ tokenCosts }: InspectorProps) => {
    return (
        <aside className="border-l border-border/60 bg-background/70 p-6">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                Inspector
            </h2>
            <div className="mt-5 space-y-4 text-sm text-muted-foreground">
                <Card className="border-border/60 bg-card/70">
                    <CardHeader className="p-4 -mb-6 text-foreground">
                        <CardTitle>gemini-2.5-flash</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Input</span>
                            <span>$0.3/1M</span>
                            <span className="text-muted-foreground">
                                Output
                            </span>
                            <span>$2.5/1M</span>
                        </div>
                    </CardContent>
                    <CardHeader className="p-4 -mb-6">
                        <CardTitle className="text-sm">Token Cost</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                        <div className="space-y-2 pb-2">
                            <p>
                                Input:{" "}
                                {tokenCosts.inputTokens.toLocaleString()} tokens
                                → ${tokenCosts.inputCost.toFixed(4)}
                            </p>
                            <p>
                                Output:{" "}
                                {tokenCosts.outputTokens.toLocaleString()}{" "}
                                tokens → ${tokenCosts.outputCost.toFixed(4)}
                            </p>
                            <p>Total: ${tokenCosts.totalCost.toFixed(4)}</p>
                        </div>
                        <Separator className="my-2 bg-border/60" />
                        {[1, 2, 3, 4, 5].map((pow) => (
                            <div
                                key={pow}
                                className="flex items-center justify-between"
                            >
                                <span>{10 ** pow} api calls</span>
                                <span>
                                    $
                                    {(
                                        tokenCosts.totalCost *
                                        10 ** pow
                                    ).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </aside>
    );
};
