import { Router, type Router as RouterType, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService, AuthError } from './service.js';
import { loginSchema, refreshSchema, logoutSchema, verifyMfaSchema } from './dto.js';
import { requireAuth } from '../../middleware/auth.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again after 15 minutes.',
    },
  },
});

const router: RouterType = Router();
const authService = new AuthService();

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
  if (Array.isArray(forwarded)) return forwarded[0]?.split(',')[0]?.trim();
  return req.socket.remoteAddress ?? undefined;
}

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  if (typeof ua === 'string') return ua;
  return undefined;
}

router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);
    const ip = getClientIp(req);
    const ua = getUserAgent(req);

    const result = await authService.login(input, ip, ua);

    res.cookie('access_token', result.tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: result.tokens.expiresIn * 1000,
      path: '/',
    });

    res.cookie('refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });

    res.json({
      data: {
        tokens: result.tokens,
        session: result.session,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({
        error: {
          code: err.code,
          message: err.message,
          trace_id: req.traceId ?? '',
        },
      });
      return;
    }
    throw err;
  }
});

router.post('/auth/refresh', async (req, res) => {
  try {
    const input = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(input);

    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: tokens.expiresIn * 1000,
      path: '/',
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });

    res.json({ data: { tokens } });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({
        error: {
          code: err.code,
          message: err.message,
          trace_id: req.traceId ?? '',
        },
      });
      return;
    }
    throw err;
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const input = logoutSchema.parse(req.body);
    const cookies = req.cookies as Record<string, string> | undefined;
    const cookieToken = typeof cookies?.refresh_token === 'string' ? cookies.refresh_token : undefined;
    await authService.logout(input.refreshToken ?? cookieToken);

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });

    res.json({ data: { status: 'logged_out' } });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({
        error: {
          code: err.code,
          message: err.message,
          trace_id: req.traceId ?? '',
        },
      });
      return;
    }
    throw err;
  }
});

router.get('/auth/me', requireAuth, (req, res) => {
  const actor = req.actor;
  if (!actor) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
        trace_id: req.traceId ?? '',
      },
    });
    return;
  }

  res.json({
    data: {
      userId: actor.userId,
      role: actor.role,
      orgId: actor.orgId,
    },
  });
});

router.post('/auth/mfa/setup', requireAuth, async (req, res) => {
  try {
    const actor = req.actor!;
    const result = await authService.setupMfa(actor.userId);
    res.status(201).json({ data: result });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(409).json({
        error: { code: err.code, message: err.message, trace_id: req.traceId ?? '' },
      });
      return;
    }
    throw err;
  }
});

router.post('/auth/mfa/verify', requireAuth, async (req, res) => {
  try {
    const actor = req.actor!;
    const { code } = verifyMfaSchema.parse(req.body);
    await authService.verifyMfa(actor.userId, code);
    res.json({ data: { status: 'verified' } });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({
        error: { code: err.code, message: err.message, trace_id: req.traceId ?? '' },
      });
      return;
    }
    throw err;
  }
});

export default router;
