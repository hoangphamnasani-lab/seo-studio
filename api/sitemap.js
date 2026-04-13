// Vercel Serverless — GET /api/sitemap?url=...
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

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
      if (text.trim().startsWith("<!") || text.trim().startsWith("<html"))
        continue;
      if (text.includes("<urlset") || text.includes("<sitemapindex")) {
        res.setHeader("Content-Type", "application/xml");
        return res.status(200).send(text);
      }
    } catch (e) {
      continue;
    }
  }
  return res.status(404).json({ error: "Không thể fetch sitemap" });
}

function expandSitemapUrl(url) {
  const candidates = [url];
  try {
    const u = new URL(url);
    if (u.protocol === "http:")
      candidates.unshift(url.replace("http://", "https://"));
    if (!u.hostname.startsWith("www."))
      candidates.push(url.replace(u.hostname, "www." + u.hostname));
    else
      candidates.push(url.replace(u.hostname, u.hostname.replace("www.", "")));
  } catch (e) {}
  return [...new Set(candidates)];
}
