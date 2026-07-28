import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { updateFeedbackStatusSchema } from "../../validators/feedback.js";
import * as feedbackService from "../../services/feedback.js";

export const adminFeedbackRouter = Router();

adminFeedbackRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await feedbackService.listFeedback() });
  } catch (err) {
    next(err);
  }
});

adminFeedbackRouter.patch("/:id", validateBody(updateFeedbackStatusSchema), async (req, res, next) => {
  try {
    const item = await feedbackService.updateFeedbackStatus(String(req.params.id), req.body.status);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});
