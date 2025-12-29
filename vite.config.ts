import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";

export default defineConfig({
    plugins: [
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
