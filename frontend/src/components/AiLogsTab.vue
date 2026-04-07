<template>
  <div class="ailogs-wrap">
    <!-- Header -->
    <div class="ailogs-page-header">
      <div class="ailogs-page-title">
        <span class="ailogs-page-icon">📡</span>
        <div>
          <h2>AI Logs</h2>
          <p>Theo dõi từng API call — key đã dùng, model, lỗi (nếu có)</p>
        </div>
      </div>
      <button class="btn btn-ghost" @click="store.clearAiLogs()" :disabled="!store.aiLogs.length">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
        </svg>
        Xoá logs
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="!store.aiLogs.length" class="ailogs-empty">
      <div class="ailogs-empty-icon">📡</div>
      <div class="ailogs-empty-title">Chưa có log nào</div>
      <div class="ailogs-empty-sub">Logs sẽ xuất hiện khi bạn gọi AI từ bất kỳ tab nào.</div>
      <div class="ailogs-empty-hints">
        <div class="hint-item">
          <span>✍️</span> <span>Editor — gọi prompt tiêu đề / fanpage</span>
        </div>
        <div class="hint-item">
          <span>🗺</span> <span>Sitemap — phân tích sitemap</span>
        </div>
        <div class="hint-item">
          <span>🔑</span> <span>Đảm bảo đã nhập API key ở topbar</span>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    <div v-else class="ailogs-stats">
      <div class="ailogs-stat">
        <div class="ailogs-stat-val">{{ store.aiLogs.length }}</div>
        <div class="ailogs-stat-lbl">Tổng calls</div>
      </div>
      <div class="ailogs-stat">
        <div class="ailogs-stat-val" style="color:var(--green)">{{ okCount }}</div>
        <div class="ailogs-stat-lbl">Thành công</div>
      </div>
      <div class="ailogs-stat">
        <div class="ailogs-stat-val" style="color:var(--red)">{{ store.aiLogs.length - okCount }}</div>
        <div class="ailogs-stat-lbl">Thất bại</div>
      </div>
      <div class="ailogs-stat">
        <div class="ailogs-stat-val">{{ uniqueKeys }}</div>
        <div class="ailogs-stat-lbl">Keys đã dùng</div>
      </div>
    </div>

    <!-- Log entries -->
    <div v-if="!store.aiLogs.length" />
    <div v-else class="ailogs-list">
      <div class="ailogs-table-header">
        <span>Trạng thái</span>
        <span>Key</span>
        <span>Model</span>
        <span>Chi tiết lỗi / Thành công</span>
      </div>
      <div v-for="(log, i) in store.aiLogs" :key="i" class="ailogs-row"
        :class="log.success ? 'ailogs-row--ok' : 'ailogs-row--fail'">
        <!-- Status -->
        <div class="ailogs-cell ailogs-cell--status">
          <span class="ailogs-status-badge" :class="log.success ? 'ok' : 'fail'">
            <template v-if="log.success">✅</template>
            <template v-else>❌</template>
          </span>
          <span class="ailogs-time">{{ log.time }}</span>
        </div>

        <!-- Key -->
        <div class="ailogs-cell ailogs-cell--key">
          <span class="ailogs-key-label">{{ log.key }}</span>
        </div>

        <!-- Model -->
        <div class="ailogs-cell ailogs-cell--model">
          <template v-if="log.model">
            <span class="ailogs-model-tag">{{ log.model }}</span>
          </template>
          <template v-else>
            <span class="ailogs-model-empty">—</span>
          </template>
        </div>

        <!-- Error / OK -->
        <div class="ailogs-cell ailogs-cell--result">
          <template v-if="log.error">
            <span class="ailogs-error">{{ log.error }}</span>
          </template>
          <template v-else>
            <span class="ailogs-ok">✓ Thành công</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useSeoStore } from "../stores/seo.js";

const store = useSeoStore();

const okCount = computed(() => store.aiLogs.filter(l => l.success).length);
const uniqueKeys = computed(() => new Set(store.aiLogs.map(l => l.key)).size);
</script>

<style scoped>
.ailogs-wrap {
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  padding: 32px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Header */
.ailogs-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.ailogs-page-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ailogs-page-icon {
  font-size: 32px;
  line-height: 1;
}

.ailogs-page-title h2 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 2px;
}

.ailogs-page-title p {
  font-size: 12px;
  color: var(--text-3);
  margin: 0;
  line-height: 1.5;
}

/* Empty state */
.ailogs-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 24px;
  text-align: center;
}

.ailogs-empty-icon {
  font-size: 48px;
  opacity: 0.3;
  margin-bottom: 8px;
}

.ailogs-empty-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.ailogs-empty-sub {
  font-size: 13px;
  color: var(--text-3);
  max-width: 360px;
  line-height: 1.6;
}

.ailogs-empty-hints {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 20px;
  width: 100%;
  max-width: 380px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-2);
}

.hint-item span:first-child {
  font-size: 14px;
  flex-shrink: 0;
}

/* Stats */
.ailogs-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.ailogs-stat {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
}

.ailogs-stat-val {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.ailogs-stat-lbl {
  font-size: 11px;
  color: var(--text-3);
  margin-top: 4px;
  font-weight: 500;
}

/* Table */
.ailogs-list {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.ailogs-table-header {
  display: grid;
  grid-template-columns: 160px 180px 1fr 1fr;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-3);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--bg-3);
}

.ailogs-row {
  display: grid;
  grid-template-columns: 160px 180px 1fr 1fr;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border);
  align-items: center;
  transition: background var(--transition);
  font-size: 12px;
}

.ailogs-row:last-child {
  border-bottom: none;
}

.ailogs-row:hover {
  background: var(--bg-3);
}

.ailogs-row--ok {
  border-left: 3px solid var(--green);
}

.ailogs-row--fail {
  border-left: 3px solid var(--red);
}

.ailogs-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ailogs-cell--status {
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.ailogs-status-badge {
  font-size: 16px;
  line-height: 1;
}

.ailogs-time {
  font-size: 10px;
  color: var(--text-3);
  font-family: var(--font-mono);
}

.ailogs-key-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text);
  font-weight: 500;
  background: var(--bg-3);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.ailogs-model-tag {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
  background: var(--accent-glow);
  padding: 2px 8px;
  border-radius: 20px;
}

.ailogs-model-empty {
  color: var(--text-3);
  font-size: 11px;
}

.ailogs-error {
  color: var(--red);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.ailogs-ok {
  color: var(--green);
  font-size: 11px;
  font-weight: 500;
}
</style>
