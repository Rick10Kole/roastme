export default async function handler(req, res) {
  // ─── CONFIGURATION ──────────────────────────────────────────────
  const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
  const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 requests per minute per session
  const RATE_LIMIT_STORAGE_KEY = 'rate_limits'; // Would be stored in Redis in production

  // ─── SESSION VALIDATION ─────────────────────────────────────────
  const sessionToken = req.headers['x-session-token'];
  
  if (!sessionToken || typeof sessionToken !== 'string') {
    return res.status(401).json({ error: 'Missing or invalid session token' });
  }

  // Validate session token format (basic check)
  if (!sessionToken.match(/^sess_[a-z0-9]+_\d+$/)) {
    return res.status(401).json({ error: 'Invalid session token format' });
  }

  // ─── ENVIRONMENT VARIABLES ──────────────────────────────────────
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    // Fallback if Upstash not configured yet
    console.warn('Upstash not configured, returning fallback counter');
    return res.status(200).json({ count: 0 });
  }

  const headers = {
    Authorization: `Bearer ${UPSTASH_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // ─── RATE LIMITING CHECK ────────────────────────────────────────
  async function checkRateLimit(token) {
    try {
      const rateLimitKey = `${RATE_LIMIT_STORAGE_KEY}:${token}`;
      
      // Get current request count for this session
      const countRes = await fetch(`${UPSTASH_URL}/get/${rateLimitKey}`, {
        method: 'GET',
        headers
      });

      const countData = await countRes.json();
      const currentCount = parseInt(countData.result) || 0;

      if (currentCount >= MAX_REQUESTS_PER_WINDOW) {
        return { allowed: false, remaining: 0 };
      }

      // Increment request count with expiry
      await fetch(`${UPSTASH_URL}/incr/${rateLimitKey}`, {
        method: 'POST',
        headers
      });

      // Set expiry on first request
      if (currentCount === 0) {
        await fetch(`${UPSTASH_URL}/expire/${rateLimitKey}/${Math.ceil(RATE_LIMIT_WINDOW / 1000)}`, {
          method: 'POST',
          headers
        });
      }

      return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - (currentCount + 1) };
    } catch (err) {
      console.error('Rate limit check error:', err);
      // Fail open on rate limit check error (allow request)
      return { allowed: true, remaining: -1 };
    }
  }

  try {
    // ─── GET REQUEST ────────────────────────────────────────────
    if (req.method === 'GET') {
      try {
        const r = await fetch(`${UPSTASH_URL}/get/roast_count`, {
          method: 'GET',
          headers,
          timeout: 10000
        });

        if (!r.ok) {
          console.error('Redis GET error:', r.status);
          return res.status(200).json({ count: 0 });
        }

        const data = await r.json();
        const count = parseInt(data.result) || 0;

        // Validate count is a reasonable number
        if (count < 0 || count > 1000000) {
          console.warn('Suspicious count value:', count);
          return res.status(200).json({ count: 0 });
        }

        return res.status(200).json({ count });

      } catch (err) {
        console.error('GET counter error:', err);
        return res.status(200).json({ count: 0 });
      }

    // ─── POST REQUEST (INCREMENT) ────────────────────────────────
    } else if (req.method === 'POST') {
      // Check rate limit
      const rateLimit = await checkRateLimit(sessionToken);
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
        });
      }

      try {
        const incrRes = await fetch(`${UPSTASH_URL}/incr/roast_count`, {
          method: 'POST',
          headers,
          timeout: 10000
        });

        if (!incrRes.ok) {
          console.error('Redis INCR error:', incrRes.status);
          return res.status(200).json({ ok: true }); // Still return success to not break frontend
        }

        return res.status(200).json({ ok: true });

      } catch (err) {
        console.error('POST counter error:', err);
        return res.status(200).json({ ok: true }); // Fail gracefully
      }

    // ─── METHOD NOT ALLOWED ─────────────────────────────────────
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    console.error('Counter handler error:', err);
    return res.status(200).json({ count: 0 });
  }
}
