export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mediaType, lang } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  const langNames = {
    fr: 'French', en: 'English', es: 'Spanish', de: 'German', pt: 'Portuguese',
    it: 'Italian', nl: 'Dutch', pl: 'Polish', ru: 'Russian', ja: 'Japanese',
    ko: 'Korean', zh: 'Chinese', ar: 'Arabic', tr: 'Turkish'
  };
  const language = langNames[lang] || 'English';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const body = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mediaType || 'image/jpeg',
              data: image
            }
          },
          {
            text: `You are RoastMe, an AI specialized in humorous photo roasts.
Analyze the photo and write a funny, sharp but never mean, racist, sexist or discriminatory roast in 3-5 sentences.
Focus on visual details: expression, outfit, background, pose, hairstyle, accessories.
IMPORTANT: Respond entirely in ${language}.

You MUST end your response with this exact format on a new line — replace the numbers with real scores:
SCORES:{"style":7,"vibes":5,"confidence":8}

Do not add any text after the JSON.`
          }
        ]
      }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.9 }
    };

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await geminiRes.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = fullText.match(/SCORES:\s*(\{[^}]+\})/);
    let scores = { style: '?', vibes: '?', confidence: '?' };
    let roastText = fullText.trim();

    if (jsonMatch) {
      try {
        scores = JSON.parse(jsonMatch[1]);
        roastText = fullText.replace(jsonMatch[0], '').trim();
      } catch (e) {}
    }

    return res.status(200).json({ roast: roastText, scores });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      roast: "Even my circuits crashed looking at this photo.",
      scores: { style: '?', vibes: '?', confidence: '?' }
    });
  }
}
