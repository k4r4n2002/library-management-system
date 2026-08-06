import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();
const COOKIE_NAME = "session";
const isProd = process.env.NODE_ENV === "production";

// Locally, client and server are both on `localhost` (different ports only),
// which browsers treat as the same "site" — sameSite: "lax" works fine there.
// In production they're on different domains (e.g. two different Render
// subdomains, which sit on the public suffix list precisely so unrelated
// tenants can't share cookies), making every API call cross-site from the
// browser's perspective. Cross-site fetch() requests only carry a cookie
// when it's sameSite: "none", and "none" requires secure: true by spec.
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminHash) {
    throw new AppError(500, "Admin account is not configured on the server");
  }

  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    throw new AppError(401, "Invalid email or password");
  }
  const ok = await bcrypt.compare(password, adminHash);
  if (!ok) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = jwt.sign({ email: adminEmail }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ email: adminEmail });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ email: req.admin!.email });
});

export default router;
