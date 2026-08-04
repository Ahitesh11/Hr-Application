import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";

const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const app = express();

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(requestLogger);

// Routes mount here once Phase 11 adds them (e.g. app.use("/api", routes)).

app.use(notFound);
app.use(errorHandler);
