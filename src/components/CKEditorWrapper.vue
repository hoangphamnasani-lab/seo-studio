<template>
  <div id="editor-container">
    <div v-if="!editorReady" class="editor-loading">
      <div class="editor-loading-spinner"></div>
      <span>Đang tải editor...</span>
    </div>
    <Ckeditor v-else :editor="ClassicEditor" v-model="store.editorContent" :config="finalConfig"
      @ready="onEditorReady" />
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, markRaw, computed } from "vue";
import { useSeoStore } from "../stores/seo.js";

const store = useSeoStore();
const editorReady = ref(false);
const ClassicEditor = shallowRef(null);
const Ckeditor = shallowRef(null);

// Chúng ta sẽ build config động sau khi đã load plugins
const dynamicPlugins = shallowRef([]);

const finalConfig = computed(() => ({
  licenseKey: "GPL",
  // Đưa danh sách plugin đã import vào đây
  plugins: dynamicPlugins.value,
  toolbar: {
    items: [
      'sourceEditing',
      'showBlocks',
      '|',
      'heading',
      'style',
      '|',
      'fontSize',
      'fontFamily',
      'fontColor',
      'fontBackgroundColor',
      '|',
      'bold',
      'italic',
      'underline',
      '|',
      'link',
      'insertTable',
      'insertImage',
      'blockQuote',
      'codeBlock',
      '|',
      'alignment',
      '|',
      'bulletedList',
      'numberedList',
      'todoList',
    ],
    shouldNotGroupWhenFull: true,
  },
  image: {
    toolbar: [
      'imageStyle:inline',
      'imageStyle:block',
      '|',
      'imageTextAlternative',
      'imageCaption',
      'resizeImage',
    ],
  },
  heading: {
    options: [
      { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
      { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
      { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
      { model: "heading4", view: "h4", title: "Heading 4", class: "ck-heading_heading4" },
    ],
  },
  link: {
    addTargetToExternalLinks: true,
    defaultProtocol: 'https://',
    decorators: {
      toggleDownloadable: {
        mode: 'manual',
        label: 'Downloadable',
        attributes: {
          download: 'file',
        },
      },
    },
  },
  list: {
    properties: {
      styles: true,
      startIndex: true,
      reversed: true,
    },
  },
  mention: {
    feeds: [
      {
        marker: '@',
        feed: [
          /* See: https://ckeditor.com/docs/ckeditor5/latest/features/mentions.html */
        ],
      },
    ],
  },
  menuBar: {
    isVisible: true,
  },
  placeholder: 'Type or paste your content here!',
  style: {
    definitions: [
      {
        name: 'Article category',
        element: 'h3',
        classes: ['category'],
      },
      {
        name: 'Title',
        element: 'h2',
        classes: ['document-title'],
      },
      {
        name: 'Subtitle',
        element: 'h3',
        classes: ['document-subtitle'],
      },
      {
        name: 'Info box',
        element: 'p',
        classes: ['info-box'],
      },
      {
        name: 'Side quote',
        element: 'blockquote',
        classes: ['side-quote'],
      },
      {
        name: 'Marker',
        element: 'span',
        classes: ['marker'],
      },
      {
        name: 'Spoiler',
        element: 'span',
        classes: ['spoiler'],
      },
      {
        name: 'Code (dark)',
        element: 'pre',
        classes: ['fancy-code', 'fancy-code-dark'],
      },
      {
        name: 'Code (bright)',
        element: 'pre',
        classes: ['fancy-code', 'fancy-code-bright'],
      },
    ],
  },
  table: {
    contentToolbar: [
      'tableColumn',
      'tableRow',
      'mergeTableCells',
      'tableProperties',
      'tableCellProperties',
    ],
  },
}));

onMounted(async () => {
  try {
    // 1. Import toàn bộ thư viện
    const ck5 = await import("ckeditor5");
    const ckVue = await import("@ckeditor/ckeditor5-vue");

    // 2. Trích xuất cẩn thận. Lưu ý: Một số plugin có tên khác một chút 
    // hoặc phải lấy từ đúng namespace của gói ckeditor5
    const {
      ClassicEditor: Editor,
      SourceEditing,
      Essentials, Heading, Bold, Italic, Underline, Strikethrough,
      Link, BlockQuote, List, Table, TableToolbar, Undo,
      GeneralHtmlSupport,
      FontFamily, FontSize, FontColor, FontBackgroundColor,
      Alignment,
      Highlight,
      CodeBlock,
      TodoList,
      ShowBlocks,
      Style,
      Image,
      ImageCaption,
      ImageStyle,
      ImageToolbar,
      ImageResizeEditing,
      ImageResizeHandles,
      ImageBlock,
      ImageInsertViaUrl,
    } = ck5;

    // 3. Đưa vào mảng plugins (Đảm bảo không có cái nào bị undefined)
    const pluginsArray = [
      Essentials, Heading, Bold, Italic, Underline, Strikethrough,
      Link, BlockQuote, List, Table, TableToolbar, Undo,
      SourceEditing, GeneralHtmlSupport, FontFamily, FontSize, FontColor,
      FontBackgroundColor, Alignment, Highlight, CodeBlock, TodoList,
      Image,
      ShowBlocks, Style,
      Image,
      ImageCaption,
      ImageStyle,
      ImageToolbar,
      ImageResizeEditing,
      ImageResizeHandles,
      ImageBlock,
      ImageInsertViaUrl,
    ].filter(p => p !== undefined); // Loại bỏ các plugin bị lỗi import (undefined)

    dynamicPlugins.value = markRaw(pluginsArray);

    ClassicEditor.value = markRaw(Editor);
    Ckeditor.value = markRaw(ckVue.Ckeditor);
    editorReady.value = true;
  } catch (e) {
    console.error("CKEditor load error:", e);
  }
});

function onEditorReady(editor) {
  const saved = localStorage.getItem("seo_editor_content");
  if (saved && !store.editorContent) {
    store.editorContent = saved;
  }

  editor.model.document.on("change:data", () => {
    clearTimeout(window._editorTimer);
    window._editorTimer = setTimeout(() => {
      localStorage.setItem("seo_editor_content", store.editorContent);
    }, 1000);
  });
}
</script>

<style scoped>
/* Giữ nguyên CSS của bạn */
.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 40px;
  color: var(--text-3);
  font-size: 13px;
}

.editor-loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>