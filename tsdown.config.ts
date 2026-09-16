import { defineConfig } from "tsdown";

export default defineConfig({
    entry: ["src/index.ts"],
    tsconfig: "./tsconfig.json",
    format: "esm",
    platform: "node",
    target: "node22",
    dts: true,
    clean: true,
});
