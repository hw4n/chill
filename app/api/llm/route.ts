import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type LlmRequest = {
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    returnAsJson?: boolean;
};

type LLMResponse = {
    ok: boolean;
    inputTokens: number;
    outputTokens: number;
    output: unknown;
    error?: string;
};

export async function POST(request: Request) {
    const body = (await request.json()) as LlmRequest;
    const systemPrompt = body.systemPrompt?.trim();
    const userPrompt = body.userPrompt?.trim();

    if (systemPrompt === undefined || userPrompt === undefined) {
        return NextResponse.json(
            { error: "systemPrompt and userPrompt are required." },
            { status: 400 }
        );
    }

    const model = body.model ?? "gemini-2.5-flash";

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });

    const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
            systemInstruction:
                systemPrompt +
                (body.returnAsJson
                    ? "Return the response as single line JSON. You must not include any other text such as markdown or formatting."
                    : ""),
        },
    });

    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const totalTokens = response.usageMetadata?.totalTokenCount ?? 0;

    if (!response?.text) {
        return NextResponse.json(
            { error: "No response from model." },
            { status: 400 }
        );
    }

    if (!body.returnAsJson) {
        return NextResponse.json<LLMResponse>(
            {
                ok: true,
                inputTokens,
                outputTokens: totalTokens - inputTokens,
                output: response.text,
            },
            { status: 200 }
        );
    }

    try {
        const parsed = JSON.parse(response.text);

        return NextResponse.json<LLMResponse>({
            ok: true,
            inputTokens,
            outputTokens: totalTokens - inputTokens,
            output: parsed,
        });
    } catch {
        return NextResponse.json<LLMResponse>(
            {
                ok: false,
                inputTokens,
                outputTokens: totalTokens - inputTokens,
                output: response.text,
                error: "Error parsing JSON response from model.",
            },
            { status: 400 }
        );
    }
}
