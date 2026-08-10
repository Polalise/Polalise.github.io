import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://polalise.github.io",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith("/404/") && !page.endsWith("/404.html")
    })
  ],
  build: {
    format: "directory"
  },
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp"
    }
  }
});
