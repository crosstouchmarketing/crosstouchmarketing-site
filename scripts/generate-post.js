// scripts/generate-post.js
// Called by GitHub Actions weekly to auto-generate and publish a blog post

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ANTHROPIC_API_KEY;

// ── TOPIC ROTATION ──────────────────────────────────────────────
// These rotate weekly. Add more topics to expand the schedule.
const TOPICS = [
  { title: "The 5 Email Automations Every Business Needs in 2026", category: "Automation", focus: "Cover welcome series, abandoned cart, post-purchase, win-back, and browse abandonment. Explain what each does, when to set it up, and typical revenue impact. Include real benchmarks." },
  { title: "Why Your Open Rates Are Lying to You (And What to Track Instead)", category: "Analytics", focus: "Explain Apple MPP, the death of open rates as a primary metric, and what signals to use instead: click rate, revenue per email, list growth rate, deliverability metrics. Practical and direct." },
  { title: "Email Deliverability in 2026: The Complete Non-Technical Guide", category: "Deliverability", focus: "Cover DKIM, SPF, DMARC in plain English, spam complaint thresholds, list hygiene, warm-up protocols, and how to diagnose deliverability issues. Make it accessible for non-developers." },
  { title: "How to Write Subject Lines That Actually Get Opened", category: "Copywriting", focus: "Cover the psychology of subject lines, curiosity gaps, benefit-driven copy, personalization tokens, emoji use, length optimization, and A/B testing methodology. Include 20 real examples." },
  { title: "The Email Segmentation Playbook: From Basic to Advanced", category: "Email Strategy", focus: "Start with why segmentation matters (stat: segmented campaigns get 14% more opens). Cover behavior-based, demographic, purchase-history, and engagement-tier segmentation. Include implementation steps for Klaviyo and ActiveCampaign." },
  { title: "AI-Powered Email Marketing: What's Actually Working in 2026", category: "AI Marketing", focus: "Cover practical AI use cases: subject line generation, send time optimization, predictive segmentation, dynamic content, churn prediction. Be specific about tools and what's hype vs reality." },
  { title: "List Hygiene 101: How to Clean Your Email List Without Losing Revenue", category: "List Health", focus: "Cover why list hygiene matters, how to identify unengaged subscribers, sunset flows, re-engagement sequences, suppression lists, and the right time to delete vs suppress. Include step-by-step for major ESPs." },
  { title: "The Post-Purchase Email Sequence That Turns Buyers Into Brand Loyalists", category: "Automation", focus: "Deep dive into post-purchase sequencing: timing, content mix, cross-sell strategy, review requests, loyalty program introduction, and LTV impact. Include a full 7-email sequence outline." },
  { title: "How to Calculate (and Improve) Your Email Program ROI", category: "Analytics", focus: "Walk through email revenue attribution, cost calculation, benchmark ROI figures by industry, and 5 specific tactics to improve ROI within 30 days. Include formulas and worked examples." },
  { title: "The Win-Back Campaign Playbook: Re-Engage Subscribers Who've Gone Cold", category: "Email Strategy", focus: "Cover why subscribers go cold, the psychology of re-engagement, timing windows, subject line strategies, incentive vs non-incentive approaches, and when to sunset unresponsive contacts." },
  { title: "Welcome Email Series Best Practices: First Impressions That Convert", category: "Copywriting", focus: "Cover the anatomy of a high-converting welcome series, ideal length (3-5 emails), content sequencing, personalization, expectation setting, and how to measure welcome series performance." },
  { title: "Email Marketing Benchmarks by Industry: Where Does Your Program Stand?", category: "Analytics", focus: "Comprehensive benchmark data across open rates, click rates, conversion rates, and unsubscribe rates for ecommerce, B2B, coaching/creator, and agency verticals. Include how to interpret your numbers against benchmarks." },
];

// Pick topic based on current week number for consistent rotation
function getCurrentTopic() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return TOPICS[weekNum % TOPICS.length];
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function readTime(content) {
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const mins = Math.ceil(words / 200);
  return mins + ' min';
}

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content[0].text);
        } catch(e) {
          reject(new Error('Failed to parse API response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildPostHTML(topic, content, date, slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${topic.title} — CrossTouch Marketing</title>
<meta name="description" content="${topic.excerpt}"/>
<meta property="og:title" content="${topic.title}"/>
<meta property="og:description" content="${topic.excerpt}"/>
<meta property="og:type" content="article"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--teal:#0a6b6f;--teal-dark:#084f52;--cyan-light:#d6f2f2;--white:#fff;--off-white:#f4f9f9;--border:#b8dede;--text:#0a1f26;--text-mid:#1e4a52;--text-light:#3d6b73;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--white);color:var(--text);-webkit-font-smoothing:antialiased;}
nav{background:rgba(255,255,255,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 40px;height:68px;display:flex;align-items:center;justify-content:space-between;}
nav a{text-decoration:none;font-size:14px;font-weight:600;color:var(--text-mid);}
nav a:hover{color:var(--teal);}
.nav-cta{background:var(--teal) !important;color:white !important;padding:10px 22px;border-radius:8px;}
.hero{background:linear-gradient(135deg,var(--teal-dark),var(--teal));color:white;padding:80px 24px 60px;}
.hero-inner{max-width:760px;margin:0 auto;}
.cat{font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;opacity:0.75;margin-bottom:12px;}
h1{font-family:'Playfair Display',serif;font-size:clamp(28px,4vw,44px);line-height:1.1;letter-spacing:-0.02em;margin-bottom:16px;}
.meta{font-size:13px;opacity:0.7;font-weight:500;}
.content{max-width:760px;margin:0 auto;padding:60px 24px 80px;}
.content h2{font-family:'Playfair Display',serif;font-size:26px;margin:40px 0 14px;letter-spacing:-0.01em;color:var(--text);}
.content h3{font-size:18px;font-weight:700;margin:28px 0 10px;color:var(--text);}
.content p{font-size:17px;color:var(--text-mid);line-height:1.8;margin-bottom:18px;font-weight:500;}
.content ul,.content ol{margin:0 0 18px 24px;font-size:17px;color:var(--text-mid);line-height:1.8;font-weight:500;}
.content li{margin-bottom:6px;}
.content strong{color:var(--text);font-weight:700;}
.content blockquote{border-left:4px solid var(--teal);background:var(--cyan-light);padding:16px 20px;margin:24px 0;border-radius:0 10px 10px 0;font-style:italic;color:var(--text-mid);}
.cta-box{background:linear-gradient(135deg,var(--teal-dark),var(--teal));color:white;border-radius:20px;padding:40px;text-align:center;margin:48px 0;}
.cta-box h3{font-family:'Playfair Display',serif;font-size:24px;margin-bottom:10px;}
.cta-box p{font-size:15px;opacity:0.85;margin-bottom:24px;font-weight:500;}
.cta-btn{background:white;color:var(--teal-dark);padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;}
</style>
</head>
<body>
<nav style="padding:0 40px;">
  <a href="../index.html" style="font-family:'Playfair Display',serif;font-size:17px;color:var(--text);">CrossTouch Marketing</a>
  <div style="display:flex;gap:24px;align-items:center;">
    <a href="../blog.html">← All Posts</a>
    <a href="../index.html#pricing" class="nav-cta">Get Started</a>
  </div>
</nav>

<div class="hero">
  <div class="hero-inner">
    <div class="cat">${topic.category}</div>
    <h1>${topic.title}</h1>
    <div class="meta">CrossTouch Marketing · ${new Date(date).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · ${topic.readTime} read</div>
  </div>
</div>

<div class="content">
${content}

<div class="cta-box">
  <h3>Put these insights to work.</h3>
  <p>Run a free audit of your email program and get a personalized 90-day action plan — in 5 minutes.</p>
  <a href="../index.html#audit" class="cta-btn">Run My Free Audit →</a>
</div>
</div>

</body>
</html>`;
}

async function main() {
  console.log('🚀 Starting blog post generation...');

  if (!API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }

  const topic = getCurrentTopic();
  const today = new Date().toISOString().split('T')[0];
  const slug = slugify(topic.title) + '-' + today;

  console.log('📝 Generating post:', topic.title);

  // Generate the full post content
  const contentPrompt = `You are a senior email marketing strategist at CrossTouch Marketing with 15+ years of lifecycle and growth marketing experience. Write a comprehensive, authoritative blog post on the following topic.

Topic: ${topic.title}
Category: ${topic.category}
Focus and requirements: ${topic.focus}

Write the full blog post body in clean HTML using only these tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <blockquote>.

Requirements:
- 1,200–1,800 words
- Authoritative, direct tone — not generic AI content
- Specific, actionable advice with real numbers and benchmarks where relevant
- Structured for AEO (Answer Engine Optimization): clear headers, FAQ-style sections where appropriate, direct answers to common questions
- Include a "Key Takeaways" section at the end with 4–6 bullet points
- No markdown, no code blocks, no preamble — just the HTML body content starting with the first <h2> or <p>`;

  const postContent = await callClaude(contentPrompt);

  // Generate excerpt
  const excerptPrompt = `Write a 1-2 sentence excerpt (max 160 characters) for this blog post titled "${topic.title}". Category: ${topic.category}. Focus: ${topic.focus}. Make it compelling and direct. Return only the excerpt text, nothing else.`;
  const excerpt = (await callClaude(excerptPrompt)).trim().substring(0, 200);

  topic.readTime = readTime(postContent);
  topic.excerpt = excerpt;

  // Build HTML file
  const postHTML = buildPostHTML(topic, postContent, today, slug);

  // Write post file
  const postPath = path.join(__dirname, '..', 'posts', slug + '.html');
  fs.writeFileSync(postPath, postHTML, 'utf8');
  console.log('✅ Post file written:', postPath);

  // Update posts.json
  const postsPath = path.join(__dirname, '..', 'posts.json');
  let posts = [];
  try {
    posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
  } catch(e) {
    posts = [];
  }

  // Avoid duplicates
  const exists = posts.find(p => p.slug === slug);
  if (!exists) {
    posts.unshift({
      slug: slug,
      title: topic.title,
      category: topic.category,
      excerpt: excerpt,
      date: today,
      readTime: topic.readTime
    });
    fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2), 'utf8');
    console.log('✅ posts.json updated. Total posts:', posts.length);
  } else {
    console.log('ℹ️  Post already exists in posts.json, skipping.');
  }

  console.log('🎉 Done! Post published:', topic.title);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
