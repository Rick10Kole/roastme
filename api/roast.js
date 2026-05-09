module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mediaType, lang } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  const langNames = {
    fr: 'French', en: 'English', es: 'Spanish', de: 'German', pt: 'Portuguese',
    it: 'Italian', nl: 'Dutch', pl: 'Polish', ru: 'Russian', ja: 'Japanese',
    ko: 'Korean', zh: 'Chinese', ar: 'Arabic', tr: 'Turkish'
  };
  const language = langNames[lang] || 'English';

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      roast: "My API keys are missing. Even I'm roasted.",
      scores: { style: '?', vibes: '?', confidence: '?' }
    });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 800,
        temperature: 0.9,
        messages: [
          {
            role: 'system',
            content: `You are RoastMe, an AI specialized in humorous photo roasts. 
You analyze photos and write funny, sharp but never mean, racist, sexist or discriminatory roasts.
Focus on visual details: expression, outfit, background, pose, hairstyle, accessories.
Always respond in ${language}.
Always end with this exact line:
SCORES:{"style":X,"vibes":Y,"confidence":Z}
where X, Y, Z are scores out of 10. No text after the JSON.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType || 'image/jpeg'};base64,${image}`
                }
              },
              {
                type: 'text',
                text: 'Roast this photo in 3-5 sentences!'
              }
            ]
          }
        ]
      })
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      console.error('Groq API error:', data);
      return res.status(500).json({
        roast: "Even the AI refused to look at this photo.",
        scores: { style: '?', vibes: '?', confidence: '?' }
      });
    }

    const fullText = data.choices?.[0]?.message?.content || '';

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
