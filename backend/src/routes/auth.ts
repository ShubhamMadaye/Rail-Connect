import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { validateEmail, validatePasswordStrength, validatePhone, validateName } from '../utils/validation';
import { logEvent } from '../utils/audit';

const router = Router();
const prisma = new PrismaClient();

// Rate limiter for authentication routes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 login/register requests per windowMs
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authRateLimiter);

// Mock Email Helper
function mockSendEmail(to: string, subject: string, body: string) {
  const logMessage = `
========================================
[${new Date().toISOString()}] MOCK EMAIL
To: ${to}
Subject: ${subject}
Body: ${body}
========================================
`;
  const logPath = path.resolve(__dirname, '../../mock-emails.log');
  fs.appendFileSync(logPath, logMessage);
  console.log(`[MOCK EMAIL SENT] To: ${to}. Check backend/mock-emails.log for content.`);
}

const generateAccessToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' } // Short-lived access token
  );
};

const generateRefreshToken = (user: { id: string; email: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' } // Long-lived refresh token
  );
};

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.setHeader(
    'Set-Cookie',
    `refreshToken=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
};

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const parseRefreshToken = (req: Request): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  return cookies['refreshToken'] || null;
};

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  try {
    const { name, email, password, phone } = req.body;

    // Validate inputs
    if (!validateName(name)) {
      return res.status(400).json({ error: 'Name must be alphabetic and between 1 and 50 characters' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }
    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.isValid) {
      return res.status(400).json({ error: pwCheck.error });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await logEvent(null, 'REGISTER_FAILED', `Attempted duplicate registration for email: ${email}`, ip);
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone: phone || null,
        role: 'user',
        isEmailVerified: false,
        verificationToken,
      },
    });

    // Log the audit event
    await logEvent(user.id, 'REGISTER', `User registered successfully. Email verification pending.`, ip);

    // Send mock email
    const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;
    mockSendEmail(
      email,
      'Verify your RailConnect Email',
      `Welcome to RailConnect, ${name}! Please verify your email by clicking: ${verificationLink}`
    );

    res.status(201).json({
      message: 'Account created! Please check your email (backend/mock-emails.log in development) to verify your account.',
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isEmailVerified: user.isEmailVerified }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await logEvent(null, 'LOGIN_FAILED', `Failed login attempt for non-existent email: ${email}`, ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      await logEvent(user.id, 'LOGIN_LOCKED', `Blocked login attempt. Account locked for ${minutesLeft} more minutes.`, ip);
      return res.status(423).json({ error: `Account is temporarily locked. Try again in ${minutesLeft} minutes.` });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      let lockoutUntil: Date | null = null;
      let errorMsg = 'Invalid credentials';

      if (attempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        errorMsg = 'Too many failed attempts. Account locked for 15 minutes.';
      } else {
        errorMsg = `Invalid credentials. ${5 - attempts} attempts remaining before lockout.`;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, lockoutUntil },
      });

      await logEvent(user.id, 'LOGIN_FAILED', `Incorrect password. Failed attempt count: ${attempts}`, ip);
      return res.status(401).json({ error: errorMsg });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      await logEvent(user.id, 'LOGIN_FAILED', `Attempted login on unverified account.`, ip);
      return res.status(403).json({ error: 'Please verify your email address before logging in. Check backend/mock-emails.log for link.' });
    }

    // Clear failed login attempts and lockout
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    });

    const accessToken = generateAccessToken(updatedUser);
    const refreshTokenVal = generateRefreshToken(updatedUser);

    // Save refresh token to database (hashed for security)
    await prisma.refreshToken.create({
      data: {
        token: hashToken(refreshTokenVal),
        userId: updatedUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    setRefreshTokenCookie(res, refreshTokenVal);
    await logEvent(updatedUser.id, 'LOGIN_SUCCESS', 'Logged in successfully', ip);

    res.json({
      accessToken,
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone, role: updatedUser.role, isEmailVerified: true },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during login' });
  }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = await prisma.user.findFirst({ where: { verificationToken: token } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, verificationToken: null },
    });

    await logEvent(user.id, 'EMAIL_VERIFIED', 'User email verified successfully', ip);

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err: any) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during email verification' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Use standard status 200 message to prevent account enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await logEvent(null, 'PASSWORD_RESET_REQUESTED_NONEXISTENT', `Password reset requested for: ${email}`, ip);
      return res.json({ message: 'If the email exists, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpires: resetExpires },
    });

    await logEvent(user.id, 'PASSWORD_RESET_REQUESTED', 'Requested password reset token', ip);

    // Send mock email
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    mockSendEmail(
      email,
      'Reset your RailConnect Password',
      `You requested a password reset. Reset your password by clicking: ${resetLink}`
    );

    res.json({ message: 'If the email exists, a password reset link has been sent.' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during forgot password flow' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.isValid) {
      return res.status(400).json({ error: pwCheck.error });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        failedLoginAttempts: 0, // Reset lockout attempts
        lockoutUntil: null,
      },
    });

    await logEvent(user.id, 'PASSWORD_RESET_SUCCESS', 'Password reset successfully', ip);

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during password reset' });
  }
});

// POST /api/auth/refresh (Token Rotation & Reuse Detection)
router.post('/refresh', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  try {
    const oldRefreshToken = parseRefreshToken(req);
    if (!oldRefreshToken) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }

    // Verify token validity first
    let payload: any;
    try {
      payload = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session signature' });
    }

    const hashedOldToken = hashToken(oldRefreshToken);
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: hashedOldToken },
      include: { user: true },
    });

    // Reuse Detection: Token is valid but not found in the DB.
    // This indicates it has already been rotated out.
    if (!dbToken) {
      console.warn(`[SECURITY ALERT] Refresh token reuse detected for User ID: ${payload.id} from IP: ${ip}`);

      // Revoke all refresh tokens for this user immediately to protect the account
      await prisma.refreshToken.deleteMany({
        where: { userId: payload.id },
      });

      res.setHeader('Set-Cookie', 'refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
      await logEvent(payload.id, 'SECURITY_ALERT', 'Rotated refresh token reuse detected! Revoked all sessions.', ip);
      return res.status(401).json({ error: 'Session anomaly detected. Please sign in again.' });
    }

    if (dbToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: dbToken.id } });
      res.setHeader('Set-Cookie', 'refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
      return res.status(401).json({ error: 'Expired refresh session' });
    }

    // Rotate Refresh Token
    const user = dbToken.user;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Delete old token, insert new token (hashed)
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: dbToken.id } }),
      prisma.refreshToken.create({
        data: {
          token: hashToken(newRefreshToken),
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    setRefreshTokenCookie(res, newRefreshToken);

    res.json({ accessToken: newAccessToken });
  } catch (err: any) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during token refresh' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  try {
    const refreshToken = parseRefreshToken(req);
    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);
      const dbToken = await prisma.refreshToken.findUnique({ where: { token: hashedToken } });
      if (dbToken) {
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });
        await logEvent(dbToken.userId, 'LOGOUT', 'Logged out successfully, session cleared.', ip);
      }
    }
    // Clear cookies
    res.setHeader('Set-Cookie', 'refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
    res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during logout' });
  }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isEmailVerified: user.isEmailVerified });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
