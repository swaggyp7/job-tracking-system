import path from "path";
import dotenv from "dotenv";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env.local") });

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (client) {
    return client;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  client = new GoogleGenerativeAI(apiKey);
  return client;
}

export function getGeminiModel(
  modelName: string = "gemini-flash-latest"
): GenerativeModel {
  return getClient().getGenerativeModel({ model: modelName });
}
