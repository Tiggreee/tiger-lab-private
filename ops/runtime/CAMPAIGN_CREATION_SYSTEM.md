# Campaign Creation System: 4-Agent Architecture

## The Problem
Old system: Generic images (emojis + colored backgrounds + white text) = looks cheap, damages trust, doesn't convert.

## The Solution
**4-Agent Workflow** for professional, market-driven, visually stunning campaigns:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAMPAIGN CREATION FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. MARKET RESEARCHER AGENT                                    │
│     ↓ Market insights, copy angles, keywords, channels         │
│                                                                 │
│  2. VISUAL DESIGNER AGENT                                      │
│     ↓ Professional image specs (NO emojis, NO AI cartoons)     │
│                                                                 │
│  3. ASSET GENERATOR AGENT                                      │
│     ↓ Real images from Unsplash/Pexels/Pixabay (100% free)   │
│                                                                 │
│  4. CREATIVE AGENT                                             │
│     ↓ Synthesizes everything + generates 6 unique channels     │
│                                                                 │
│  📦 OUTPUT: Professional 6-channel campaign                     │
│     • Proven copy (market-backed)                              │
│     • Professional images (real stock photos)                  │
│     • Optimized per channel                                    │
│     • Persistent memory of performance                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Each Agent's Role

### 1️⃣ Market Researcher Agent
**Purpose:** Backs copy decisions with real market data

**Generates:**
- 5 pain points per target segment
- 3-5 proven positioning angles
- Top 10 keywords that convert
- Channel-specific strategies
- Audience motivations & concerns
- Competitive positioning statement

**Command:**
```bash
node engine/campaigns/market-researcher-agent.mjs --research \
  --product "Docflow API" \
  --segment contabilidad
```

**Output:** `ops/runtime/market-research/docflow-api-contabilidad.json`

---

### 2️⃣ Visual Designer Agent
**Purpose:** Create professional image specifications (no garbage)

**Generates:**
- Visual style per channel (modern, trustworthy, professional)
- Specific mood & color palettes
- Exact dimensions per platform
- What to AVOID (emojis, AI cartoons, clichés)
- Search keywords for finding images
- Quality standards (HIGH RESOLUTION, REAL PHOTOS ONLY)

**Commands:**
```bash
# Full visual spec for product
node engine/campaigns/visual-designer-agent.mjs --design \
  --product "Docflow API" \
  --segment contabilidad

# Single channel brief
node engine/campaigns/visual-designer-agent.mjs --brief \
  --product "Docflow API" \
  --segment contabilidad \
  --channel linkedin
```

**Output:** `ops/runtime/visual-design/docflow-api-visual-spec.json`

---

### 3️⃣ Asset Generator Agent
**Purpose:** Find real professional images from FREE sources

**Provides:**
- Direct links to Unsplash, Pexels, Pixabay
- Step-by-step download instructions
- 100% legal verification (no copyright issues)
- Image catalog by industry
- Image tracking log (which channel = which image)

**Commands:**
```bash
# Asset catalog with source links
node engine/campaigns/asset-generator-agent.mjs --catalog \
  --product "Docflow API" \
  --segment contabilidad \
  --channel email

# Download guide (how to find images)
node engine/campaigns/asset-generator-agent.mjs --guide \
  --product "Docflow API" \
  --segment contabilidad

# Image tracking log
node engine/campaigns/asset-generator-agent.mjs --log \
  --product "Docflow API"
```

**Output:** 
- `ops/runtime/campaign-assets/docflow-api-asset-catalog.json`
- `ops/runtime/campaign-assets/docflow-api-download-guide.json`
- `ops/runtime/campaign-assets/docflow-api-image-log.json`

---

### 4️⃣ Creative Agent
**Purpose:** Synthesize all inputs + create 6-channel campaign

**Uses:**
- Market Researcher insights (copy angles, keywords)
- Visual Designer specs (image requirements)
- Asset Generator guidance (where to find images)
- Persistent memory (past campaign performance)

**Creates:**
- 6 unique channel copies (email, LinkedIn, X, Facebook, Telegram, Discord)
- Professional image specifications per channel
- Campaign scoring (0-100)
- Self-improvement recommendations
- Performance memory for next iteration

**Command:**
```bash
node engine/campaigns/creative-agent.mjs --create \
  --product "Docflow API" \
  --segment contabilidad
```

**Output:** `ops/runtime/campaigns/CAMP-{id}/`
- `email.html` — Email template
- `linkedin.txt` — LinkedIn copy
- `x.txt` — X/Twitter copy (280 chars)
- `facebook.txt` — Facebook copy
- `telegram.md` — Telegram markdown
- `discord.md` — Discord markdown
- `campaign.json` — Full metadata
- `scorecard.json` — Performance score
- `analysis.json` — Recommendations + market insights

---

## Complete Workflow (Step-by-Step)

### 1. Research the Market
```bash
node engine/campaigns/market-researcher-agent.mjs --research \
  --product "Docflow API" \
  --segment contabilidad
```

**Output example:**
```
Pain Points:
  • 10+ hours/week lost to manual work
  • SAT compliance is a nightmare
  • Integration issues

Top Copy Angles:
  1. "Automatiza {action}. Recupera {time_unit}."
  2. "❌ Deja de {problem}. Empieza a {solution}."

Best Keywords:
  Automatización • SAT • CFDI • Facturación • Timbre
```

### 2. Design the Visuals (Professional Specs)
```bash
node engine/campaigns/visual-designer-agent.mjs --design \
  --product "Docflow API" \
  --segment contabilidad
```

**Output example:**
```
EMAIL (600x300):
  Style: Modern minimalist business professional
  Mood: Trustworthy, efficient
  Avoid: Emojis, cartoons, overly bright colors
  Search: "accountant working"

LINKEDIN (1200x627):
  Style: Thought leadership / data visualization
  Mood: Expert, data-driven
  Search: "finance analytics"
```

### 3. Get Image Sources
```bash
node engine/campaigns/asset-generator-agent.mjs --guide \
  --product "Docflow API" \
  --segment contabilidad
```

**Output example:**
```
Quick Download:
  1. Go to Unsplash.com
  2. Search: "accounting office professional"
  3. Find image matching Visual Designer spec
  4. Click "Download Free"
  5. Done! 100% legal for commercial use

Alternative sources:
  • Pexels.com (also free, no login)
  • Pixabay.com (also free, instant download)
```

### 4. Create the Campaign
```bash
node engine/campaigns/creative-agent.mjs --create \
  --product "Docflow API" \
  --segment contabilidad
```

**Output:**
- ✅ Market insights automatically applied to copy
- ✅ Visual design specs generated for each channel
- ✅ Asset sourcing guide provided
- ✅ 6 unique channel copies
- ✅ Persistent memory updated
- ✅ Score: 100/100 🏆

### 5. Download Images (Manual Step)
- Visit Unsplash/Pexels/Pixabay links from Asset Generator
- Download images matching Visual Designer specs
- Save to `ops/runtime/campaign-assets/{product}/`
- Update campaign.json with image URLs

### 6. Learn & Improve
```bash
node engine/campaigns/creative-agent.mjs --learn
```

**Output:**
```
Recent avg: 90/100 (overall avg: 88/100)
Status: 🚀 IMPROVING (+20 points)
Next: Test channel-specific hooks
```

---

## Why This Works

| Element | Before | After |
|---------|--------|-------|
| **Images** | Emoji + colored bg + white text | Real professional stock photos |
| **Copy** | Generic templates | Market-backed, proven angles |
| **Channels** | All same tone | Optimized per platform |
| **Performance** | No memory | Persistent learning |
| **Professionalism** | Looks cheap | Looks premium |
| **Conversion** | ❓ Unknown | Trackable & improvable |

---

## Free Image Sources (100% Legal)

### ✅ Unsplash
- https://unsplash.com
- License: Free for commercial use
- Quality: Premium
- Download: 1-click, no login needed
- Attribution: Optional but recommended

### ✅ Pexels
- https://www.pexels.com
- License: Free, no attribution required
- Quality: High
- Download: Instant
- Attribution: Not needed

### ✅ Pixabay
- https://pixabay.com
- License: Free, commercial use
- Quality: High
- Download: Fast
- Attribution: Not required

### ✅ StockSnap
- https://stocksnap.io
- License: Free for commercial
- Quality: Professional
- Download: Easy

---

## Key Rules

1. **NO AI-generated cartoons** — They look cheap and damage trust
2. **NO emoji + color background** — That's 2010s design
3. **NO generic stock photo clichés** — Fake smiles, overused scenarios
4. **YES real professional images** — Build trust, look modern, convert better
5. **YES market-backed copy** — Based on real pain points + proven angles
6. **YES persistent learning** — Each campaign makes you smarter

---

## Current Status

✅ **Market Researcher Agent** — Generates market briefs with segments, pain points, copy angles
✅ **Visual Designer Agent** — Creates professional image specs (NO emojis/AI cartoons)
✅ **Asset Generator Agent** — Links to free stock images (Unsplash/Pexels/Pixabay)
✅ **Creative Agent** — Synthesizes all inputs, creates 6-channel campaigns, learns from performance
✅ **Integration** — All 4 agents work together seamlessly
✅ **Tests** — PASS (smoke test)
✅ **Production Gate** — GO (18/18)

---

## Next Steps

1. Run the 4-agent workflow for your first product
2. Download real images from free sources
3. Test campaign on your audience
4. Measure performance (opens, clicks, conversions)
5. Run `--learn` command to improve next iteration
6. Repeat: Better copy + better images + better targeting = better results
