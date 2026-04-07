<template>
  <div style="width:100%;padding:32px;overflow-y:auto;display:flex;flex-direction:column;flex:1">
    <div class="sitemap-wrap">

      <!-- Input row -->
      <div class="sitemap-input-row">
        <input type="url" v-model="sitemapUrl" placeholder="https://example.com/sitemap.xml"
          @keyup.enter="doAnalyze" />
        <button class="btn btn-primary" :disabled="store.sitemapLoading" @click="doAnalyze">
          <template v-if="!store.sitemapLoading">Phân tích</template>
          <template v-else>Đang chạy...</template>
        </button>
        <button class="btn btn-ghost" @click="clearSitemap">Xoá</button>
      </div>

      <!-- Status -->
      <div class="sitemap-status" v-show="store.sitemapStatus">
        <div class="spin" v-show="store.sitemapLoading"></div>
        <span>{{ store.sitemapStatus }}</span>
      </div>

      <!-- Stats -->
      <div class="sitemap-stats" v-show="store.sitemapKeywords.length">
        <div class="sitemap-stat">
          <div class="stat-val">{{ store.sitemapUrlCount }}</div>
          <div class="stat-lbl">URLs trong sitemap</div>
        </div>
        <div class="sitemap-stat">
          <div class="stat-val">{{ store.sitemapKeywords.length }}</div>
          <div class="stat-lbl">Từ khóa tìm được</div>
        </div>
        <div class="sitemap-stat">
          <div class="stat-val">{{ store.sitemapKeywords.filter(k => k.difficulty === 'Thấp').length }}</div>
          <div class="stat-lbl">Dễ SEO (difficulty thấp)</div>
        </div>
        <div class="sitemap-stat">
          <div class="stat-val" style="font-size:14px">{{ store.sitemapDomain }}</div>
          <div class="stat-lbl">Domain</div>
        </div>
      </div>

      <!-- Keyword table -->
      <template v-if="store.sitemapKeywords.length">
        <div class="kw-table-wrap">
          <div class="kw-table-header">
            <span>Từ khóa</span>
            <span>Loại trang</span>
            <span>Ý định tìm kiếm</span>
            <span>Difficulty</span>
            <span></span>
          </div>
          <div class="kw-row" v-for="(kw, i) in store.sitemapKeywords" :key="i">
            <div class="kw-keyword">{{ kw.keyword }}</div>
            <div class="kw-cell">{{ kw.type }}</div>
            <div class="kw-cell">{{ kw.intent }}</div>
            <div class="kw-cell">
              <span class="kw-badge"
                :class="kw.difficulty === 'Thấp' ? 'high' : kw.difficulty === 'Trung bình' ? 'med' : 'low'">
                {{ kw.difficulty }}
              </span>
            </div>
            <div>
              <button class="kw-use-btn" @click="store.useKeyword(kw)">Dùng ngay</button>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-if="!store.sitemapKeywords.length && !store.sitemapLoading">
        <div class="sitemap-empty">
          <div class="empty-icon">🗺</div>
          Dán link sitemap XML vào ô trên và nhấn <strong>Phân tích</strong>.<br />
          AI sẽ cào toàn bộ URL, phân tích cấu trúc và gợi ý từ khóa dễ SEO nhất.
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useSeoStore } from "../stores/seo.js";

const store = useSeoStore();
const sitemapUrl = ref("");

// Restore saved sitemap URL from localStorage on mount
const saved = localStorage.getItem("seo_sitemapUrl");
if (saved) sitemapUrl.value = saved;

function doAnalyze() {
  localStorage.setItem("seo_sitemapUrl", sitemapUrl.value);
  store.analyzeSitemap(sitemapUrl.value);
}

function clearSitemap() {
  store.sitemapKeywords = [];
  store.sitemapStatus = "";
  store.sitemapUrlCount = 0;
  store.sitemapDomain = "";
}
</script>
