import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ZodError } from "zod";
import { AppError } from "./errors";
import authRouter from "./routes/auth";
import booksRouter from "./routes/books";
import copiesRouter from "./routes/copies";
import lookupRouter from "./routes/lookup";
import membersRouter from "./routes/members";
import scanRouter from "./routes/scan";
import loansRouter from "./routes/loans";
import dashboardRouter from "./routes/dashboard";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/copies", copiesRouter);
app.use("/api/lookup", lookupRouter);
app.use("/api/members", membersRouter);
app.use("/api/scan", scanRouter);
app.use("/api/loans", loansRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request", details: err.flatten() });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Library API listening on http://localhost:${port}`);
});
