# 🔥 RoastMe

## Structure des fichiers
```
roastme/
├── index.html          ← Site complet (multilingue)
├── api/
│   ├── roast.js        ← Backend Gemini (clé sécurisée)
│   └── counter.js      ← Compteur temps réel (Upstash)
├── vercel.json         ← Config déploiement
└── README.md
```

## Déploiement

### 1. GitHub
- Crée un repo sur github.com
- Upload tous les fichiers (garde la structure api/)

### 2. Vercel
- vercel.com → New Project → importe ton repo
- Clique Deploy

### 3. Variables d'environnement (Vercel → Settings → Environment Variables)

| Nom | Où l'obtenir | Obligatoire |
|-----|-------------|-------------|
| `GEMINI_API_KEY` | aistudio.google.com | ✅ Oui |
| `UPSTASH_REDIS_REST_URL` | upstash.com | ✅ Pour le compteur |
| `UPSTASH_REDIS_REST_TOKEN` | upstash.com | ✅ Pour le compteur |

### 4. Upstash (compteur gratuit)
1. upstash.com → Create Database → Redis
2. Nom : roastme-counter, région : Europe
3. Copie "REST URL" → UPSTASH_REDIS_REST_URL
4. Copie "REST Token" → UPSTASH_REDIS_REST_TOKEN

### 5. Redeploy après avoir ajouté les variables

## Langues supportées
FR · EN · ES · DE · PT · IT · NL · PL · RU · JA · KO · ZH · AR · TR

## Domaine personnalisé
Vercel → Settings → Domains → ajoute ton domaine
Achète sur namecheap.com (~10€/an)
