# デプロイ・運用ガイド (dev / prod 2ライン)

最終更新: 2026-08-08

## 0. 開発フロー (プルリク方式)

main への直接 push は禁止 (ブランチ保護)。すべて PR 経由でマージする:

```bash
git switch -c feat/my-change        # feature ブランチ
# 変更・コミット
git push -u origin feat/my-change
gh pr create --fill                 # PR 作成
```

PR 作成時 (または更新時) に自動実行されるもの:

| ワークフロー | 内容 |
|---|---|
| Test (`test.yml`) | unit / smoke / e2e が PR ごとに実行 |
| PR Screenshots (`pr-screenshots.yml`) | dev 環境の 4 画面を撮影し、PR コメントに自動添付 |

ブランチ保護 (main):

- PR 必須 (admin 含む direct push 不可)
- 必須チェック: `unit` / `smoke` / `e2e` が成功しないとマージ不可
- force push / ブランチ削除: 禁止

マージで `main` に push され、dev へ自動デプロイされる。

## 1. 2ライン構成

| | dev | prod |
|---|---|---|
| Fly アプリ | `asadaame5121-webring-dev` | `asadaame5121-webring` |
| URL | https://dev-at-circle.asadaame5121.net | https://at-circle.asadaame5121.net |
| 設定ファイル | `fly.dev.toml` | `fly.toml` |
| ATProto サービス | dev PDS (`https://pds-dev.asadaame5121.net`) | `https://bsky.social` |
| PDS 解決 | `IDENTITY_RESOLVER_URL` = dev PDS | デフォルト (`public.api.bsky.app`) |
| DB | Turso `atcircle-dev` | Turso 本番 DB |
| デプロイ | main push で自動 | `v*` タグ push で自動 |

## 2. デプロイフロー (GitHub Actions)

### dev (自動)

`main` ブランチへの push で `deploy-dev` が実行される:

```bash
git push origin main
```

### prod (タグ push)

`vX.Y.Z` 形式のタグを push すると `deploy-prod` が実行される:

```bash
git tag v0.2.0
git push origin v0.2.0
```

### 手動デプロイ

- GitHub の Actions タブ → Deploy → Run workflow (workflow_dispatch)
- ローカル: `fly deploy -c fly.toml` (prod) / `fly deploy -c fly.dev.toml` (dev)

## 3. バージョニング

- `package.json` の `version` をリリースに合わせて更新し、同じ番号でタグを打つ

```bash
npm version patch   # or minor / major (package.json 更新 + コミット + タグ)
git push origin main --tags
```

- `npm version` は `v0.2.0` 形式のタグを作るため、そのまま push すれば prod デプロイが走る
- タグ push 時は `deploy-dev` がスキップされる (正しい挙動)

## 4. CI (test.yml)

| ジョブ | 内容 | 条件 |
|---|---|---|
| `unit` | vitest 81件 + biome lint | 常時 |
| `smoke` | ビルド + 本番サーバー起動 + Playwright 3件 | 常時 |
| `e2e` | OAuth 実フロー 13件 (dev PDS に対して) | `vars.E2E_DEV_PDS_URL` 設定時のみ |
| `header` | ヘッダーレイアウト回帰テスト 3件 (320/390/1280px) | 常時 |

E2E はデプロイ済みの dev アプリ + dev PDS に対して実行する (ローカル起動では
OAuth クライアント登録 `client-metadata.json` が成立しないため)。

## 5. シークレットと環境変数

GitHub Actions (repo level):

| シークレット/変数 | 用途 |
|---|---|
| `FLY_API_TOKEN` | Fly デプロイ用 API トークン (org スコープ、1年有効) |
| `E2E_DEV_PDS_URL` (vars) | dev PDS の URL、e2e ジョブの有効化スイッチ |
| `E2E_BASE_URL` (vars) | e2e のベース URL (dev アプリ) |

Fly secrets はアプリごとに設定済み。変更は `fly secrets set -a <app> KEY=VALUE`。

## 6. 参考

- dev PDS の構成・アカウント・招待コード: `pds/README.md`
- テスト戦略: `docs/testing.md`
