<template>
  <div class="app">
    <!-- TOPBAR -->
    <header class="topbar">
      <div class="topbar-logo">SEO<span>Studio</span></div>
      <div class="topbar-divider"></div>
      <div class="topbar-tabs">
        <button class="tab-btn" :class="{ active: store.activeTab === 'editor' }" @click="store.activeTab = 'editor'">✍ Editor</button>
        <button class="tab-btn" :class="{ active: store.activeTab === 'company' }" @click="store.activeTab = 'company'">🏢 Công ty</button>
        <button class="tab-btn" :class="{ active: store.activeTab === 'sitemap' }" @click="store.activeTab = 'sitemap'">🗺 Sitemap</button>
        <button class="tab-btn tab-btn--logs" :class="{ active: store.activeTab === 'ailogs' }" @click="store.activeTab = 'ailogs'">
          📡 AI Logs
          <span v-if="store.aiLogs.length" class="tab-btn-badge">{{ store.aiLogs.length }}</span>
        </button>
      </div>
      <div class="topbar-spacer"></div>
      <div class="topbar-api">
        <div class="dot" :style="store.apiKey ? 'background:var(--green);box-shadow:0 0 6px var(--green)' : 'background:var(--red);box-shadow:none'"></div>
        <textarea v-model="store.apiKey" placeholder="key1,key2,key3,..." spellcheck="false"></textarea>
      </div>
    </header>

    <div class="workspace">
      <EditorTab v-show="store.activeTab === 'editor'" />
      <CompanyTab v-show="store.activeTab === 'company'" />
      <SitemapTab v-show="store.activeTab === 'sitemap'" />
      <AiLogsTab v-show="store.activeTab === 'ailogs'" />
    </div>
  </div>

  <!-- Toast Notification -->
  <Transition name="toast">
    <div
      v-if="store.notification.visible"
      class="toast"
      :class="[`toast--${store.notification.type}`, `toast--${store.notification.icon || 'default'}`]"
    >
      <span class="toast__icon">
        <template v-if="store.notification.type === 'success'">✅</template>
        <template v-else-if="store.notification.type === 'error'">❌</template>
        <template v-else-if="store.notification.type === 'info'">ℹ️</template>
        <template v-else>🔔</template>
      </span>
      <span class="toast__message">{{ store.notification.message }}</span>
      <button class="toast__close" @click="store.notification.visible = false">×</button>
    </div>
  </Transition>

  <!-- Float nav -->
  <div class="float-nav">
    <button @click="window.scrollTo({ top: 0, behavior: 'instant' })" title="Lên đầu">↑</button>
    <button @click="window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })" title="Xuống cuối">↓</button>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useSeoStore } from "./stores/seo.js";
import EditorTab from "./components/EditorTab.vue";
import CompanyTab from "./components/CompanyTab.vue";
import SitemapTab from "./components/SitemapTab.vue";
import AiLogsTab from "./components/AiLogsTab.vue";

const store = useSeoStore();

onMounted(async () => {
  store.initPersistence();
  await store.loadPrompts();
});
</script>
