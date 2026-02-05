import { useMemo } from "react";
import type { FlowStoreState } from "../store/flowStore";

export const useTokenCosts = (execution: FlowStoreState["execution"]) => {
    return useMemo(() => {
        const totals = Object.values(execution).reduce(
            (acc, current) => {
                acc.input += current.inputTokens ?? 0;
                acc.output += current.outputTokens ?? 0;
                return acc;
            },
            { input: 0, output: 0 }
        );
        const inputCost = (totals.input / 1_000_000) * 0.3;
        const outputCost = (totals.output / 1_000_000) * 2.5;
        return {
            inputTokens: totals.input,
            outputTokens: totals.output,
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
        };
    }, [execution]);
};
