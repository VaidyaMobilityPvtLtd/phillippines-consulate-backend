import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middleware/validate.js";
import { createContactSchema } from "../validators/contact.js";
import * as contactService from "../services/contact.js";

export const contactRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

contactRouter.post("/", limiter, validateBody(createContactSchema), async (req, res, next) => {
  try {
    const item = await contactService.createContact(req.body);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});
