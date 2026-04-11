// Root server — kết hợp tất cả API routes cho Vercel
import configRouter from "./api/config.js";
import aiRouter from "./api/ai.js";
import sitemapRouter from "./api/sitemap.js";

export { configRouter, aiRouter, sitemapRouter };
