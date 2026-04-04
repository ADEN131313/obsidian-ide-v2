import { Router, type IRouter } from "express";
import authRouter from "./auth.ts";
import healthRouter from "./health.ts";
import chatRouter from "./chat.ts";

const router: IRouter = Router();

router.use("/auth", authRouter);
router.use(healthRouter);
router.use(chatRouter);

export default router;
