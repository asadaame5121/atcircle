# Agent Guidelines

## 開発ルール
1. 日本語で応答すること。
2. ファイルの作成・ドキュメント記述も日本語で行うこと。
3. テスト駆動開発 (TDD) を採用すること（Red → Green → Refactor）。

## パッケージマネージャ規約
- **パッケージマネージャには必ず `pnpm` を使用すること**（`npm` は使用禁止）。
- パッケージ追加: `pnpm add <pkg>` / `pnpm add -D <pkg>`
- 依存関係のインストール: `pnpm install`

## 主要開発コマンド
```bash
# 開発サーバー起動
pnpm dev

# 本番ビルド (CSS生成 + Viteビルド)
pnpm build

# 単体テスト (Vitest)
pnpm test

# E2Eテスト (Playwright)
pnpm test:e2e

# リント & フォーマット (Biome)
pnpm lint
pnpm format
```
