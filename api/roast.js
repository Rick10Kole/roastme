export default async function handler(req, res) {
  // ─── METHOD VALIDATION ──────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ─── REQUEST BODY VALIDATION ────────────────────────────────────
  const { image, mediaType, lang } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Validate image is base64 string
  if (typeof image !== 'string' || !image.match(/^[A-Za-z0-9+/=]+$/)) {
    return res.status(400).json({ error: 'Invalid image format' });
  }

  // Validate image size (max 5MB after compression, but check base64 size)
  const maxBase64Size = 6 * 1024 * 1024; // 6MB base64 ≈ 4.5MB binary
  if (image.length > maxBase64Size) {
    return res.status(413).json({ error: 'Image too large' });
  }

  // ─── LANGUAGE MAPPING ───────────────────────────────────────────
  const langNames = {
    fr: 'French', en: 'English', es: 'Spanish', de: 'German', pt: 'Portuguese',
    it: 'Italian', nl: 'Dutch', pl: 'Polish', ru: 'Russian', ja: 'Japanese',
    ko: 'Korean', zh: 'Chinese', ar: 'Arabic', tr: 'Turkish'
  };

  // Validate language code
  const language = langNames[lang] || 'English';
  if (typeof lang !== 'string' || lang.length > 5) {
    return res.status(400).json({ error: 'Invalid language code' });
  }

  // Validate mediaType
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const finalMediaType = validMimeTypes.includes(mediaType) ? mediaType : 'image/jpeg';

  // ─── GEMINI API CALL ────────────────────────────────────────────
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({
        roast: "My API keys are missing. Even I'm roasted.",
        scores: { style: '?', vibes: '?', confidence: '?' }
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: finalMediaType,
              data: image
            }
          },
          {
            text: `You are RoastMe, an AI specialized in humorous photo roasts.
Analyze the photo and write a funny, sharp but never mean, racist, sexist or discriminatory roast in 3-5 sentences.
Focus on visual details: expression, outfit, background, pose, hairstyle, accessories.
IMPORTANT: Respond entirely in ${language}.
After the roast, on a new line output ONLY this JSON with no extra text:
{"style": X, "vibes": Y, "confidence": Z}
where X, Y, Z are scores out of 10.`
          }
        ]
      }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.9 }
    };

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 30000 // 30 second timeout
    });

    // ─── RESPONSE HANDLING ──────────────────────────────────────
    if (!geminiRes.ok) {
      const errorData = await geminiRes.json().catch(() => ({}));
      console.error('Gemini API error:', geminiRes.status, errorData);
      
      return res.status(500).json({
        roast: "Even the AI refused to look at this photo.",
        scores: { style: '?', vibes: '?', confidence: '?' }
      });
    }

    const data = await geminiRes.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!fullText) {
      console.error('No text in Gemini response');
      return res.status(500).json({
        roast: "The AI went silent. That's how bad this photo is.",
        scores: { style: '?', vibes: '?', confidence: '?' }
      });
    }

    // ─── JSON PARSING WITH ROBUST EXTRACTION ────────────────────
    let scores = { style: '?', vibes: '?', confidence: '?' };
    let roastText = fullText.trim();

    try {
      // Find JSON object in the response (more robust regex)
      const jsonMatch = fullText.match(/\{\s*"style"\s*:\s*(\d+)\s*,\s*"vibes"\s*:\s*(\d+)\s*,\s*"confidence"\s*:\s*(\d+)\s*\}/);
      
      if (jsonMatch) {
        // Extract scores with validation
        const styleScore = parseInt(jsonMatch[1]);
        const vibesScore = parseInt(jsonMatch[2]);
        const confidenceScore = parseInt(jsonMatch[3]);

        // Validate scores are in range 0-10
        if (styleScore >= 0 && styleScore <= 10 &&
            vibesScore >= 0 && vibesScore <= 10 &&
            confidenceScore >= 0 && confidenceScore <= 10) {
          
          scores = {
            style: styleScore,
            vibes: vibesScore,
            confidence: confidenceScore
          };

          // Remove JSON from roast text
          roastText = fullText.replace(jsonMatch[0], '').trim();
        }
      }
    } catch (parseErr) {
      console.error('JSON parsing error:', parseErr);
      // Continue with default scores if parsing fails
    }

    // Ensure roastText is not empty
    if (!roastText) {
      roastText = "The photo speaks for itself. No words needed.";
    }

    return res.status(200).json({ roast: roastText, scores });

  } catch (err) {
    console.error('Roast handler error:', err);
    
    // Distinguish between timeout and other errors
    const errorMessage = err.message.includes('timeout')
      ? "The AI took too long to roast you. You're that bad."
      : "Even my circuits crashed looking at this photo.";

    return res.status(500).json({
      roast: errorMessage,
      scores: { style: '?', vibes: '?', confidence: '?' }
    });
  }
}
