import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser } from "../types";

export interface AuthenticatedRequest extends Request {
  auth?: AuthUser;
}

interface JwtPayload extends jwt.JwtPayload {
  userId?: string;
  name?: string;
  role?: string;
}

function extractBearerToken(value: string | undefined): string | null {
  if (!value || !value.startsWith("Bearer ")) {
    return null;
  }
  return value.slice("Bearer ".length).trim() || null;
}

export function verifyJWT(token: string): AuthUser {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const payload = jwt.verify(token, secret) as JwtPayload;
  if (!payload.userId) {
    throw new Error("JWT payload does not contain userId");
  }

  return {
    userId: payload.userId,
    name: typeof payload.name === "string" ? payload.name : undefined,
    role: typeof payload.role === "string" ? payload.role : undefined
  };
}

function coerceSingleValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

export function resolveRequestAuth(req: Request): AuthUser | null {
  const bearerToken = extractBearerToken(req.header("authorization"));
  if (bearerToken) {
    return verifyJWT(bearerToken);
  }

  const userId =
    req.header("x-user-id") ||
    coerceSingleValue(req.query.userId) ||
    coerceSingleValue(req.query.user_id);

  if (!userId) {
    return null;
  }

  return {
    userId,
    name:
      req.header("x-user-name") ||
      coerceSingleValue(req.query.name) ||
      coerceSingleValue(req.query.userName),
    role:
      req.header("x-user-role") ||
      coerceSingleValue(req.query.role)
  };
}

export function resolveSocketAuth(url: URL): AuthUser {
  const token = url.searchParams.get("token");
  if (token) {
    return verifyJWT(token);
  }

  const userId = url.searchParams.get("userId") || url.searchParams.get("user_id");
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return {
    userId,
    name: url.searchParams.get("name") || undefined,
    role: url.searchParams.get("role") || undefined
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const auth = resolveRequestAuth(req);
    if (!auth) {
      res.status(401).json({
        error: "Unauthorized",
        hint: "Send Authorization: Bearer <token> or x-user-id header"
      });
      return;
    }

    req.auth = auth;
    next();
  } catch (error) {
    res.status(401).json({
      error: "Unauthorized",
      message: error instanceof Error ? error.message : "Authentication failed"
    });
  }
}
