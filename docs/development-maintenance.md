# AT CIRCLE 開発・保守マニュアル

この文書は、AT CIRCLE をローカルで開発する人と、本番環境を運用・保守する人を
対象にしています。コマンドはリポジトリのルートで実行してください。

## システム概要

AT CIRCLE は Node.js 上で動作する Hono アプリケーションです。ATProto のユーザー
リポジトリをデータの正本として利用し、libSQL のローカル DB を公開表示と検索の
ための AppView 相当のインデックスとして利用します。

```text
ブラウザー／埋め込みサイト
        │ HTTP
        ▼
Hono アプリケーション
  ├─ ATProto OAuth・PDS ── リング、参加、申請、ブロック、バナー
  ├─ libSQL／Turso ─────── 公開一覧、承認状態、RSSキャッシュ
  ├─ Bluesky 公開 API ──── プロフィール
  └─ 外部サイト ───────── RSS、メタデータ、ウィジェット確認
```

### 主な技術

- Node.js 24、TypeScript、ES Modules
- Hono、Hono JSX、Vite
- Tailwind CSS 4
- `@libsql/client` によるローカル SQLite／Turso 接続
- ATProto OAuth と `@atproto/api`
- Vitest、Playwright、Biome
- Pino、`node-cron`

## ディレクトリと責務

| パス | 責務 |
| --- | --- |
| `src/index.ts` | Node サーバー、DB 注入、日次処理、終了処理 |
| `src/app.tsx` | 共通ミドルウェア、セキュリティヘッダー、ルーティング |
| `src/routes/` | 公開画面、認証、API、ナビゲーション |
| `src/routes/dashboard/` | サイト、リング、メンバー、同期、管理機能 |
| `src/components/` | サーバーサイドで生成する UI |
| `src/services/` | OAuth、ATProto、RSS、探索、業務処理 |
| `src/repositories/` | ローカル DB への問い合わせ |
| `src/schemas/` | フォームとクエリの Zod バリデーション |
| `src/locales/` | 日本語・英語の表示文言 |
| `lexicons/` | 独自 Lexicon と参照 Lexicon の正本 |
| `src/lexicons/` | Lexicon から生成された TypeScript |
| `tests/` | Playwright E2E テスト |

## ローカル開発

### セットアップ

```bash
npm install
npm run dev
```

既定の URL は `http://localhost:8080`、ローカル DB は `dev.db` です。起動時に
`src/db.ts` が不足テーブル・列・索引を作成します。

開発中の任意ユーザーによるデバッグログインは `NODE_ENV=development` のときだけ
利用できます。本番相当の挙動を確認するときは、必ず `NODE_ENV=production` で
確認してください。

### コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Vite 開発サーバー |
| `npm run build` | Tailwind CSS とアプリを `dist/` へビルド |
| `npm start` | ビルド済み Node サーバーを起動 |
| `npm test` | `src` 配下の Vitest テスト |
| `npm run test:e2e` | Playwright E2E テスト |
| `npm run lint` | `src` を Biome で検査 |
| `npm run format` | `src` を Biome で整形・自動修正 |

変更の種類に応じた最小確認は次のとおりです。

- 文言・文書のみ: リンク、見出し、コード例を目視確認
- UI・ルート: `npm test` と関係する Playwright テスト
- サービス・DB: `npm test`、必要に応じて `npm run test:e2e`
- リリース前: `npm run lint`、`npm test`、`npm run build`,
  `npm run test:e2e`

## 環境変数

秘密値をリポジトリへコミットしないでください。ローカルでは `.env` を利用でき
ます。

| 変数 | 既定値 | 用途・注意 |
| --- | --- | --- |
| `PORT` | `8080` | HTTP 待受ポート |
| `DB_PATH` | `file:dev.db` 相当 | ローカル libSQL 接続先 |
| `PUBLIC_URL` | `http://localhost:${PORT}` | OAuth、ウィジェット、公開URLの基準。本番は HTTPS 必須 |
| `BSKY_SERVICE_URL` | `https://bsky.social` | ATProto サービス URL |
| `PLC_DIRECTORY_URL` | `https://plc.directory` | DID PLC ディレクトリ |
| `SECRET_KEY` | 開発用固定値 | JWT 署名鍵。本番では十分に長いランダム値を必ず設定 |
| `CLIENT_NAME` | `AT CIRCLE` | OAuth クライアント表示名 |
| `NODE_ENV` | `development` | 本番は `production` |
| `OAUTH_PRIVATE_KEY` | 一時鍵 | 秘密 JWK JSON または Base64。本番では永続鍵を必ず設定 |
| `ADMIN_DID` | なし | 管理者として扱う DID |
| `TURSO_DATABASE_URL` | なし | 設定時は `DB_PATH` より優先 |
| `TURSO_AUTH_TOKEN` | なし | Turso 認証トークン |
| `LOG_LEVEL` | 開発 `debug`、本番 `info` | Pino のログレベル |
| `ZAP_SCAN_KEY` | なし | ZAP 検査専用。認証・CSRFバイパスになるため通常運用では未設定 |
| `CI` | なし | Playwright の再試行数や並列数を CI 向けに変更 |

`OAUTH_PRIVATE_KEY` がない、または解析できない場合は起動時に一時鍵を作ります。
この状態では再起動後に OAuth セッションを復元できないことがあります。

## データベース

接続先は `TURSO_DATABASE_URL`、`DB_PATH`、`file:dev.db` の順に選択されます。

### 主なテーブル

| テーブル | 内容 |
| --- | --- |
| `users` | DID、ハンドル |
| `sites` | ユーザーのサイトと RSS |
| `antenna_items` | RSS から取得した記事 |
| `oauth_states` | OAuth state とセッション |
| `rings` | リングのローカルインデックスと表示設定 |
| `join_requests` | 承認待ち申請 |
| `memberships` | 参加状態とウィジェット確認結果 |
| `block_records` | リング単位のブロック |

### スキーマ変更

現在の実行時スキーマの正本は `src/db.ts` です。アプリ起動時に
`CREATE TABLE IF NOT EXISTS` と冪等な列追加を実行します。

`schema.sql` は古い初期化用資料で、実行時スキーマと一致せず、先頭でテーブルを
削除します。既存環境へのマイグレーションには使用しないでください。
`src/scripts/init-db.ts` も現行 DB アダプターとの整合を確認するまで運用手順には
使用しません。

スキーマを変更するときは次を行います。

1. `src/db.ts` の新規作成スキーマと既存 DB 向け変更を更新する。
2. リポジトリ、サービス、型、テストを更新する。
3. 既存データを複製した検証 DB でアップグレードを試す。
4. 本番 DB をバックアップしてからデプロイする。
5. 起動ログと主要な読み書きを確認する。

### バックアップと復旧

ローカル SQLite は、書き込みを止めてから DB ファイルを別の安全な場所へコピー
します。復旧時もアプリを停止し、元ファイルを保存した上でバックアップと
入れ替えます。

Turso はサービス側のバックアップ、レプリカ、復旧機能を使用してください。
利用中のプランと CLI の現行仕様を確認し、定期的に別環境へ復旧できることまで
試験します。バックアップの存在確認だけでは復旧試験になりません。

## ATProto と同期

独自コレクションは `net.asadaame5121.at-circle.*` です。詳しくは
[ATProto CRUD 仕様](spec/atproto_crud.md)を参照してください。

ATProto 側とローカル DB の更新は単一トランザクションではありません。片方だけ
成功した場合は、ダッシュボードの PDS 同期または管理者の全体同期で整合を戻し
ます。障害調査では、AT URI、所有 DID、PDS レコード、ローカル行の4点を比較して
ください。

Lexicon を変更するときは次をまとめて扱います。

1. `lexicons/` の独自 JSON を更新する。
2. 生成 TypeScript と `docs/lexicons.md` を再生成する。
3. OAuth scope、`src/services/atproto.ts`、テストを更新する。
4. 旧レコードを読めるか、移行が必要かを判断する。

生成物を手作業で部分修正しないでください。

## RSS アンテナ

`src/index.ts` は毎日 `00:00` に全 RSS を更新します。タイムゾーンを明示して
いないため、実行時刻はホスト環境のタイムゾーンに依存します。各サイトの直近
10件を読み、URL の重複を避けて `antenna_items` へ保存します。

手動同期は管理画面から実行できます。大量サイトでの連続実行を避けるため、
プロセス内に5分の抑制がありますが、再起動や複数インスタンス間では共有され
ません。

確認項目:

- 最終成功時刻と対象サイト数
- 失敗した RSS URL、HTTP 状態、解析エラー
- 新規記事数と重複件数
- DB 容量と古い `antenna_items` の保持方針

## テスト

### Vitest

Vite の設定により `src` 配下の `*.test.ts` / `*.test.tsx` を対象とし、
`tests/` の Playwright テストは除外します。

```bash
npm test
```

### Playwright

Playwright は Chromium を使い、既定で開発サーバーをポート8080に起動します。

```bash
npx playwright install chromium
npm run test:e2e
```

失敗時は `playwright-report/` と `test-results/` を確認します。固定文言に依存する
古い smoke test があるため、翻訳や UI を変更した場合はテスト自体の期待値も
現行画面と照合してください。

## ビルドとデプロイ

### ローカルで本番ビルドを確認

```bash
npm run build
npm start
```

`Dockerfile` は Node 24 slim の二段階ビルドです。実行コンテナは非 root の
`node` ユーザーで動作します。

### Fly.io

`fly.toml` は東京リージョン、HTTPS 強制、必要時起動、停止猶予10秒を設定して
います。現在は永続ボリュームの設定がないため、本番データをコンテナ内の
SQLite だけに保存しないでください。通常は Turso など外部の永続 DB を使用します。

デプロイ前:

1. テストとビルドを完了する。
2. DB バックアップと復旧手段を確認する。
3. Fly.io の secrets に本番環境変数があることを確認する。
4. OAuth の `PUBLIC_URL` とコールバック URL が一致することを確認する。

デプロイ後:

1. `/`、`/login`、`/rings` を確認する。
2. OAuth ログインとダッシュボード表示を確認する。
3. リング詳細、ウィジェットスクリプト、ナビゲーションを確認する。
4. DB 接続エラー、OAuth エラー、RSS エラーがログに増えていないか確認する。

ロールバックは、直前の正常なアプリイメージへ戻す手順と、DB スキーマを戻せる
かを別々に判断します。破壊的な DB 変更はアプリだけを戻しても復旧しません。

## 監視と定期保守

最低限、次を監視します。

- HTTP 5xx、応答時間、プロセス再起動
- DB 接続失敗、容量、バックアップ成功と復旧試験
- OAuth 開始・コールバック・セッション復元の失敗
- RSS 更新の成功数、失敗数、最終成功時刻
- PDS、Bluesky 公開 API、外部サイト取得の失敗率
- ウィジェットスクリプトとナビゲーション URL の可用性

定期作業:

- 依存関係と Node.js のセキュリティ更新
- OAuth 鍵、JWT 鍵、DB トークンのローテーション計画
- ログ保持期間と秘密情報の混入確認
- 不要なアンテナ記事と無効サイトの整理
- バックアップからの復旧訓練
- 利用規約、プライバシーポリシー、ユーザーヘルプの見直し

## セキュリティ上の注意

- `SECRET_KEY`、`OAUTH_PRIVATE_KEY`、`TURSO_AUTH_TOKEN`、
  `ZAP_SCAN_KEY` をログや課題管理へ貼らないでください。
- `ZAP_SCAN_KEY` は認証と CSRF の検査用バイパスです。通常運用では設定せず、
  利用後は直ちに無効化・ローテーションします。
- 本番では `NODE_ENV=production` を必須とし、デバッグログインを無効にします。
- RSS、サイトメタデータ、ウィジェット確認は外部 URL へサーバーからアクセス
  します。タイムアウト、許可するアドレス、リダイレクト、レスポンスサイズを
  変更するときは SSRF とリソース枯渇の観点で確認します。
- CSP や CORP/COOP を変更するときは、通常画面の保護と外部サイトへ埋め込む
  ウィジェットの互換性を両方確認します。

## 障害対応

### 起動しない

1. Node.js が24以上か確認する。
2. 環境変数の形式と `PUBLIC_URL` を確認する。
3. DB の URL、ファイル権限、Turso トークンを確認する。
4. ビルド済み運用では `dist/index.js` と `assets/` の存在を確認する。

### OAuth ログイン後に戻れない

1. `PUBLIC_URL` と実際の外部 URL を比較する。
2. HTTPS、プロキシ、コールバック URL を確認する。
3. `OAUTH_PRIVATE_KEY` が全インスタンスで同じか確認する。
4. `oauth_states` と OAuth 関連ログを、秘密値を出さずに確認する。

### リングや参加状態が一致しない

1. 対象の AT URI と DID を特定する。
2. PDS のリング・メンバー・申請レコードを確認する。
3. `rings`、`memberships`、`join_requests` を確認する。
4. PDS 同期または管理者の全体同期を実行する。
5. 同期後も直らない場合は、片側更新が失敗したルートのログを確認する。

### アンテナだけ更新されない

1. サイトの RSS URL を確認する。
2. アプリ実行環境から URL を取得できるか確認する。
3. HTTP 状態、Content-Type、XML 解析エラーを確認する。
4. 5分抑制中でないか、日次ジョブのホスト時刻が想定どおりか確認する。

## 既知の保守課題

- 正式なバージョン管理付き DB マイグレーションがない。
- `schema.sql` と実行時スキーマに差がある。
- RSS／メタデータ取得のタイムアウトと SSRF 防御を統一する余地がある。
- プロセス内 cron と同期抑制は複数インスタンスで共有されない。
- ログ、メトリクス、アラート、バックアップの運用基準はデプロイ環境側で補う
  必要がある。

これらを変更するときは、機能追加と同じ変更に埋め込まず、移行・ロールバック・
監視を含む独立した保守作業として計画してください。
