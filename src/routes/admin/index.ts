import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { adminNewsRouter } from "./news.js";
import { adminContactRouter } from "./contact.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use("/news", adminNewsRouter);
adminRouter.use("/contact", adminContactRouter);
