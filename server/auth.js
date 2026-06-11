// Google sign-in gate. When GOOGLE_CLIENT_ID/SECRET are set, every route
// (app + API) requires a session proving a verified email on the allowed
// domain. Sessions are stateless signed cookies; no store needed.

import crypto from 'node:crypto';

const SESSION_TTL = 7 * 24 * 3_600_000; // 7 days
const COOKIE = 'sb_session';
const STATE_COOKIE = 'sb_oauth_state';

export function createAuth(env) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const domain = (env.ALLOWED_EMAIL_DOMAIN || 'flowx.ai').toLowerCase();
  const enabled = !!(clientId && clientSecret);
  // Without a fixed SESSION_SECRET, sessions reset on every server restart.
  const secret = env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

  const sign = (payload) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');

  const makeSession = (email) => {
    const payload = `${email}|${Date.now() + SESSION_TTL}`;
    return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
  };

  const readSession = (token) => {
    if (!token) return null;
    const [p64, sig] = token.split('.');
    if (!p64 || !sig) return null;
    const payload = Buffer.from(p64, 'base64url').toString();
    const expected = sign(payload);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const [email, exp] = payload.split('|');
    if (!email || Date.now() > Number(exp)) return null;
    return email;
  };

  const cookies = (req) =>
    Object.fromEntries(
      (req.headers.cookie || '')
        .split(';')
        .map((c) => c.trim().split('=').map(decodeURIComponent))
        .filter((p) => p.length === 2)
    );

  const baseUrl = (req) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    return `${proto}://${req.headers.host}`;
  };

  const setCookie = (res, name, value, maxAgeMs) =>
    res.append(
      'Set-Cookie',
      `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${Math.floor(maxAgeMs / 1000)}`
    );

  function middleware(req, res, next) {
    if (!enabled) return next();
    // /api/refresh is cron-only: it carries its own CRON_SECRET check, no
    // Google session involved (Vercel Cron doesn't have one).
    if (req.path.startsWith('/auth/') || req.path === '/healthz' || req.path === '/api/refresh') return next();
    const email = readSession(cookies(req)[COOKIE]);
    if (email) {
      req.userEmail = email;
      return next();
    }
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sign-in required', authUrl: '/auth/google' });
    return res.redirect('/auth/google');
  }

  function routes(app) {
    if (!enabled) return;

    app.get('/auth/google', (req, res) => {
      const state = crypto.randomBytes(16).toString('base64url');
      setCookie(res, STATE_COOKIE, state, 10 * 60_000);
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${baseUrl(req)}/auth/callback`,
        response_type: 'code',
        scope: 'openid email',
        hd: domain, // prefills the right account; real enforcement is below
        state,
        prompt: 'select_account',
      });
      res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    });

    app.get('/auth/callback', async (req, res) => {
      try {
        const { code, state } = req.query;
        if (!code || !state || state !== cookies(req)[STATE_COOKIE]) {
          return res.status(400).send('OAuth state mismatch — go back and try again.');
        }
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `${baseUrl(req)}/auth/callback`,
            grant_type: 'authorization_code',
          }),
        });
        const tokens = await tokenRes.json();
        if (!tokens.id_token) return res.status(401).send('Google sign-in failed.');

        // Server-side verification of the ID token via Google's tokeninfo.
        const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`);
        const info = await infoRes.json();
        const email = (info.email || '').toLowerCase();
        const ok =
          infoRes.ok &&
          info.aud === clientId &&
          info.email_verified === 'true' &&
          email.endsWith(`@${domain}`);
        if (!ok) {
          return res
            .status(403)
            .send(`Access is limited to @${domain} accounts. You signed in as ${email || 'an unknown account'}.`);
        }
        setCookie(res, COOKIE, makeSession(email), SESSION_TTL);
        res.redirect('/');
      } catch (e) {
        console.error('[sprint-boss] auth callback failed:', e.message);
        res.status(500).send('Sign-in error — try again.');
      }
    });

    app.get('/auth/logout', (_req, res) => {
      res.append('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`);
      res.redirect('/auth/google');
    });
  }

  return { enabled, middleware, routes, domain };
}
