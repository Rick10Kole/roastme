module.exports = async function handler(req, res) {
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
 
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    // Fallback if Upstash not configured yet
    return res.status(200).json({ count: 0 });
  }
 
  const headers = {
    Authorization: `Bearer ${UPSTASH_TOKEN}`,
    'Content-Type': 'application/json'
  };
 
  try {
    if (req.method === 'POST') {
      // Increment counter
      await fetch(`${UPSTASH_URL}/incr/roast_count`, { method: 'POST', headers });
      return res.status(200).json({ ok: true });
 
    } else if (req.method === 'GET') {
      // Get counter
      const r = await fetch(`${UPSTASH_URL}/get/roast_count`, { method: 'GET', headers });
      const data = await r.json();
      return res.status(200).json({ count: parseInt(data.result) || 0 });
 
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    return res.status(200).json({ count: 0 });
  }
}
