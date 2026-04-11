import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { marked } from "marked";
import { jsonrepair } from "jsonrepair";
marked.setOptions({
  mangle: false,
  headerIds: false,
  breaks: true,
  gfm: true,
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function setStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}
function getStore(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

export const useSeoStore = defineStore("seo", () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const apiKey = ref("");
  const keyword = ref("");
  const title = ref("");
  const desc = ref("");
  const href = ref("");
  const website = ref("");
  const companyInfo = ref("");
  const imagePrompts = ref("");
  const inputHtml = ref("");
  const imageUrls = ref("");
  const editorContent = ref("");

  const promptTitle = ref("");
  const promptFanpage = ref("");

  const chatHistory = ref({
    system_instruction: {
      parts: [{ text: "Bạn là chuyên gia SEO và Content Marketing hàng đầu." }],
    },
    contents: [],
  });
  const isResponding = ref(false);

  const activeTab = ref("editor");

  const sitemapLoading = ref(false);
  const sitemapStatus = ref("");
  const sitemapKeywords = ref([]);
  const sitemapContext = ref(null);
  const sitemapUrlCount = ref(0);
  const sitemapDomain = ref("");
  const sitemapRawUrls = ref([]);

  const genTitleLoading = ref(false);
  const usedTitles = ref([]);

  // Title list: array of { text, used, charCount }
  const titleList = ref([]);
  const selectedTitleIndex = ref(-1);

  const notification = ref({ message: "", type: "success", visible: false });

  // ── AI Logs ────────────────────────────────────────────────────────────────
  const aiLogs = ref([]); // { time, key, model, success, error }

  function addAiLog({ key = "", model = "", success = false, error = "" }) {
    aiLogs.value.unshift({
      time: new Date().toLocaleTimeString(),
      key,
      model,
      success,
      error,
    });
    // Giữ tối đa 50 entry
    if (aiLogs.value.length > 50) aiLogs.value.splice(50);
  }

  function clearAiLogs() {
    aiLogs.value = [];
  }

  // ── Task Progress Logs ─────────────────────────────────────────────────────
  const taskLogs = ref([]); // Array of { step, message, status }
  let _logTimer = null;
  function addLog(step, message, status = "pending") {
    taskLogs.value.push({
      step,
      message,
      status,
      time: new Date().toLocaleTimeString(),
    });
    // Auto scroll
    if (_logTimer) clearTimeout(_logTimer);
    _logTimer = setTimeout(() => {
      // Trigger reactivity
      taskLogs.value = [...taskLogs.value];
    }, 50);
  }
  function updateLog(index, status, message) {
    if (taskLogs.value[index]) {
      taskLogs.value[index].status = status;
      if (message) taskLogs.value[index].message = message;
    }
  }
  function clearLogs() {
    taskLogs.value = [];
  }

  // ── Notify ─────────────────────────────────────────────────────────────────
  let _notifyTimer = null;
  function notify(message, type = "success") {
    notification.value = { message, type, visible: true };
    clearTimeout(_notifyTimer);
    _notifyTimer = setTimeout(() => {
      notification.value.visible = false;
    }, 2800);
  }

  // ── Persist / Restore ──────────────────────────────────────────────────────
  function initPersistence() {
    const fields = {
      apiKey,
      keyword,
      title,
      desc,
      href,
      website,
      companyInfo,
      imagePrompts,
      imageUrls,
    };
    const keys = {
      apiKey: "seo_apiKey",
      keyword: "seo_keyword",
      title: "seo_name",
      desc: "seo_desc",
      href: "seo_href",
      website: "seo_website",
      companyInfo: "seo_companyInfo",
      imagePrompts: "seo_image_prompts",
      imageUrls: "seo_imageUrls",
    };

    for (const [prop, storeKey] of Object.entries(keys)) {
      const saved = getStore(storeKey);
      if (saved !== null) fields[prop].value = saved;
      watch(fields[prop], (v) => setStore(storeKey, v));
    }

    // usedTitles
    try {
      const ut = getStore("used_titles");
      if (ut) usedTitles.value = JSON.parse(ut);
    } catch (e) {}

    // titleList + selectedTitleIndex
    try {
      const tl = getStore("title_list");
      if (tl) titleList.value = JSON.parse(tl);
    } catch (e) {}
    try {
      const idx = getStore("selected_title_index");
      if (idx !== null) selectedTitleIndex.value = parseInt(idx, 10);
    } catch (e) {}

    // Sitemap
    try {
      const kw = getStore("seo_sitemapKeywords");
      if (kw) sitemapKeywords.value = JSON.parse(kw);
    } catch (e) {}
    try {
      const ctx = getStore("seo_sitemapContext");
      if (ctx) sitemapContext.value = JSON.parse(ctx);
    } catch (e) {}
    try {
      const meta = JSON.parse(getStore("seo_sitemapMeta") ?? "{}");
      if (meta.urlCount) sitemapUrlCount.value = meta.urlCount;
      if (meta.domain) sitemapDomain.value = meta.domain;
      if (meta.status) sitemapStatus.value = meta.status;
    } catch (e) {}

    // Auto-save watchers
    watch(
      sitemapKeywords,
      (v) => {
        try {
          setStore("seo_sitemapKeywords", JSON.stringify(v));
        } catch (e) {}
      },
      { deep: true },
    );
    watch(
      sitemapContext,
      (v) => {
        try {
          setStore("seo_sitemapContext", JSON.stringify(v));
        } catch (e) {}
      },
      { deep: true },
    );
    watch([sitemapUrlCount, sitemapDomain, sitemapStatus], saveSitemapMeta);

    // Auto-save titleList & selectedTitleIndex
    watch(
      titleList,
      (v) => {
        try {
          setStore("title_list", JSON.stringify(v));
        } catch (e) {}
      },
      { deep: true },
    );
    watch(selectedTitleIndex, (v) => {
      try {
        setStore("selected_title_index", String(v));
      } catch (e) {}
    });
  }

  function saveSitemapMeta() {
    setStore(
      "seo_sitemapMeta",
      JSON.stringify({
        urlCount: sitemapUrlCount.value,
        domain: sitemapDomain.value,
        status: sitemapStatus.value,
      }),
    );
  }

  // ── Load prompt files ──────────────────────────────────────────────────────
  async function loadPrompts() {
    try {
      promptTitle.value = await fetch("/promt_title.md").then((r) => r.text());
    } catch (e) {}
    try {
      promptFanpage.value = await fetch("/promt_fanpage.md").then((r) =>
        r.text(),
      );
    } catch (e) {}
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function cleanKeys(k) {
    if (!k) return [];
    return [
      ...new Set(
        k.split(",").map((x) =>
          x
            .trim()
            .replace(/\s/g, "")
            .replace(/[^0-9A-Za-z\-_,]/g, ""),
        ),
      ),
    ].filter(Boolean);
  }

  async function callAIWithFallback(keys, prompt) {
    for (const key of keys) {
      try {
        const response = await fetch("/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: key, prompt }),
        });

        const text = await response.json();
        if (text.error) {
          addAiLog({ key: keyLabel(key), success: false, error: text.error });
        } else {
          addAiLog({ key: keyLabel(key), success: true });
          return text.result;
        }
      } catch (err) {
        addAiLog({ key: keyLabel(key), success: false, error: err.error });
        console.warn(`[callAIWithFallback] Key thất bại:`, err.error);
      }
    }
    return null; // tất cả keys đều thất bại
  }

  function keyLabel(key) {
    return key ? key.slice(0, 8) + "..." : "?";
  }

  function removeLongDash(text) {
    return text.replace(/–/g, "-");
  }

  function slugify(text) {
    return text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getCurrentDate() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  function saveUsedTitles() {
    setStore("used_titles", JSON.stringify(usedTitles.value.slice(-500)));
  }

  // ── Generate Title ─────────────────────────────────────────────────────────
  async function generateTitle() {
    if (!keyword.value.trim()) {
      notify("Nhập từ khóa trước khi tạo tiêu đề", "error");
      return;
    }
    const keys = cleanKeys(apiKey.value);
    if (!keys.length) {
      notify("Nhập API key trước", "error");
      return;
    }

    genTitleLoading.value = true;
    selectedTitleIndex.value = -1;

    const usedList = usedTitles.value.length
      ? `\n\nCÁC TIÊU ĐỀ ĐÃ DÙNG (KHÔNG ĐƯỢC LẶP LẠI Ý TƯỞNG):\n${usedTitles.value
          .slice(-50)
          .map((t, i) => `${i + 1}. ${t}`)
          .join("\n")}`
      : "";

    const prompt = `Bạn là chuyên gia SEO copywriting. Tạo 10 tiêu đề bài viết SEO ĐỘC ĐÁO và KHÁC NHAU HOÀN TOÀN về cách tiếp cận cho từ khóa sau.
      Từ khóa: "${keyword.value}"${website.value ? `\nWebsite: ${website.value}` : ""}${desc.value ? `\nMô tả sơ bộ: ${desc.value}` : ""}${usedList}

      YÊU CẦU:
      - Mỗi tiêu đề dài 50-65 ký tự (lý tưởng cho Google SERP)
      - Chứa từ khóa tự nhiên, không nhồi nhét
      - Đa dạng cách tiếp cận: có số (Top 5, 7 cách...), câu hỏi (Tại sao..., Làm sao...), listicle (Những..., Các...), benefit-driven (Lợi ích..., Giải pháp...), emotional ( Bí quyết..., Thủ thuật...)
      - KHÁC HOÀN TOÀN về góc nhìn, format và emotional hook so với danh sách đã dùng
      - Viết bằng ngôn ngữ phù hợp với website (Tiếng Việt nếu website VN, Tiếng Anh nếu website quốc tế)

      Trả về JSON array hợp lệ, mỗi tiêu đề là một string, không có backtick code block, không giải thích, không đánh số thứ tự:
      ["Tiêu đề 1","Tiêu đề 2","Tiêu đề 3","Tiêu đề 4","Tiêu đề 5","Tiêu đề 6","Tiêu đề 7","Tiêu đề 8","Tiêu đề 9","Tiêu đề 10"]`;

    const raw = await callAIWithFallback(keys, prompt);
    if (raw) {
      try {
        // Parse JSON array từ response
        let clean = raw.trim();
        // Loại bỏ backtick code block nếu có
        clean = clean
          .replace(/^```json\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
        let parsed = JSON.parse(clean);

        // Hỗ trợ nếu AI trả về dạng {titles: [...]} hoặc {titles: "..."}
        if (!Array.isArray(parsed)) {
          const keys2 = Object.keys(parsed);
          parsed = parsed[keys2[0]] || [];
        }
        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Tạo titleList mới, chưa used
          titleList.value = parsed
            .slice(0, 10)
            .map((t) => ({
              text: String(t)
                .trim()
                .replace(/^["']|["']$/g, ""),
              used: false,
              charCount: String(t).trim().length,
            }))
            .filter((t) => t.text.length > 10);

          // Nếu ít hơn 10, fill cho đủ 10 (tránh lỗi UI)
          while (titleList.value.length < 10) {
            titleList.value.push({
              text: `Tiêu đề mẫu ${titleList.value.length + 1}`,
              used: false,
              charCount: 0,
            });
          }

          notify(`✓ Đã tạo ${titleList.value.length} tiêu đề mới`, "success");
        } else {
          notify("AI không trả về đúng định dạng, thử lại", "error");
        }
      } catch (e) {
        console.error("[generateTitle] Parse error:", e, raw);
        notify("Parse tiêu đề thất bại, thử lại", "error");
      }
    } else {
      notify("Tất cả API key thất bại", "error");
    }

    genTitleLoading.value = false;
  }

  // ── Select Title from list ─────────────────────────────────────────────────
  function selectTitle(index) {
    if (titleList.value[index] && !titleList.value[index].used) {
      selectedTitleIndex.value = index;
      title.value = titleList.value[index].text;
    }
  }

  // ── Mark selected title as used (called after successful write) ────────────
  function markTitleUsed() {
    if (
      selectedTitleIndex.value >= 0 &&
      titleList.value[selectedTitleIndex.value]
    ) {
      const selected = titleList.value[selectedTitleIndex.value];
      selected.used = true;
      // Add to global usedTitles for uniqueness tracking
      if (!usedTitles.value.includes(selected.text)) {
        usedTitles.value.push(selected.text);
        saveUsedTitles();
      }
      selectedTitleIndex.value = -1;
      // Clear active title so user must select another
      title.value = "";
    }
  }

  // ── Build prompt text ──────────────────────────────────────────────────────
  function buildPrompt(type) {
    let content = type === "fanpage" ? promptFanpage.value : promptTitle.value;
    content = content
      .replace(/###keyword###/gm, keyword.value ?? "")
      .replace(/###title###/gm, title.value ?? "")
      .replace(/###website###/gm, website.value ?? "")
      .replace(/###href###/gm, href.value ?? "");

    // Thêm image URLs cho prompt title
    if (type === "title" && imageUrls.value?.trim()) {
      const urls = imageUrls.value
        .trim()
        .split("\n")
        .filter((u) => u.trim());
      if (urls.length) {
        content = content.replace(
          /###image_urls###/gm,
          urls.map((u) => `![${keyword.value}](${u.trim()})`).join("\n"),
        );
      } else {
        content = content.replace(/###image_urls###/gm, "(Không có ảnh)");
      }
    } else {
      content = content.replace(/###image_urls###/gm, "(Không có ảnh)");
    }

    const company = (companyInfo.value ?? "").trim();
    content = content.replace(
      /###company###/gm,
      company
        ? company
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n")
        : "",
    );
    const ctx = getContextBlock();
    if (ctx) content += ctx;
    return content;
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  function sanitizeMixedContent(raw) {
    if (!raw) return "";

    // 1. Nếu toàn bộ content bị wrap trong 1 thẻ <p>...</p> → bóc ra
    const unwrapped = raw.replace(/^\s*<p[^>]*>([\s\S]*?)<\/p>\s*$/i, "$1");
    const content = unwrapped !== raw ? unwrapped : raw;

    // 2. Convert các HTML tag inline còn sót thành markdown
    return (
      content
        // <strong>text</strong> → **text**
        .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
        // <em>text</em> → *text*
        .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
        // <a href="url">text</a> → [text](url)
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
        // <img src="url" alt="alt"> → ![alt](url)
        .replace(
          /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
          "![$2]($1)",
        )
        .replace(
          /<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi,
          "![$1]($2)",
        )
        // <h2>text</h2> → ## text
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1")
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1")
        .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "#### $1")
        // <br> → newline
        .replace(/<br\s*\/?>/gi, "\n")
        // Xóa các tag HTML còn lại không cần thiết
        .replace(/<\/?p[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        // Fix \n bị escape thành literal \\n trong JSON
        .replace(/\\n/g, "\n")
        // Dọn dẹp quá nhiều dòng trống
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }
  function parseJsonFromMarkdown(raw) {
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      const data = JSON.parse(jsonrepair ? jsonrepair(clean) : clean);
      if (!data || typeof data !== "object") return null;

      if (data.seo_title) title.value = data.seo_title;
      if (data.seo_description) desc.value = data.seo_description;
      if (data.keyword) keyword.value = data.keyword;
      if (data.content) {
        const cleanMd = sanitizeMixedContent(data.content);
        editorContent.value = marked.parse(cleanMd);
      }
      if (data.image_prompts) {
        imagePrompts.value = Array.isArray(data.image_prompts)
          ? data.image_prompts.join("\n\n")
          : data.image_prompts;
      }
      return data.seo_title || data.content ? data : null;
    } catch (e) {
      console.error("[parseJsonFromMarkdown]", e);
      return null;
    }
  }

  async function connectSSE(promptText) {
    const keys = cleanKeys(apiKey.value);
    if (!keys.length) {
      notify("Nhập API key trước", "error");
      return;
    }

    chatHistory.value.contents.push({
      role: "user",
      parts: [{ text: promptText }],
    });

    isResponding.value = true;

    // Thử từng key cho đến khi thành công
    const raw = await callAIWithFallback(keys, promptText);

    if (raw) {
      // Push AI response to chat history
      chatHistory.value.contents.push({
        role: "model",
        parts: [{ text: raw }],
      });

      notify("Bài viết đã tạo xong!", "success");
    } else {
      notify("Tất cả API key thất bại", "error");
    }

    isResponding.value = false;
  }

  async function sendChat(text) {
    if (!text.trim()) return;
    await connectSSE(text, false);
  }

  async function sendPrompt(type) {
    const keys = cleanKeys(apiKey.value);
    if (!keys.length) {
      notify("Nhập API key trước", "error");
      return;
    }

    // Clear logs và bắt đầu mới
    desc.value = "";
    editorContent.value = "";
    imagePrompts.value = "";
    clearLogs();
    addLog("Bắt đầu", "Khởi tạo tác vụ...", "progress");
    addLog("Gửi prompt", "Đang gửi yêu cầu đến AI...", "pending");
    addLog("AI xử lý", "AI đang viết nội dung...", "pending");
    addLog("Parse kết quả", "Đang xử lý kết quả...", "pending");
    addLog("Hoàn thành", "Đang hiển thị nội dung...", "pending");

    const prompt = buildPrompt(type);

    // Push prompt vào chat history
    chatHistory.value.contents.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    updateLog(0, "done", "Đã khởi tạo tác vụ");
    updateLog(1, "done", "Đã gửi prompt");

    isResponding.value = true;

    // Thử từng key cho đến khi thành công
    let accumulated = null;
    for (let i = 0; i < keys.length; i++) {
      try {
        updateLog(
          2,
          "progress",
          `AI đang xử lý (key ${i + 1}/${keys.length})...`,
        );
        const response = await fetch("/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: keys[i], prompt }),
        });

        if (!response.ok) continue;
        const j = await response.json();
        if (j.error) continue;
        accumulated = j.result ?? "";
        break; // thành công → thoát vòng lặp
      } catch (err) {
        accumulated = null;
        console.warn(`[sendPrompt] Key thất bại:`, err.message);
        continue;
      }
    }

    if (!accumulated) {
      updateLog(2, "error", "Tất cả API key thất bại");
      updateLog(3, "error", "Tất cả API key thất bại");
      updateLog(4, "error", "Tất cả API key thất bại");
      notify("Tất cả API key thất bại", "error");
      isResponding.value = false;
      return;
    }

    // Push AI response vào chat history
    chatHistory.value.contents.push({
      role: "model",
      parts: [{ text: accumulated }],
    });

    updateLog(2, "done", `AI đã xử lý xong (${accumulated.length} ký tự)`);

    // Parse JSON
    updateLog(3, "progress", "Đang parse kết quả JSON...");
    const parsed = parseJsonFromMarkdown(accumulated);
    if (parsed) {
      updateLog(3, "done", "Đã parse kết quả thành công");
      updateLog(4, "done", "Hoàn thành!");
      // Mark selected title as used after successful write
      markTitleUsed();
      notify("Bài viết đã tạo xong!", "success");
    } else {
      updateLog(3, "error", "Parse JSON thất bại!");
      console.error("[sendPrompt] Parse failed. Raw:", accumulated);
      notify("Parse kết quả thất bại!", "error");
    }

    isResponding.value = false;
  }

  // ── Copy HTML + Lưu vào chrome.storage cho Extension ──────────────────────
  function copyHtml() {
    let content = editorContent.value;
    if (content) {
      const div = document.createElement("div");
      div.innerHTML = content;
      div.querySelectorAll("h2").forEach((el) => {
        el.style.fontSize = "24px";
        el.style.fontWeight = "700";
      });
      div.querySelectorAll("h3").forEach((el) => {
        el.style.fontSize = "20px";
        el.style.fontWeight = "600";
      });
      div.querySelectorAll("h4").forEach((el) => {
        el.style.fontSize = "18px";
        el.style.fontWeight = "600";
      });
      div.querySelectorAll("p").forEach((el) => {
        el.style.fontSize = "16px";
      });
      div.querySelectorAll("li").forEach((el) => {
        el.style.fontSize = "16px";
      });
      div.querySelectorAll("img").forEach((el) => {
        el.setAttribute("alt", keyword.value);
        el.setAttribute("width", "600");
        el.style.width = "600px";

        if (el.parentElement) {
          el.parentElement.style.fontSize = "16px";
          el.parentElement.style.textAlign = "center";
        } else {
          const p = document.createElement("p");
          p.style.textAlign = "center";
          el.parentElement?.replaceChild(p, el);
          p.appendChild(el);
        }
      });
      content = div.innerHTML;
    }

    // Lưu vào localStorage để content script có thể đọc
    // Tạo slug từ title
    const slug = (title.value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Tạo linkweb = href + slug
    const baseHref = (href.value || "").replace(/\/$/, ""); // bỏ dấu / cuối
    const linkweb = baseHref ? `${baseHref}/${slug}` : slug;

    const seoData = {
      title: title.value || "",
      desc: desc.value || "",
      keyword: keyword.value || "",
      content: content || "",
      slug: slug,
      linkweb: linkweb,
    };
    localStorage.setItem("seo_studio_copy", JSON.stringify(seoData));

    // Gửi message tới content script để lưu vào chrome.storage
    window.postMessage({ type: "SEO_STUDIO_COPY", data: seoData }, "*");

    // Copy HTML vào clipboard như cũ
    navigator.clipboard
      .writeText(content)
      .then(() => notify("Đã copy HTML + lưu data cho extension", "success"))
      .catch(() => notify("Copy thất bại", "error"));
  }

  function reset() {
    if (!confirm("Reset toàn bộ nội dung?")) return;
    keyword.value = "";
    title.value = "";
    desc.value = "";
    editorContent.value = "";
    chatHistory.value = {
      system_instruction: chatHistory.value.system_instruction,
      contents: [],
    };
    imagePrompts.value = "";
    sitemapKeywords.value = [];
    sitemapUrlCount.value = 0;
    sitemapDomain.value = "";
    sitemapStatus.value = "";
    Object.keys(localStorage)
      .filter((k) => k.startsWith("seo_") || k === "used_titles")
      .forEach((k) => localStorage.removeItem(k));
    notify("Đã reset", "success");
  }

  // ── Sitemap ────────────────────────────────────────────────────────────────
  function parseSitemapXml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "application/xml");
    const sitemapLocs = [...doc.querySelectorAll("sitemap > loc")].map((n) =>
      n.textContent.trim(),
    );
    if (sitemapLocs.length) return { type: "index", urls: sitemapLocs };
    const urls = [...doc.querySelectorAll("url > loc")].map((n) =>
      n.textContent.trim(),
    );
    return { type: "urlset", urls };
  }

  function extractSlugWords(urls) {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "of",
      "in",
      "on",
      "at",
      "to",
      "for",
      "with",
      "by",
      "from",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "that",
      "this",
      "these",
      "those",
      "it",
      "its",
      "we",
      "our",
      "you",
      "your",
      "they",
      "their",
      "he",
      "she",
      "his",
      "her",
      "me",
      "my",
      "him",
      "us",
      "vn",
      "com",
      "net",
      "org",
      "www",
      "html",
      "php",
      "asp",
      "page",
      "pages",
      "post",
      "posts",
      "blog",
      "tag",
      "tags",
      "category",
      "categories",
      "search",
      "index",
      "home",
      "about",
      "contact",
      "sitemap",
      "feed",
      "rss",
      "amp",
      "lang",
      "vi",
      "en",
    ]);
    const freq = {};
    for (const url of urls) {
      try {
        const path = new URL(url).pathname;
        const words = path
          .toLowerCase()
          .replace(/[^a-z0-9\-\/]/g, " ")
          .split(/[\/\-_\s]+/)
          .filter((w) => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));
        for (const w of words) freq[w] = (freq[w] || 0) + 1;
      } catch (e) {}
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 80)
      .map(([w, c]) => ({ word: w, count: c }));
  }

  /**
   * Call AI đơn lẻ (cho sitemap / phân tích).
   * Thử lần lượt từng key cho đến khi thành công.
   */
  async function callAI(prompt) {
    const keys = cleanKeys(apiKey.value);
    if (!keys.length) throw new Error("Không có API key");

    for (const key of keys) {
      try {
        const r = await fetch("/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: key, prompt }),
        });

        if (!r.ok) {
          addAiLog({
            key: keyLabel(key),
            success: false,
            error: `HTTP ${r.status}`,
          });
          continue;
        }
        const j = await r.json();
        if (j.error) {
          addAiLog({ key: keyLabel(key), success: false, error: j.error });
          continue;
        }
        addAiLog({
          key: keyLabel(key),
          model: j.model || keyLabel(key),
          success: true,
        });
        return j.result ?? "";
      } catch (err) {
        addAiLog({ key: keyLabel(key), success: false, error: err.message });
        console.warn(`[callAI] Key thất bại:`, err.message);
        continue;
      }
    }
    throw new Error("Tất cả API key thất bại");
  }

  async function _analyzeKeywords({ sampleUrls, wordCtx, urls }) {
    const prompt = `Bạn là chuyên gia SEO. Phân tích sitemap của "${sitemapDomain.value}" và đề xuất từ khóa TỐT NHẤT để tăng lượt click.
      URL mẫu (${urls.length} tổng):
      ${sampleUrls}

      Từ phổ biến trong slug: ${wordCtx}

      YÊU CẦU:
      - Chỉ chọn từ khóa CÓ THẬT, phù hợp ngành và nội dung website
      - Ưu tiên long-tail có search intent rõ ràng (thương mại hoặc thông tin)
      - LOẠI BỎ: từ khóa chung chung, vô nghĩa, không liên quan đến website
      - Mỗi từ khóa phải thuyết phục để viết bài tin tức/blog tăng click
      - Đề xuất 20-30 từ khóa đa dạng

      Trả về JSON hợp lệ (không backtick):
      {"keywords":[{"keyword":"...","type":"Sản phẩm|Danh mục|Blog|Dịch vụ|So sánh|Hướng dẫn","intent":"Thương mại|Thông tin|Điều hướng|Giao dịch","difficulty":"Thấp|Trung bình|Cao","reason":"Lý do nên viết bài về từ khóa này"}]}`;

    try {
      const result = await callAI(prompt);
      const clean = result.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      sitemapKeywords.value = data.keywords ?? [];
    } catch (err) {
      console.error("[_analyzeKeywords]", err);
    }
  }

  async function _analyzeContext({ sampleUrls, wordCtx, urls }) {
    const prompt = `Bạn là chuyên gia Content Strategy. Phân tích sitemap của "${sitemapDomain.value}" để AI viết bài KHÔNG SAI SỰ THẬT.
      URL mẫu (${urls.length} tổng):
      ${sampleUrls}

      Từ phổ biến: ${wordCtx}

      NHIỆM VỤ:
      1. Xác định CHỦ ĐỀ CHÍNH website cung cấp (tối đa 8 topics)
      2. Liệt kê URL quan trọng nhất (tối đa 10) nên được link đến khi viết bài
      3. Mô tả ngắn brand: họ cung cấp gì, cho ai, ở đâu

      Trả về JSON hợp lệ (không backtick):
      {"brand_summary":"Mô tả 2-3 câu về brand","brand_topics":["chủ đề 1","chủ đề 2"],"link_targets":[{"url":"https://...","anchor_suggestion":"anchor text","topic":"chủ đề trang này"}]}`;

    try {
      const result = await callAI(prompt);
      const clean = result.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      sitemapContext.value = {
        brand_summary: data.brand_summary ?? "",
        brand_topics: data.brand_topics ?? [],
        link_targets: data.link_targets ?? [],
      };
    } catch (err) {
      console.error("[_analyzeContext]", err);
      sitemapContext.value = {
        brand_summary: "",
        brand_topics: [],
        link_targets: [],
      };
    }
  }

  function getContextBlock() {
    if (!sitemapContext.value?.brand_summary) return "";
    const ctx = sitemapContext.value;
    const topics = (ctx.brand_topics ?? []).join(", ");
    const targets = (ctx.link_targets ?? [])
      .slice(0, 6)
      .map((t) => `  - [${t.anchor_suggestion}](${t.url}): ${t.topic}`)
      .join("\n");
    return [
      "\n\n---",
      "**CONTEXT BRAND (bắt buộc tuân theo khi viết bài):**",
      `Website: ${sitemapDomain.value}`,
      `Brand cung cấp: ${ctx.brand_summary}`,
      topics ? `Chủ đề được phép viết: ${topics}` : "",
      targets ? `URL nên nhắc đến/link đến:\n${targets}` : "",
      "**Không được viết thông tin sai sự thật hoặc ngoài phạm vi brand trên.**",
      "---",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function analyzeSitemap(sitemapUrl) {
    if (!sitemapUrl) {
      notify("Nhập URL sitemap trước", "error");
      return;
    }
    if (!sitemapUrl.startsWith("http")) {
      notify("URL phải bắt đầu bằng http/https", "error");
      return;
    }
    const keys = cleanKeys(apiKey.value);
    if (!keys.length) {
      notify("Nhập API key trước", "error");
      return;
    }

    sitemapLoading.value = true;
    sitemapKeywords.value = [];
    sitemapContext.value = null;
    sitemapStatus.value = "⏳ Đang fetch sitemap...";

    try {
      const r = await fetch(`/sitemap?url=${encodeURIComponent(sitemapUrl)}`);
      if (!r.ok) {
        const j = await r.json();
        throw new Error(j.error ?? "Fetch failed");
      }
      const xmlText = await r.text();
      let { type, urls } = parseSitemapXml(xmlText);

      if (type === "index") {
        sitemapStatus.value = `Tìm thấy ${urls.length} sitemap con, đang fetch...`;
        const childResults = await Promise.allSettled(
          urls
            .slice(0, 5)
            .map((u) =>
              fetch(`/sitemap?url=${encodeURIComponent(u)}`).then((r) =>
                r.text(),
              ),
            ),
        );
        urls = childResults.flatMap((res) =>
          res.status === "fulfilled" ? parseSitemapXml(res.value).urls : [],
        );
      }

      sitemapUrlCount.value = urls.length;
      sitemapRawUrls.value = urls;
      try {
        sitemapDomain.value = new URL(urls[0] || sitemapUrl).hostname;
      } catch (e) {
        sitemapDomain.value = "—";
      }

      const topWords = extractSlugWords(urls);
      const sampleUrls = urls.slice(0, 80).join("\n");
      const wordCtx = topWords
        .slice(0, 30)
        .map((w) => `${w.word}:${w.count}`)
        .join(", ");
      const shared = { sampleUrls, wordCtx, urls };

      sitemapStatus.value = `✅ Đã cào ${urls.length} URL — AI đang phân tích song song...`;
      notify(`Đã cào ${urls.length} URL, đang phân tích...`, "success");

      await Promise.allSettled([
        _analyzeKeywords(shared),
        _analyzeContext(shared),
      ]);

      sitemapStatus.value = `✅ ${sitemapKeywords.value.length} từ khóa · Brand context sẵn sàng`;
      notify("Phân tích sitemap hoàn tất!", "success");
    } catch (err) {
      sitemapStatus.value = "Lỗi: " + err.message;
      notify(err.message, "error");
    }
    sitemapLoading.value = false;
  }

  function useKeyword(kw) {
    keyword.value = kw.keyword;
    activeTab.value = "editor";
    notify(`Đã chọn: "${kw.keyword}"`, "success");
  }

  function extractImages(html, base) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const seen = new Set();
    const result = [];

    doc.querySelectorAll("img").forEach((img) => {
      const raw = img.getAttribute("data-src") || img.getAttribute("src") || "";
      if (raw.includes("upload/") && !seen.has(raw)) {
        seen.add(raw);
        result.push(base + raw);
      }
    });

    return result;
  }

  function runExtract() {
    const urls = extractImages(inputHtml.value, href.value);
    imageUrls.value = urls.join("\n");
  }

  const copyToClipboard = (text, successMsg = "Đã copy") => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        notify(successMsg, "success");
      })
      .catch(() => {
        notify("Không thể copy", "error");
      });
  };

  return {
    // State
    apiKey,
    keyword,
    title,
    desc,
    href,
    website,
    companyInfo,
    imagePrompts,
    imageUrls,
    inputHtml,
    editorContent,
    promptTitle,
    promptFanpage,
    chatHistory,
    isResponding,
    activeTab,
    sitemapLoading,
    sitemapStatus,
    sitemapKeywords,
    sitemapContext,
    sitemapUrlCount,
    sitemapDomain,
    genTitleLoading,
    titleList,
    selectedTitleIndex,
    usedTitles,
    notification,
    taskLogs,
    aiLogs,
    clearAiLogs,
    initPersistence,
    loadPrompts,
    notify,
    removeLongDash,
    generateTitle,
    selectTitle,
    sendChat,
    sendPrompt,
    copyHtml,
    reset,
    analyzeSitemap,
    useKeyword,
    slugify,
    getCurrentDate,
    copyToClipboard,
    runExtract,
    parseMarkdown: (content) => {
      if (!content) return "";
      return marked.parse(content);
    },
  };
});
