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
//  UNIFIED NON-STREAMING AI ENDPOINT
// ─────────────────────────────────────────────
router.post("/ai", async (req, res) => {
  const { apiKey, prompt, history, model } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: "Missing apiKey" });
  }

  const isGroq = apiKey.startsWith("gsk_");
  const isGemini = apiKey.startsWith("AIza");

  if (!isGroq && !isGemini) {
    return res.status(400).json({ error: "Invalid API key prefix" });
  }

  try {
    if (isGroq) {
      // Groq non-streaming
      let msgs = [];

      if (prompt) {
        msgs = [{ role: "user", content: prompt }];
      } else if (history) {
        if (history.system_instruction?.parts?.length) {
          msgs.push({ role: "system", content: history.system_instruction.parts[0].text });
        }
        (history.contents ?? []).forEach((item) =>
          msgs.push({ role: item.role === "model" ? "assistant" : "user", content: item.parts?.[0]?.text ?? "" })
        );
        if (msgs.at(-1)?.role === "assistant") msgs.pop();
      }

      const upstream = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model ?? GROQ_DEFAULT_MODEL,
          messages: msgs,
          stream: false,
        }),
      });

      if (!upstream.ok) {
        const err = await upstream.json();
        return res.status(500).json({ error: err.error?.message ?? "Groq error" });
      }

      const j = await upstream.json();
      const result = j.choices?.[0]?.message?.content ?? "";
      return res.json({ result });
    } else {
      // Gemini non-streaming
      let contents;

      if (history) {
        contents = history.contents ?? [];
      } else if (prompt) {
        contents = [{ role: "user", parts: [{ text: prompt }] }];
      }

      const upstream = await fetch(
        `${GEMINI_API_URL}/${GEMINI_DEFAULT_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents }),
        }
      );

      if (!upstream.ok) {
        const err = await upstream.json();
        return res.status(500).json({ error: err.error?.message ?? "Gemini error" });
      }

      const j = await upstream.json();
      const result = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;