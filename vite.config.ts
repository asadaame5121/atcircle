/// <reference types="vitest" />

import devServer from "@hono/vite-dev-server";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        tailwindcss(),
        devServer({
            entry: "src/index.ts",
        }),
    ],
    test: {
        exclude: ["node_modules/**", "dist/**", "tests/**", ".husky/**"],
    },
    build: {
        outDir: "dist",
        rollupOptions: {
            input: "src/index.ts",
            output: {
                entryFileNames: "index.js",
                format: "esm",
            },
        },
        // Node.js向けの設定
        ssr: true,
    },
});
