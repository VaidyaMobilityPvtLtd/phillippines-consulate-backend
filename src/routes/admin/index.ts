import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { adminNewsRouter } from "./news.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use("/news", adminNewsRouter);
