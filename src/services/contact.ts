import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import type { CreateContactInput } from "../validators/contact.js";
import type { SubmissionStatus } from "@prisma/client";

export async function createContact(input: CreateContactInput) {
  return prisma.contactSubmission.create({ data: input });
}

export async function listContacts() {
  return prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" } });
}

export async function updateContactStatus(id: string, status: SubmissionStatus) {
  try {
    return await prisma.contactSubmission.update({
      where: { id },
      data: { status },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "Contact submission not found");
    }
    throw err;
  }
}
