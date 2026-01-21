import { geminiPing } from "../../controllers/gemini.controller";
import { getGeminiModel } from "../../services/gemini.service";

jest.mock("../../services/gemini.service", () => ({
  getGeminiModel: jest.fn()
}));

function createRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("geminiPing", () => {
  it("returns text from Gemini", async () => {
    (getGeminiModel as jest.Mock).mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => "pong" }
      })
    });

    const res = createRes();
    await geminiPing({} as any, res);

    expect(res.json).toHaveBeenCalledWith({ data: { text: "pong" } });
  });

  it("handles errors", async () => {
    (getGeminiModel as jest.Mock).mockReturnValue({
      generateContent: jest.fn().mockRejectedValue(new Error("fail"))
    });

    const res = createRes();
    await geminiPing({} as any, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Gemini request failed"
    });
  });
});
