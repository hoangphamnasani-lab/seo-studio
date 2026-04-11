import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const router = express.Router();
router.use(cors());

// ─────────────────────────────────────────────
//  PROXY: Sitemap fetch (avoids CORS on client)
// ─────────────────────────────────────────────
router.get("/sitemap", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url" });

  const candidates = expandSitemapUrl(url);
  for (const candidate of candidates) {
    try {
      const r = await fetch(candidate, {
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOStudio/1.0)" },
        redirect: "follow",
      });
      if (!r.ok) continue;
      const text = await r.text();
      if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) continue;
      if (text.includes("<urlset") || text.includes("<sitemapindex")) {
        res.setHeader("Content-Type", "application/xml");
        return res.send(text);
      }
    } catch (e) {
      continue;
    }
  }
  res.status(404).json({ error: "Không thể fetch sitemap" });
});

function expandSitemapUrl(url) {
  const candidates = [url];
  try {
    const u = new URL(url);
    if (u.protocol === "http:") candidates.unshift(url.replace("http://", "https://"));
    if (!u.hostname.startsWith("www."))
      candidates.push(url.replace(u.hostname, "www." + u.hostname));
    else
      candidates.push(url.replace(u.hostname, u.hostname.replace("www.", "")));
  } catch (e) {}
  return [...new Set(candidates)];
}

export default router;