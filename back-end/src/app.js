import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
// import { generateCode } from "./utils/generateCode.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// console.log(generateCode(12));

app.get("/api/health", (req, res) => res.json({ ok: true }));

import adminRoutes from "./routes/admin.js";

// 1/ routers

app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

export default app;
