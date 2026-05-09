module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('Supabase not configured');
    return res.status(200).json({ count: 0 });
  }

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/counter?select=count&id=eq.1`, {
        method: 'GET',
        headers
      });
      const data = await r.json();
      console.log('GET counter response:', JSON.stringify(data));
      const count = data?.[0]?.count || 0;
      return res.status(200).json({ count });

    } else if (req.method === 'POST') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_counter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      const rText = await r.text();
      console.log('RPC response status:', r.status, 'body:', rText);

      if (!r.ok) {
        console.log('RPC failed, trying PATCH...');
        const getRes = await fetch(`${SUPABASE_URL}/rest/v1/counter?select=count&id=eq.1`, {
          method: 'GET',
          headers
        });
        const getData = await getRes.json();
        const currentCount = getData?.[0]?.count || 0;

        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/counter?id=eq.1`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ count: currentCount + 1 })
        });
        console.log('PATCH response:', patchRes.status);
      }

      return res.status(200).json({ ok: true });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error('Counter error:', err.message);
    return res.status(200).json({ count: 0 });
  }
}
