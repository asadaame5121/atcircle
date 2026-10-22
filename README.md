# AT CIRCLE

AT CIRCLE は、ATProto を利用して個人サイト同士をつなぐウェブリングです。
Bluesky アカウントでログインし、サイトの登録、リングの作成・参加、埋め込み
ウィジェットによるサイト間移動、RSS 更新の閲覧ができます。

## 主な機能

- Bluesky の ATProto OAuth を使ったログイン
- Bluesky プロフィールからのサイト候補検出と手動登録
- ウェブリングの作成、参加、承認、メンバー管理
- **Companion Navigation（コンパニオン巡回ナビゲーション）**:
  - 加入サイト無改造で巡回可能な独立型コンパニオンUI（`/rings/companion`）
  - 前へ (Previous) / ランダム (Random) / 次へ (Next) / サイトを開く (Visit site ↗)
  - 巡回履歴セッションのローカル永続化（`localStorage`）とリロード・ブラウザ再起動後の再開（Resume）
  - 同一ブラウジングコンテキスト（`atcircle-visit`）でのタブ再利用巡回
  - `BroadcastChannel` によるメイン画面とコンパニオン画面間の双方向リアルタイム同期
  - キーボードショートカット（`←` / `→` / `R` / `Enter, O`）
  - PWA（Progressive Web App）インストール・スタンドアロン表示対応
- 前へ・ランダム・次へ・一覧を備えた埋め込みウィジェット（レガシー互換維持）
- リング別の RSS アンテナと OPML エクスポート
- 公開プロフィールとリングの公開ページ
- **アプリ内ヘルプ (`/help`) & チェンジログ (`/changelog`)** による利用ガイドと更新履歴

## 文書

- [ユーザー向けヘルプ Markdown](docs/help_ja.md)（アプリ内でも `/help` で閲覧可能）
- [更新履歴 (CHANGELOG.md)](CHANGELOG.md)（アプリ内でも `/changelog` で閲覧可能）
- [開発・保守マニュアル](docs/development-maintenance.md)
- [文書一覧](docs/README.md)
- [ATProto CRUD 仕様](docs/spec/atproto_crud.md)
- [Lexicon リファレンス](docs/lexicons.md)

## 開発を始める

### 前提条件

- Node.js 24 以上
- npm

### セットアップ

```bash
git clone https://github.com/asadaame5121/atcircle.git
cd atcircle
pnpm install
pnpm dev
```

既定では `http://localhost:8080` で起動します。ローカル開発では
`DB_PATH` を省略すると `./dev.db` を使用します。

### よく使うコマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm dev` | 開発サーバーを起動 |
| `pnpm build` | CSS とアプリケーションを本番用にビルド |
| `pnpm start` | ビルド済みの `dist/index.js` を起動 |
| `pnpm test` | Vitest の単体・ルートテストを実行 |
| `pnpm run test:e2e` | Playwright の E2E テストを実行 |
| `pnpm lint` | Biome による静的検査 |
| `pnpm format` | Biome による整形と自動修正 |

### 最小構成の環境変数

ローカル開発では多くの項目に既定値があります。本番運用では少なくとも次を
明示的に設定してください。

- `PUBLIC_URL`: 外部からアクセスできる HTTPS のベース URL
- `SECRET_KEY`: アプリ内セッション JWT の署名鍵
- `OAUTH_PRIVATE_KEY`: ATProto OAuth 用の秘密 JWK、またはその Base64 表現
- `NODE_ENV=production`
- `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN`: Turso を利用する場合
- `ADMIN_DID`: 管理機能を利用するアカウントの DID

設定項目の完全な一覧、データベース、テスト、デプロイ、障害対応については
[開発・保守マニュアル](docs/development-maintenance.md)を参照してください。

## 技術構成

- Hono / TypeScript / Vite
- Node.js 24
- Tailwind CSS
- libSQL（ローカル SQLite または Turso）
- ATProto OAuth と独自 Lexicon
- Vitest / Playwright / Biome

`docs/lexicons.md` と `src/lexicons/` 配下は Lexicon から生成される成果物です。
独自レコードの名前空間は `net.asadaame5121.at-circle.*` です。

---

## Companion Navigation 実ブラウザ動作検証結果

| 検証項目 | 挙動・結果 | 判定 |
| --- | --- | --- |
| **外部サイトURL検証** | `http:` / `https:` 以外の危険なスキーム（`javascript:`, `data:`, `file:` 等）は遮断され、UIにエラーが表示される | PASS |
| **独立Companion起動** | 親ウィンドウに依存せず、URL直接指定（`/rings/companion?ring=...`）で単独起動可能 | PASS |
| **巡回履歴（Previous）** | ブラウザBackに依存せず、Next/Randomで訪問した履歴順を正しく逆順に辿る | PASS |
| **末尾ラップ（Next）** | リングの末尾メンバーからNextを実行した際、先頭メンバーへ正常にラップする | PASS |
| **セッション永続化 & 再開** | `localStorage` にセッションを保存し、リロード後やブラウザ再起動後も現在位置と履歴が維持される | PASS |
| **ウィンドウ間同期** | `BroadcastChannel` によりメイン詳細画面とCompanionウィンドウ間でリアルタイムに同期 | PASS |
| **同一タブ再利用** | `window.open(url, "atcircle-visit")` により、巡回先サイトを同一タブで連続表示可能 | PASS |
| **キーボードショートカット** | `←` (前へ), `→` (次へ), `r` (ランダム), `Enter` / `o` (サイトを開く) が動作。テキスト入力中は誤発火しない | PASS |
| **PWAスタンドアロン** | `manifest.webmanifest` と `sw.js` により PWA としてインストール・スタンドアロン表示が可能 | PASS |
| **後方互換性** | 既存の `/widget.js`、`<at-circle>` および ATProto Lexicon レコードの変更なし | PASS |
