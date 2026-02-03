import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type LlmRequest = {
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    returnAsJson?: boolean;
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
                    ? "Return the response as single line JSON."
                    : ""),
        },
    });

    if (!response?.text) {
        return NextResponse.json(
            { error: "No response from model." },
            { status: 400 }
        );
    }

    if (!body.returnAsJson) {
        return NextResponse.json({
            ok: true,
            output: response.text,
        });
    }

    try {
        const parsed = JSON.parse(response.text);

        return NextResponse.json({
            ok: true,
            output: parsed,
        });
    } catch {
        return NextResponse.json(
            {
                error: "Error parsing JSON response from model.",
                raw: response.text,
            },
            { status: 400 }
        );
    }
}
