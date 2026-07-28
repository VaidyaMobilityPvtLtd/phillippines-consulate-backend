import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middleware/validate.js";
import { createFeedbackSchema } from "../validators/feedback.js";
import * as feedbackService from "../services/feedback.js";

export const feedbackRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

feedbackRouter.post("/", limiter, validateBody(createFeedbackSchema), async (req, res, next) => {
  try {
    const item = await feedbackService.createFeedback(req.body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});
