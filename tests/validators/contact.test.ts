import { describe, expect, it } from "vitest";
import { createContactSchema } from "../../src/validators/contact.js";

describe("createContactSchema", () => {
  it("accepts a valid contact payload", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+977 1 4008801",
      topic: "visa",
      subject: "Tourist visa",
      message: "I need guidance on requirements.",
    });
    expect(result.success).toBe(true);
  });

  it("requires topic", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      subject: "Hi",
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });
});
