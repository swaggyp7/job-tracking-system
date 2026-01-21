import { normalizeJobData } from "@/services/jobParser.service";

describe("normalizeJobData", () => {
  it("should trim company and title", () => {
    const input = {
      company: "  Pollard Banknote ",
      title: " Junior Developer "
    };

    const result = normalizeJobData(input);

    expect(result.company).toBe("Pollard Banknote");
    expect(result.title).toBe("Junior Developer");
  });

  it("should handle missing fields safely", () => {
    const result = normalizeJobData({});

    expect(result.company).toBeUndefined();
    expect(result.title).toBeUndefined();
  });
});