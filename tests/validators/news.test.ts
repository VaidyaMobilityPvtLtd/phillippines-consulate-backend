import { describe, expect, it } from "vitest";
import { createNewsSchema } from "../../src/validators/news.js";

describe("createNewsSchema", () => {
  it("accepts a valid news item", () => {
    const result = createNewsSchema.safeParse({
      slug: "office-hours-reminder",
      title: "Consular office hours reminder",
      date: "2026-01-15",
      category: "Notice",
      summary: "Hours reminder",
      body: ["Paragraph one"],
      published: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid category", () => {
    const result = createNewsSchema.safeParse({
      slug: "x",
      title: "t",
      date: "2026-01-15",
      category: "Other",
      summary: "s",
      body: ["b"],
    });
    expect(result.success).toBe(false);
  });
});
