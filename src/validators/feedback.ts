import { z } from "zod";

export const createFeedbackSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  subject: z.string().optional(),
  type: z.enum(["Suggestions", "Comments"]).optional().default("Suggestions"),
  message: z.string().optional(),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
