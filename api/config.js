import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const router = express.Router();
router.use(cors());
router.use(express.json({ limit: "10mb" }));

const GROQ_API_URL = process.env.GROQ_API_URL ?? "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_API_URL = process.env.GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_DEFAULT_MODEL = process.env.GROQ_DEFAULT_MODEL ?? "openai/gpt-oss-120b";
const GEMINI_DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL ?? "gemini-2.5-flash";

// ─────────────────────────────────────────────
//  CONFIG ENDPOINT
// ─────────────────────────────────────────────
router.get("/config", (_req, res) => {
  res.json({
    models: {
      groq: GROQ_DEFAULT_MODEL,
      gemini: GEMINI_DEFAULT_MODEL,
    },
  });
});

export default router;