import { Prisma, type SubmissionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import type { CreateFeedbackInput } from "../validators/feedback.js";

export async function createFeedback(input: CreateFeedbackInput) {
  return prisma.feedbackSubmission.create({ data: input });
}

export async function listFeedback() {
  return prisma.feedbackSubmission.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updateFeedbackStatus(id: string, status: SubmissionStatus) {
  try {
    return await prisma.feedbackSubmission.update({
      where: { id },
      data: { status },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "Feedback submission not found");
    }
    throw err;
  }
}
