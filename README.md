# AT CIRCLE

AT CIRCLE は、ATProto を利用して個人サイト同士をつなぐウェブリングです。
Bluesky アカウントでログインし、サイトの登録、リングの作成・参加、埋め込み
ウィジェットによるサイト間移動、RSS 更新の閲覧ができます。

## 主な機能

- Bluesky の ATProto OAuth を使ったログイン
- Bluesky プロフィールからのサイト候補検出と手動登録
- ウェブリングの作成、参加、承認、メンバー管理
- 前へ・ランダム・次へ・一覧を備えた埋め込みウィジェット
- リング別の RSS アンテナと OPML エクスポート
- 公開プロフィールとリングの公開ページ

## 文書

- [ユーザー向けヘルプ](docs/help_ja.md)
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
npm install
npm run dev
```

既定では `http://localhost:8080` で起動します。ローカル開発では
`DB_PATH` を省略すると `./dev.db` を使用します。

### よく使うコマンド

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | CSS とアプリケーションを本番用にビルド |
| `npm start` | ビルド済みの `dist/index.js` を起動 |
| `npm test` | Vitest の単体・ルートテストを実行 |
| `npm run test:e2e` | Playwright の E2E テストを実行 |
| `npm run lint` | Biome による静的検査 |
| `npm run format` | Biome による整形と自動修正 |

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
