import "dotenv/config";
import express from "express";
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
import genresRouter from "./routes/genres";
import memberAuthRouter from "./routes/memberAuth";
import catalogueRouter from "./routes/catalogue";
import myLoansRouter from "./routes/myLoans";
import blogRouter from "./routes/blog";
import bulletinRouter from "./routes/bulletin";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/copies", copiesRouter);
app.use("/api/lookup", lookupRouter);
app.use("/api/members", membersRouter);
app.use("/api/scan", scanRouter);
app.use("/api/loans", loansRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/genres", genresRouter);
app.use("/api/member-auth", memberAuthRouter);
app.use("/api/catalogue", catalogueRouter);
app.use("/api/my-loans", myLoansRouter);
app.use("/api/blog", blogRouter);
app.use("/api/bulletin", bulletinRouter);

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
