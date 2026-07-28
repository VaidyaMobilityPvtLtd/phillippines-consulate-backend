import { Router } from "express";
import * as newsService from "../services/news.js";

export const newsRouter = Router();

newsRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await newsService.listPublishedNews() });
  } catch (err) {
    next(err);
  }
});

newsRouter.get("/:slug", async (req, res, next) => {
  try {
    res.json({ item: await newsService.getPublishedBySlug(req.params.slug) });
  } catch (err) {
    next(err);
  }
});
