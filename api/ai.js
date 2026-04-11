import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { Groq } from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();
router.use(cors());
router.use(express.json({ limit: "10mb" }));

const GROQ_DEFAULT_MODEL =
  process.env.GROQ_DEFAULT_MODEL ?? "openai/gpt-oss-20b";
const GEMINI_DEFAULT_MODEL =
  process.env.GEMINI_DEFAULT_MODEL ?? "gemini-2.5-flash";

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

      const baseSystem =
        "Return ONLY the final JSON array. Do NOT include reasoning. The final answer MUST be in content.";

      if (prompt) {
        msgs = [
          { role: "system", content: baseSystem },
          { role: "user", content: prompt },
        ];
      } else if (history) {
        let systemContent = baseSystem;

        if (history.system_instruction?.parts?.length) {
          systemContent += "\n" + history.system_instruction.parts[0].text;
        }

        msgs.push({
          role: "system",
          content: systemContent,
        });

        (history.contents ?? []).forEach((item) =>
          msgs.push({
            role: item.role == "model" ? "assistant" : "user",
            content: item.parts?.[0]?.text ?? "",
          }),
        );

        if (msgs.at(-1)?.role == "assistant") msgs.pop();
      }

      const groq = new Groq({
        apiKey: apiKey,
      });
      const chatCompletion = await groq.chat.completions.create({
        model: model ?? GROQ_DEFAULT_MODEL,
        messages: msgs,
        temperature: 1,
        max_completion_tokens: 800,
        stream: false,
      });

      const result =
        chatCompletion.choices?.[0]?.message?.content?.trim() ?? "";
      return res.json({ result });
    } else {
      // Gemini non-streaming
      let contents;

      if (history) {
        contents = history.contents ?? [];
      } else if (prompt) {
        contents = [{ role: "user", parts: [{ text: prompt }] }];
      }

      const genAi = new GoogleGenAI({
        apiKey: apiKey,
      });
      const chatCompletion = await genAi.models.generateContent({
        model: model ?? GEMINI_DEFAULT_MODEL,
        contents: contents,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = chatCompletion.text.trim() ?? "";
      return res.json({ result });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
