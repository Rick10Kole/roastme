module.exports = async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase not configured, returning fallback counter');
    return res.status(200).json({ count: 0 });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/counter?select=count`, {
        method: 'GET',
        headers
      });
      const data = await r.json();
      const count = data?.[0]?.count || 0;
      return res.status(200).json({ count });

    } else if (req.method === 'POST') {
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/counter?select=count`, {
        method: 'GET',
        headers
      });
      const getData = await getRes.json();
      const currentCount = getData?.[0]?.count || 0;

      await fetch(`${SUPABASE_URL}/rest/v1/counter?id=eq.1`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ count: currentCount + 1 })
      });

      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (err) {
    console.error('Counter error:', err);
    return res.status(200).json({ count: 0 });
  }
}
