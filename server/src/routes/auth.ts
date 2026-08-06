import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { requireAdmin, AuthedRequest } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();

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

  const token = jwt.sign({ email: adminEmail, role: "admin" }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  res.json({ email: adminEmail, token });
});

router.get("/me", requireAdmin, (req: AuthedRequest, res) => {
  res.json({ email: req.auth!.email });
});

export default router;
