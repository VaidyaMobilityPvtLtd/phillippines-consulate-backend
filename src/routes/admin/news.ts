import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { createNewsSchema, updateNewsSchema } from "../../validators/news.js";
import * as newsService from "../../services/news.js";

export const adminNewsRouter = Router();

adminNewsRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await newsService.listAllNews() });
  } catch (err) {
    next(err);
  }
});

adminNewsRouter.post("/", validateBody(createNewsSchema), async (req, res, next) => {
  try {
    const item = await newsService.createNews(req.body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

adminNewsRouter.patch("/:id", validateBody(updateNewsSchema), async (req, res, next) => {
  try {
    const item = await newsService.updateNews(String(req.params.id), req.body);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

adminNewsRouter.delete("/:id", async (req, res, next) => {
  try {
    await newsService.deleteNews(String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
