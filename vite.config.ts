import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
export default defineConfig({
  define: { __SITE_URL__: JSON.stringify(process.env.SITE_URL || "") },
  resolve: { tsconfigPaths: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react-vendor", test: /node_modules[\\/]react(?:-dom)?[\\/]/, minSize: 20000 },
            { name: "supabase-vendor", test: /node_modules[\\/]@supabase[\\/]/, minSize: 20000 },
            { name: "tanstack-vendor", test: /node_modules[\\/]@tanstack[\\/]/, minSize: 20000 },
            { name: "vendor", test: /node_modules[\\/]/, minSize: 20000 },
          ],
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
});
