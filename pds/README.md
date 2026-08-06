# Dev PDS (開発用 ATProto サーバー)

atcircle 開発用の独立した PDS(Personal Data Server)を Fly.io 上で運用する。

- アプリ名: `asadaame5121-pds-dev`
- ホスト: `https://pds-dev.asadaame5121.net`
- ハンドル: `*.pds-dev.asadaame5121.net`
- リージョン: `nrt` (東京)
- バージョン: PDS 0.5.9 (`ghcr.io/bluesky-social/pds`)
- 非フェデレーション: `PDS_CRAWLERS=""`、`PDS_BSKY_APP_VIEW_URL` は `api.bsky.app`(feed 検証用)

## 構成

| ファイル | 内容 |
|---|---|
| `fly.toml` | Fly 設定(メモリ 1GB、`/pds` ボリューム、招待必須) |
| `Dockerfile` | 公式イメージ + oauth-provider same-site パッチ |
| `entrypoint.sh` | 起動時に resolv.conf を 8.8.8.8 / 1.1.1.1 に上書き |

### 必須パッチ(Dockerfile)

1. **oauth-provider same-site パッチ**
   - `@atproto/oauth-provider@0.19.5` は `sec-fetch-site: same-site` の遷移を拒否する
   - アプリ(`dev-at-circle.asadaame5121.net`)と PDS が同じ登録可能ドメイン(`asadaame5121.net`)のため、`GET /oauth/authorize` を same-site でも許可するよう `sed` で書き換え
   - 0.21.x 以降はデフォルトで same-site を許可するため、PDS アップデートで oauth-provider が更新されたらこのパッチは不要になる
2. **resolv.conf パッチ(entrypoint.sh)**
   - Fly 内部 DNS(fdaa::3)は `_atproto` TXT レコードを返さないため、起動時に `/etc/resolv.conf` を 8.8.8.8 / 1.1.1.1 に上書き
   - これをしないと handle → DID 解決が失敗する

## テストアカウント

| ハンドル | DID | パスワード | 用途 |
|---|---|---|---|
| `alice.pds-dev.asadaame5121.net` | `did:plc:4nbeoflrcbgukz7umqeuh7mq` | `alice-test-pw-2026` | 一般ユーザー |
| `bob.pds-dev.asadaame5121.net` | `did:plc:ywe4n6z2fhnvzsrxegbrkh62` | `bob-test-pw-2026` | 一般ユーザー |
| `atcircle-admin.pds-dev.asadaame5121.net` | `did:plc:nibzqkz7lyumnykhjdg7aps3` | `admin-test-pw-2026` | 管理者 |

各ハンドルの `_atproto` TXT レコードは Cloudflare に登録済み。

## 招待コード

`PDS_INVITE_REQUIRED=true` のため、新規アカウント作成には招待コードが必要。

発行(コンテナ内の goat を利用。`PDS_ADMIN_PASSWORD` は fly secrets から自動適用):

```bash
fly ssh console -a asadaame5121-pds-dev -C "goat pds admin create-invites --count 3"
```

現在有効なコード(2026-08-06 発行、各 1 回分):

- `pds-dev-asadaame5121-net-mzpio-gxbyh`
- `pds-dev-asadaame5121-net-7l3fz-33poc`
- `pds-dev-asadaame5121-net-wfvkh-zls4u`

## デプロイ

```bash
fly deploy -c fly.toml
```

## メンテナンス

### アカウント作成

```bash
fly ssh console -a asadaame5121-pds-dev -C "goat pds admin account create --handle newuser.pds-dev.asadaame5121.net --email dev@example.com --password new-password"
```

### ログ

```bash
fly logs -a asadaame5121-pds-dev
```

### データ

- 永続データは `/pds` ボリューム(`pds_data`、5GB)
- アカウントは `/pds/actors/`、sequencer は `/pds/sequencer.sqlite`

## トラブルシューティング

| 症状 | 原因 | 対策 |
|---|---|---|
| OAuth authorize が 400 `sec-fetch-site header "same-site"` | oauth-provider 0.19.5 の same-site 拒否 | Dockerfile のパッチを確認。PDS 更新後は再適用が必要 |
| handle 解決が失敗する | Fly 内部 DNS が `_atproto` TXT を返さない | entrypoint.sh の resolv.conf 上書きを確認 |
| PDS が OOM で再起動する | メモリ不足(256MB では不可) | `fly.toml` の `[vm] memory` を 1GB に |
| アカウントが消える | `PDS_DATA_DIRECTORY` 未設定でコンテナ内ファイルに保存 | `PDS_DATA_DIRECTORY=/pds` を確認 |
