import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, commitDb } from './db.ts';
import { User, OtpRecord } from './types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'aura_indian_fashion_secret_key_2026_jwt_token_secure';
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds strict countdown
const MAX_OTP_ATTEMPTS = 5;

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function comparePassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function validateIndianMobile(phone: string): boolean {
  // Strip spaces, dashes, +91
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) return true;
  if (clean.length === 12 && clean.startsWith('91') && /^[6-9]\d{9}$/.test(clean.substring(2))) return true;
  return false;
}

export function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) return `+91 ${clean}`;
  if (clean.length === 12 && clean.startsWith('91')) return `+91 ${clean.substring(2)}`;
  return phone;
}

export function validatePasswordRules(pwd: string): { valid: boolean; message?: string } {
  if (!pwd || pwd.length < 6) {
    return { valid: false, message: 'Password must contain at least 6 characters.' };
  }
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

  if (!hasLetter || !hasNumber || !hasSpecial) {
    return {
      valid: false,
      message: 'Password must contain at least 1 letter, 1 number, and 1 special character.',
    };
  }
  return { valid: true };
}

// Generate secure 6-digit OTP
export function createOrUpdateOtp(
  identifier: string,
  purpose: 'signup' | 'forgot_password'
): { otp: string; resendInSeconds: number; error?: string } {
  const db = getDb();
  const now = Date.now();

  const existing = db.otpRecords.find(
    (o) => o.identifier.toLowerCase() === identifier.toLowerCase() && o.purpose === purpose && !o.verified
  );

  if (existing && now < existing.resendAvailableAt) {
    const remaining = Math.ceil((existing.resendAvailableAt - now) / 1000);
    return { otp: '', resendInSeconds: remaining, error: `Please wait ${remaining} seconds before requesting a new OTP.` };
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  if (existing) {
    existing.otp = code;
    existing.expiresAt = now + OTP_EXPIRY_MS;
    existing.attemptCount = 0;
    existing.resendAvailableAt = now + OTP_RESEND_COOLDOWN_MS;
  } else {
    const record: OtpRecord = {
      id: `otp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      identifier: identifier.toLowerCase(),
      otp: code,
      expiresAt: now + OTP_EXPIRY_MS,
      attemptCount: 0,
      resendAvailableAt: now + OTP_RESEND_COOLDOWN_MS,
      purpose,
      verified: false,
    };
    db.otpRecords.push(record);
  }

  commitDb();
  console.log(`[SECURE SMS/EMAIL OTP DISPATCH] Code sent to ${identifier}: ${code}`);
  return { otp: code, resendInSeconds: 60 };
}

export function verifyOtpRecord(
  identifier: string,
  enteredCode: string,
  purpose: 'signup' | 'forgot_password'
): { success: boolean; message: string } {
  const db = getDb();
  const now = Date.now();

  const record = db.otpRecords.find(
    (o) => o.identifier.toLowerCase() === identifier.toLowerCase() && o.purpose === purpose && !o.verified
  );

  if (!record) {
    return { success: false, message: 'No active OTP verification session found. Please request a new OTP.' };
  }

  if (now > record.expiresAt) {
    return { success: false, message: 'This OTP has expired. Please click Resend OTP.' };
  }

  if (record.attemptCount >= MAX_OTP_ATTEMPTS) {
    return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  if (record.otp !== enteredCode.trim()) {
    record.attemptCount += 1;
    commitDb();
    const remaining = MAX_OTP_ATTEMPTS - record.attemptCount;
    return { success: false, message: `Incorrect OTP. ${remaining} attempt(s) remaining.` };
  }

  // Mark as verified
  record.verified = true;
  commitDb();
  return { success: true, message: 'Verification successful.' };
}

// Middleware: Require Auth
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.aura_auth_token) {
    token = req.cookies.aura_auth_token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  req.user = user;
  next();
}

// Middleware: Optional Auth (for guest / logged in)
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.aura_auth_token) {
    token = req.cookies.aura_auth_token;
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      const db = getDb();
      const user = db.users.find((u) => u.id === decoded.id);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}

// Middleware: Require Admin
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
    }
    next();
  });
}
