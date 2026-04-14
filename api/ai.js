import { Groq } from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

// Vercel Serverless — POST /api/ai
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { apiKey, prompt, history, model } = req.body ?? {};

  if (!apiKey) return res.status(400).json({ error: "Missing apiKey" });

  const isGroq = apiKey.startsWith("gsk_");
  const isGemini = apiKey.startsWith("AIza");
  const isBeeknoee = apiKey.startWith("sk-bee");
  // alert(apiKey, isBeeknoee);
  return res.status(200).json({ apiKey, isBeeknoee });

  if (!isGroq && !isGemini && !isBeeknoee)
    return res.status(400).json({ error: "Invalid API key prefix" });

  const GROQ_DEFAULT_MODEL = "llama-3.1-8b-instant";
  const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
  const BEEKNOEE_DEFAUL_MODEL = "claude-sonnet-4-5-20250929";

  try {
    if (isGroq) {
      // ── Groq via groq-sdk ────────────────────────────────────────────────
      const groq = new Groq({ apiKey });

      const baseSystem =
        "Return ONLY the final JSON array. Do NOT include reasoning. The final answer MUST be in content.";
      let messages = [];

      if (prompt) {
        messages = [
          { role: "system", content: baseSystem },
          { role: "user", content: prompt },
        ];
      } else if (history) {
        const systemContent = history.system_instruction?.parts?.length
          ? baseSystem + "\n" + history.system_instruction.parts[0].text
          : baseSystem;
        messages = [{ role: "system", content: systemContent }];
        (history.contents ?? []).forEach((item) =>
          messages.push({
            role: item.role === "model" ? "assistant" : "user",
            content: item.parts?.[0]?.text ?? "",
          }),
        );
        if (messages.at(-1)?.role === "assistant") messages.pop();
      }

      const chat = await groq.chat.completions.create({
        model: model ?? GROQ_DEFAULT_MODEL,
        messages,
        temperature: 1,
        max_completion_tokens: 800,
      });

      const result = chat.choices?.[0]?.message?.content?.trim() ?? "";
      return res.status(200).json({ result });
    } else if (isGemini) {
      // ── Gemini via @google/genai ─────────────────────────────────────────
      const ai = new GoogleGenAI({ apiKey });

      let contents = history?.contents ?? [];
      if (!history && prompt) {
        contents = [{ role: "user", parts: [{ text: prompt }] }];
      }

      const response = await ai.models.generateContent({
        model: GEMINI_DEFAULT_MODEL,
        contents,
      });

      const result =
        response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      return res.status(200).json({ result });
    } else if (isBeeknoee) {
      const response = await fetch(
        "https://platform.beeknoee.com/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
          },
          body: JSON.stringify({
            model: BEEKNOEE_DEFAUL_MODEL,
            messages: contents,
          }),
        },
      );

      const data = await response.json();
      const result = data.choices[0].message.content?.trim() ?? "";
      return res.status(200).json({ result });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
