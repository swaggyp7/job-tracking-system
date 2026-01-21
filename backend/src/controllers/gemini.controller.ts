import { Request, Response } from "express";
import { getGeminiModel } from "../services/gemini.service";

export async function geminiPing(req: Request, res: Response): Promise<void> {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent("ping");
    const text = result.response.text();
    res.json({ data: { text } });
  } catch (error) {
    res.status(500).json({ error: "Gemini request failed" });
  }
}
