import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { updateContactStatusSchema } from "../../validators/contact.js";
import * as contactService from "../../services/contact.js";

export const adminContactRouter = Router();

adminContactRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ items: await contactService.listContacts() });
  } catch (err) {
    next(err);
  }
});

adminContactRouter.patch("/:id", validateBody(updateContactStatusSchema), async (req, res, next) => {
  try {
    const item = await contactService.updateContactStatus(String(req.params.id), req.body.status);
    res.json({ item });
  } catch (err) {
    next(err);
  }
});
