# AT CIRCLE テスト戦略・設計ドキュメント

最終更新: 2026-08-06

---

## 1. テストピラミッドの方針

AT CIRCLE では以下の3層でテストを構成する。

```
          ╱  ╲
         ╱ E2E╲          ← Playwright (dev PDS 必須、現在は設計のみ)
        ╱──────╲
       ╱ Smoke  ╲        ← Playwright (常に実行、最低限の健全性確認)
      ╱──────────╲
     ╱  Unit/Route ╲     ← Vitest (全 PR で実行、カバレッジの主軸)
    ╱────────────────╲
```

| 層 | ツール | 実行頻度 | 目的 |
|---|---|---|---|
| ユニット/ルート | Vitest | 全コミット/PR | ビジネスロジック・ルートハンドラ・セキュリティコードの検証 |
| Smoke | Playwright | 全コミット/PR | サーバー起動・ページ描画の最低限の健全性確認 |
| E2E (OAuth実フロー) | Playwright | dev PDS 準備後 | ログイン→サイト登録→リング作成→参加→承認→退会の一連のフロー |

### 原則

- **ユニットテストがカバレッジの主軸**。サーバーサイドの atproto 呼び出しを含まないため高速・安定
- **Smoke テストは常にグリーン**。認証不要なページのみを対象とする
- **E2E は dev PDS 準備後に段階的に有効化**。設計書を先に書き、スキップ機構で導入に備える

---

## 2. 現在のテスト構成

### 2.1 ユニット/ルートテスト (Vitest)

**実行**: `npm test`

| ファイル | テスト対象 | 件数 |
|---|---|---|
| `src/routes/*.test.ts` | 各ルートハンドラ | ~40件 |
| `src/services/*.test.ts` | サービス層 (atproto, auth, feed 等) | ~16件 |
| `src/middleware/rate-limit.test.ts` | レートリミッター | 6件 |
| `src/config.test.ts` | 環境変数 fail-fast 検証 | 7件 |
| `src/lib/session.test.ts` | セッション cookie 名切替 | 3件 |

**共通ヘルパー**: `tests/route-utils.ts`

- `createMockDB()`: D1Database のモック。`first`/`all` にデータまたは関数を渡してクエリ結果を制御
- `createMockAuthToken()`: テスト用 JWT を生成
- `wrapApp()`: Hono サブアプリに i18nMiddleware を適用したラッパーを返す

**パターン**:

```typescript
import { describe, expect, it, vi } from "vitest";
import { createMockDB, wrapApp } from "../../tests/route-utils.js";
import targetApp from "./target.js";

describe("Target Route", () => {
    it("does something", async () => {
        const env = { DB: createMockDB({ first: null, all: [] }) };
        const app = wrapApp(targetApp);
        const res = await app.request("/path", {}, env);
        expect(res.status).toBe(200);
    });
});
```

### 2.2 Smoke テスト (Playwright)

**実行**: `npm run test:e2e` (smoke のみ)

| ファイル | 内容 |
|---|---|
| `tests/smoke.spec.ts` | ホームページ表示、ウィジェットビルダーアクセス |
| `tests/debug_login.spec.ts` | JWT 注入によるログイン状態確認 |

### 2.3 セキュリティテスト

以下のセキュリティコードをユニットテストで検証:

| コード | テストファイル | 検証内容 |
|---|---|---|
| `authRateLimiter` | `src/middleware/rate-limit.test.ts` | 10回以内通過、11回目で429、Retry-After、IP分離 |
| `sanitizeNext` | `src/routes/auth.test.ts` | Open Redirect 防止 (`//`, `/\`, 絶対URL → `/dashboard`) |
| `loginSchema` (zod) | `src/routes/auth.test.ts` | 外部URLの next で400、相対パスで通過 |
| `/auth/debug` ゲート | `src/routes/auth.test.ts` | DEV_AUTH_BYPASS=false で403 |
| SECRET_KEY fail-fast | `src/config.test.ts` | production+未設定/デフォルト値で throw |
| SESSION_COOKIE 名 | `src/lib/session.test.ts` | production で `__Host-session`、その他で `session` |

---

## 3. サーバーサイド atproto 呼び出しのテスト戦略

### 3.1 問題の整理

AT CIRCLE の認証フロー(OAuth)とデータ操作は、サーバーサイドから ATProto PDS/AppView へ XRPC 呼び出しを行う。これらの呼び出しはブラウザ側の `page.route()` ではモックできない。

| 呼び出し種別 | 発生場所 | `page.route` でモック可能? |
|---|---|---|
| OAuth `authorize()` | サーバー (auth.ts) | ❌ 不可 |
| OAuth `callback()` | サーバー (auth.ts) | ❌ 不可 |
| `restoreAgent()` | サーバー (各種ルート) | ❌ 不可 |
| `getProfile` / `describeRepo` | サーバー (auth.ts) | ❌ 不可 |
| AppView API (`getActorLikes` 等) | サーバー (services/) | ❌ 不可 |
| クライアント側 fetch (`/api/*`) | ブラウザ | ✅ 可能 |
| ページナビゲーション | ブラウザ | ✅ 可能 |

### 3.2 dev PDS 導入前のテスト戦略 (現在)

- **ユニットテスト**: `vi.mock()` で外部依存をモック。Hono の `app.request()` で直接ルートハンドラをテスト
- **Smoke テスト**: 認証不要なページのみ。サーバーは起動するが atproto 呼び出しは発生しないパスのみ
- **JWT 注入**: `debug_login.spec.ts` のように、事前に生成した JWT を cookie に設定して認証済み状態を再現

### 3.3 dev PDS 導入後のテスト戦略 (将来)

dev PDS (`https://pds-dev.asadaame5121.net`) が準備されたら:

1. **テストアカウントを dev PDS 上に事前作成** (下記シナリオ参照)
2. **E2E テストは dev PDS に対して実 OAuth フローを実行**
3. **ユニットテストは引き続きモック使用** (dev PDS への依存なし)
4. **統合テスト層を新設**: dev PDS に対してサーバーサイドから実際の XRPC 呼び出しを行うテスト (vitest で `test:e2e` タグ付き)

---

## 4. E2E テスト設計 (dev PDS 準備後に実装)

### 4.1 テストアカウント

dev PDS (`https://pds-dev.asadaame5121.net`) 上に事前作成済みのアカウントを使用する:

| アカウント | DID | 用途 |
|---|---|---|
| `alice.pds-dev.asadaame5121.net` | `did:plc:4nbeoflrcbgukz7umqeuh7mq` | 一般ユーザー (リング作成者) |
| `bob.pds-dev.asadaame5121.net` | `did:plc:ywe4n6z2fhnvzsrxegbrkh62` | 一般ユーザー (参加者) |
| `atcircle-admin.pds-dev.asadaame5121.net` | `did:plc:nibzqkz7lyumnykhjdg7aps3` | 管理者 |

パスワードや招待コード、PDS 構成の詳細は `pds/README.md` を参照。

### 4.2 シナリオ一覧

実装状況 (2026-08-07): `tests/e2e/oauth-flow.spec.ts` + `tests/e2e/flows.spec.ts`

| # | シナリオ | 手順 | 検証ポイント | 状態 |
|---|---|---|---|---|
| 1 | ログイン | OAuth フロー → コールバック → ダッシュボード表示 | セッション cookie 設定、/dashboard へリダイレクト | ✅ oauth-flow.spec.ts |
| 2 | サイト登録 | ダッシュボード → URL 入力 → 登録 | DB に site レコード作成 | ✅ flows.spec.ts (冪等: 登録済みならスキップ) |
| 3 | リング作成 | リング作成フォーム → 名前/説明入力 → 作成 | DB に ring レコード、作成者がオーナーに | ✅ flows.spec.ts |
| 4 | リング参加 | 参加フォーム → リング ID 入力 → 申請 | member レコード (status=pending) | ✅ flows.spec.ts (manual ポリシー) |
| 5 | 参加承認 | オーナーが承認 → member status=approved | 承認後、ModerationSection からリクエストが消える | ✅ flows.spec.ts |
| 6 | アンテナ表示 | /antenna → 参加サイトのフィード表示 | リングページ表示 | ✅ flows.spec.ts |
| 7 | 退会 | リング設定 → 退会 → 確認 | member/ring レコード削除、Leave ボタン消滅 | ✅ flows.spec.ts |
| 8 | 管理者機能 | 管理者ログイン → 全リング一覧 → モデレーション | admin ロールの権限確認 | ✅ flows.spec.ts (stats 表示) |

注意事項:

- **テストは serial モード** (`test.describe.configure({ mode: "serial" })`)。リング URI など状態をモジュール変数で共有するため、個別テストの単独実行は不可
- **manual 承認はローカル DB のみに反映**される (PDS への member レコード作成は行わない既知の制限)。そのため承認後のメンバー表示は PDS レコードではなくローカル DB の memberships に依存する
- テストは dev アプリ + dev PDS に**累積的なデータ**を作る (リング・参加リクエスト等)。リング名にタイムスタンプを付けてテスト間・実行間の衝突を回避している

### 4.3 Playwright 設定

実装済み: `playwright.e2e.config.ts`

- `testDir: ./tests/e2e`
- `baseURL`: `E2E_BASE_URL` 環境変数 (デフォルト `https://dev-at-circle.asadaame5121.net`)
- **webServer なし**: デプロイ済みの dev アプリに対して実行する (`client-metadata.json` がアプリオリジンに存在する必要があるためローカル起動では OAuth が成立しない)
- 実行: `npm run test:e2e:dev`

### 4.4 スキップ機構

実装済み: `tests/e2e/helpers.ts` の `e2eEnabled`

- `E2E_DEV_PDS_URL` が未設定の場合、`tests/e2e/oauth-flow.spec.ts` はテストを一切登録しない
- CI では `--pass-with-no-tests` で exit 0 とする

### 4.5 JWT 注入方式との使い分け

| 方式 | 用途 | メリット | デメリット |
|---|---|---|---|
| JWT 注入 | ダッシュボード表示、API テスト | 高速、PDS 不要 | OAuth フロー自体は検証不可 |
| OAuth 実フロー | ログイン〜操作全般 | 本番同等の検証 | dev PDS 必須、低速 |

E2E テストでは **OAuth 実フローでログイン → JWT 注入で個別機能テスト** のハイブリッド方式を推奨。

---

## 5. CI (GitHub Actions) での動かし方

### 5.1 現在の CI パイプライン

```yaml
# .github/workflows/test.yml (想定)
name: Test
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm test -- --run
      - run: npm run lint

  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm start &
      - run: npx playwright test tests/smoke.spec.ts
```

### 5.2 dev PDS 導入後の CI 拡張

```yaml
  e2e:
    runs-on: ubuntu-latest
    if: vars.E2E_DEV_PDS_URL != ''  # dev PDS が設定されている場合のみ
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm start &
      - run: npx playwright test -c playwright.e2e.config.ts
        env:
          E2E_DEV_PDS_URL: ${{ vars.E2E_DEV_PDS_URL }}
          E2E_BASE_URL: http://localhost:8080
          # テストアカウントの認証情報は Secrets から注入
          TEST_ALICE_HANDLE: ${{ secrets.TEST_ALICE_HANDLE }}
          TEST_ALICE_PASSWORD: ${{ secrets.TEST_ALICE_PASSWORD }}
```

---

## 6. テスト共通ヘルパーの改善履歴

### 現在

- `tests/route-utils.ts`: `createMockDB`, `createMockAuthToken`, `wrapApp`

### 将来の拡張候補

- `tests/e2e/helpers.ts`: dev PDS スキップ機構、OAuth ログインヘルパー
- `tests/fixtures/`: テスト用フィクスチャ (リングデータ、サイトデータ等)

---

## 7. 注意事項

### レートリミットテスト

`src/middleware/rate-limit.ts` はモジュールレベルのグローバル `Map` を持つ。テスト間の干渉を避けるため、各テストケースで **ユニークな `x-forwarded-for` 値** を使用すること。

### 環境変数テスト

`src/config.ts` や `src/lib/session.ts` の環境変数依存コードをテストする場合:

1. `vi.stubEnv()` で環境変数を設定
2. `vi.resetModules()` でモジュールキャッシュをクリア
3. `await import("./target.js")` で動的インポート
4. `afterEach` で `vi.unstubAllEnvs()` を呼ぶ

### OAuth モック

`src/routes/auth.ts` のテストでは `src/services/oauth.js` の `createClient` を `vi.mock()` でモックすること。実 OAuth クライアントは PDS への接続を試みるため、モックなしではテストが失敗する。
