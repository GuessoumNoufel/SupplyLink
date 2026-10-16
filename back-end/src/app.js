import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import errorHandler from "./middleware/errorHandler.js";
import AppError from "./utils/AppError.js";
// import { generateCode } from "./utils/generateCode.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// console.log(generateCode(12));

app.get("/api/health", (req, res) => res.json({ ok: true }));

import adminRoutes from "./routes/admin.js";
import ownerRoutes from "./routes/owner.js";
// 1/ routers

app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);

app.use((req, res, next) =>
  next(new AppError(`Route ${req.originalUrl} not found`, 404)),
);
app.use(errorHandler);

export default app;
