import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./style.css";
// CKEditor5 v48 requires its CSS to be imported globally
import "ckeditor5/ckeditor5.css";

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
