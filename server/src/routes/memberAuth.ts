import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireMember, AuthedRequest } from "../middleware/requireAuth";
import { AppError } from "../errors";

const router = Router();

const loginSchema = z.object({
  name: z.string().min(1),
  passcode: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const { name, passcode } = loginSchema.parse(req.body);

  // Name is typed freely, not selected from a list, so more than one member
  // could plausibly share a name — check every candidate's passcode rather
  // than assuming the first row is the right one.
  const { rows } = await pool.query(
    "SELECT id, name, passcode_hash FROM members WHERE lower(name) = lower($1) AND passcode_hash IS NOT NULL",
    [name.trim()]
  );

  for (const member of rows) {
    if (await bcrypt.compare(passcode, member.passcode_hash)) {
      const token = jwt.sign(
        { memberId: member.id, name: member.name, role: "member" },
        process.env.JWT_SECRET!,
        { expiresIn: "30d" }
      );
      return res.json({ memberId: member.id, name: member.name, token });
    }
  }

  throw new AppError(401, "Name and passcode don't match");
});

router.get("/me", requireMember, (req: AuthedRequest, res) => {
  res.json({ memberId: req.auth!.memberId, name: req.auth!.name });
});

export default router;
