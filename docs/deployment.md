# デプロイ・運用ガイド (本番1ライン)

最終更新: 2026-11-05

dev 環境 (`asadaame5121-webring-dev`) は維持費削減のため廃止した。
現在は本番 https://at-circle.asadaame5121.net のみで運用する。

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
| Test (`test.yml`) | unit / smoke (e2e は `vars.E2E_DEV_PDS_URL` 設定時のみ) |
| Deploy (`deploy.yml`) の `check-fly-token` | デプロイせずに `flyctl status` で `FLY_API_TOKEN` の有効性と本番アプリへの権限を確認 |

**マージ (main への push) で本番へ自動デプロイされる。** 本番に直接出るため、
PR の unit / smoke が通っていることを必ず確認してからマージする。

## 1. 構成

| 項目 | 値 |
|---|---|
| Fly アプリ | `asadaame5121-webring` |
| URL | https://at-circle.asadaame5121.net |
| 設定ファイル | `fly.toml` |
| ATProto サービス | `https://bsky.social` |
| DB | Turso 本番 DB |
| デプロイ | main への push で自動 / 手動 (workflow_dispatch) |

## 2. デプロイフロー (GitHub Actions)

- 自動: PR をマージすると `deploy-prod` が実行される
- 手動: GitHub の Actions タブ → Deploy → Run workflow (main を選択)
- ローカル: `fly deploy -c fly.toml`

### ロールバック

```bash
fly releases -a asadaame5121-webring          # 過去のリリース一覧
fly deploy -a asadaame5121-webring --image <過去リリースのイメージ>
```

または問題のコミットを revert する PR をマージする。

## 3. バージョニング

- `package.json` の `version` をリリースに合わせて更新し、同じ番号でタグを打つ

```bash
npm version patch   # or minor / major (package.json 更新 + コミット + タグ)
git push origin main --tags
```

- タグはバージョンの記録用。デプロイは main への push で行われる

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
| `FLY_API_TOKEN` | Fly デプロイ用 API トークン (org スコープ、1年有効)。PR ごとに `check-fly-token` で有効性を確認 |
| `E2E_DEV_PDS_URL` (vars) | dev PDS の URL。e2e ジョブと PR Screenshots の有効化スイッチ。dev 環境廃止後は未設定にする |
| `E2E_BASE_URL` (vars) | e2e のベース URL (旧 dev アプリ) |

Fly secrets はアプリごとに設定済み。変更は `fly secrets set -a <app> KEY=VALUE`。

承認通知（公式アカウントからのメンション）を有効にするには、本番アプリに `NOTIFY_APP_PASSWORD`（atcircle.bsky.social のアプリパスワード）を設定する：`fly secrets set -a <app> NOTIFY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx`。未設定なら通知は送らず、承認待ち画面にも通知の手順は出ない。

## 6. 参考

- dev PDS の構成・アカウント・招待コード: `pds/README.md`
- テスト戦略: `docs/testing.md`
