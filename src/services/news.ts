import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import type { CreateNewsInput, UpdateNewsInput } from "../validators/news.js";

function formatNews<T extends { date: Date }>(item: T) {
  return {
    ...item,
    date: item.date.toISOString().slice(0, 10),
  };
}

export async function listPublishedNews() {
  const items = await prisma.news.findMany({
    where: { published: true },
    orderBy: { date: "desc" },
  });
  return items.map(formatNews);
}

export async function getPublishedBySlug(slug: string) {
  const item = await prisma.news.findFirst({
    where: { slug, published: true },
  });
  if (!item) throw new AppError(404, "News item not found");
  return formatNews(item);
}

export async function listAllNews() {
  const items = await prisma.news.findMany({ orderBy: { date: "desc" } });
  return items.map(formatNews);
}

export async function createNews(input: CreateNewsInput) {
  try {
    const item = await prisma.news.create({
      data: {
        ...input,
        date: new Date(input.date),
      },
    });
    return formatNews(item);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "A news item with this slug already exists");
    }
    throw err;
  }
}

export async function updateNews(id: string, input: UpdateNewsInput) {
  try {
    const item = await prisma.news.update({
      where: { id },
      data: {
        ...input,
        ...(input.date ? { date: new Date(input.date) } : {}),
      },
    });
    return formatNews(item);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "News item not found");
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "A news item with this slug already exists");
    }
    throw err;
  }
}

export async function deleteNews(id: string) {
  try {
    await prisma.news.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new AppError(404, "News item not found");
    }
    throw err;
  }
}
