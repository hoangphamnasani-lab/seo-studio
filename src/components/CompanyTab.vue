<template>
  <div style="width:100%;padding:32px;overflow-y:auto;gap:32px;display:flex;flex-direction:column;flex:1">
    <div style="max-width:900px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:24px;">
      <div>
        <div class="section-label" style="margin-bottom:12px">📝 Thông tin công ty (Markdown)</div>
        <textarea
          v-model="store.companyInfo"
          rows="18"
          style="width:100%;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:16px;outline:none;resize:vertical;line-height:1.7;"
          placeholder="Nhập thông tin công ty theo định dạng Markdown..."
        ></textarea>
      </div>
      <div>
        <div class="section-label" style="margin-bottom:12px">👁 Preview</div>
        <div class="company-preview" style="max-height:none;min-height:300px;" v-html="store.parseMarkdown(store.companyInfo || '_Chưa có nội dung_')"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSeoStore } from "../stores/seo.js";
const store = useSeoStore();
</script>
