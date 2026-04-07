<template>
  <div style="width:100%;display:flex;overflow:hidden;flex:1">

    <!-- LEFT SIDEBAR -->
    <aside class="panel-left">

      <!-- Meta fields -->
      <div class="panel-section">
        <div class="section-label">🔤 SEO Meta</div>
        <div class="field">
          <label>Từ khóa</label>
          <input type="text" v-model="store.keyword" placeholder="Từ khóa chính..." />
        </div>
        <div class="field">
          <label>Tiêu đề bài viết</label>
          <div class="field-inline">
            <input type="text" v-model="store.title" placeholder="Tiêu đề SEO..."
              @paste="store.title = store.removeLongDash(store.title)"
              @keyup="store.title = store.removeLongDash(store.title)" />
            <button type="button" class="btn-random-title" :class="{ spinning: store.genTitleLoading }"
              :disabled="store.genTitleLoading" @click="store.generateTitle()" title="Random tiêu đề mới">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <polyline points="23 20 23 14 17 14"></polyline>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="field">
          <label>Mô tả (meta description)</label>
          <textarea v-model="store.desc" rows="3" placeholder="Mô tả ngắn..."></textarea>
        </div>
      </div>

      <!-- Link meta -->
      <div class="panel-section">
        <div class="section-label">🔗 Liên kết</div>
        <div class="meta-row">
          <div class="field">
            <label>Href / Base URL</label>
            <input type="text" v-model="store.href" placeholder="https://..." />
          </div>
          <div class="field">
            <label>Tên website</label>
            <input type="text" v-model="store.website" placeholder="Website..." />
          </div>
        </div>
      </div>

      <!-- Image URLs -->
      <div class="panel-section">
        <div class="section-label">📷 Hình ảnh</div>
        <div class="field">
          <textarea v-model="store.imageUrls" rows="3"
            placeholder="Nhập link ảnh (mỗi dòng 1 link)&#10;https://example.com/uploads/img1.jpg"></textarea>
        </div>
      </div>

      <!-- Task Progress Logs -->
      <div class="panel-section" v-if="store.taskLogs.length > 0">
        <div class="section-label">📋 Tiến trình</div>
        <div class="task-logs">
          <div v-for="(log, i) in store.taskLogs" :key="i"
            class="task-log" :class="'status-' + log.status">
            <span class="log-icon">
              <span v-if="log.status === 'done'">✅</span>
              <span v-else-if="log.status === 'error'">❌</span>
              <span v-else-if="log.status === 'progress'">⏳</span>
              <span v-else>⭕</span>
            </span>
            <span class="log-step">{{ log.step }}:</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>

      <!-- Prompts -->
      <div class="panel-section">
        <div class="section-label">⚡ Tạo nội dung AI</div>
        <div class="prompt-actions">
          <button class="btn btn-amber btn-full" type="button" @click="store.sendPrompt('title')">
            <span>📝</span> Prompt Tiêu đề
          </button>
          <button class="btn btn-primary btn-full" type="button" @click="store.sendPrompt('fanpage')">
            <span>📣</span> Prompt Fanpage
          </button>
        </div>
      </div>

      <!-- Image prompts -->
      <div class="panel-section">
        <div class="section-label">🖼 Image Prompts</div>
        <textarea class="image-prompts-area" v-model="store.imagePrompts" readonly rows="4"
          placeholder="Image prompts sẽ xuất hiện ở đây..."></textarea>
        <button class="btn btn-ghost btn-sm btn-full" style="margin-top:6px"
          @click="store.copyToClipboard(store.imagePrompts, 'Đã copy image prompts')">
          Copy prompts
        </button>
      </div>

      <!-- Actions -->
      <div class="panel-section" style="flex:none">
        <div class="btn-row">
          <button class="btn btn-success" @click="store.copyHtml()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy HTML
          </button>
          <button class="btn btn-danger" @click="store.reset()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 .49-3.45"></path>
            </svg>
            Reset
          </button>
        </div>
      </div>
    </aside>

    <!-- CENTER: CKEditor -->
    <main class="panel-center">
      <div class="panel-center-header">
        <h2>Nội dung bài viết</h2>
        <div class="word-count-badge">{{ wordCount }} từ</div>
      </div>
      <div class="editor-wrap">
        <CKEditorWrapper />
      </div>
    </main>

    <!-- RIGHT: Chat -->
    <aside class="panel-right">
      <div class="chat-header">
        <h3>AI ASSISTANT</h3>
      </div>
      <div class="chat-body" ref="chatBodyRef">
        <template v-if="!store.chatHistory.contents?.length">
          <div class="chat-empty">
            <div class="chat-empty-icon">✦</div>
            <p>Hãy đặt câu hỏi cho AI<br />hoặc tạo nội dung bằng Prompt</p>
          </div>
        </template>
        <template v-for="(chat, index) in store.chatHistory.contents ?? []" :key="index">
          <div v-if="chat.role === 'user'" class="msg out" v-html="store.parseMarkdown(chat.parts[0].text ?? '')"></div>
          <div v-else class="msg in">
            <div v-html="store.parseMarkdown(chat.parts[0].text ?? '')"></div>
            <div v-if="store.isResponding && index === (store.chatHistory.contents?.length ?? 0) - 1"
              class="chat-loader">
              <span></span><span></span><span></span>
            </div>
          </div>
        </template>
      </div>
      <div class="chat-footer">
        <div class="chat-input-wrap">
          <input type="text" ref="chatInputRef" v-model="chatInput" :disabled="store.isResponding"
            placeholder="Hỏi AI..." @keyup.enter="handleSend" />
          <button class="chat-send" :disabled="store.isResponding" @click="handleSend">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useSeoStore } from "../stores/seo.js";
import CKEditorWrapper from "./CKEditorWrapper.vue";

const store = useSeoStore();
const chatInput = ref("");
const chatBodyRef = ref(null);

async function handleSend() {
  if (!chatInput.value.trim() || store.isResponding) return;
  const text = chatInput.value;
  chatInput.value = "";
  await store.sendChat(text);
}

watch(() => store.chatHistory.contents, async () => {
  await nextTick();
  if (chatBodyRef.value) chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight;
}, { deep: true });

const wordCount = computed(() => {
  const text = store.editorContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return text.split(" ").filter(w => w.length > 0).length;
});

</script>

<style scoped>
/* Task Logs */
.task-logs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}
.task-log {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #f5f5f5;
}
.task-log.status-done {
  background: #e8f5e9;
}
.task-log.status-error {
  background: #ffebee;
}
.task-log.status-progress {
  background: #e3f2fd;
}
.log-icon {
  font-size: 14px;
}
.log-step {
  font-weight: 600;
  color: #333;
}
.log-message {
  color: #666;
}
</style>
