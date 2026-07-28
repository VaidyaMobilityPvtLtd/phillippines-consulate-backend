import { z } from "zod";

export const contactTopicSchema = z.enum([
  "visa",
  "passport",
  "registration",
  "appointment",
  "general",
]);

export const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  topic: contactTopicSchema,
  subject: z.string().min(1),
  message: z.string().min(1),
});

export const updateContactStatusSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
