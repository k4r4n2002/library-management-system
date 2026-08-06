import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type Role = "admin" | "member";

export interface AuthPayload {
  role: Role;
  email?: string; // admin
  memberId?: string; // member
  name?: string; // member
}

export interface AuthedRequest extends Request {
  auth?: AuthPayload;
}

function verify(req: AuthedRequest): AuthPayload | null {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
  } catch {
    return null;
  }
}

function requireRole(role: Role | null) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const payload = verify(req);
    if (!payload || (role && payload.role !== role)) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    req.auth = payload;
    next();
  };
}

export const requireAdmin = requireRole("admin");
export const requireMember = requireRole("member");
// Either role — used by routes both surfaces need (e.g. the shared genre list).
export const requireAnyAuth = requireRole(null);
