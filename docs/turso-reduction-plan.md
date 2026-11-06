# Turso 依存の段階的削減計画

作成日: 2026-11-06

ATProto（各ユーザーの PDS）を唯一の正本とし、Turso は「消えても作り直せる
キャッシュ」にしてから、最終的に外すための計画。

## 現状の棚卸し

| テーブル / 列 | 正本 | 備考 |
| --- | --- | --- |
| `rings`: title / description / status / acceptance_policy / admin_did | **PDS**（リングレコード） | DB はキャッシュ。参加時も PDS を先に読む |
| `rings.owner_did` | AT URI から導出可能 | DB に持つ必要なし |
| `rings.slug` | **DB のみ** | 短縮 URL `/r/:slug` |
| `rings.banner_url`（外部 URL） | **DB のみ** | アップロード画像は banner レコード（PDS）にもある |
| `memberships.status`（approved / pending / suspended） | **DB のみ** | **承認状態の正本が DB にしかない**（最大の課題） |
| `memberships.banner_url` / `widget_installed` | DB のみ | 表示用・確認結果のキャッシュ |
| `join_requests` | 申請は PDS（request レコード）、**承認結果は DB のみ** | |
| `block_records` | **PDS**（管理者の block レコード） | DB はキャッシュ |
| `sites` | **DB のみ** | メンバーレコードにも url / title / rss はある |
| `users` | ハンドルのキャッシュ | |
| `antenna_items` | RSS のキャッシュ | |
| `oauth_states` | サーバー側 OAuth セッション | 保存先が別途必要 |

承認方式（申請が必要かどうか）のフラグは、すでにリングレコードの
`acceptancePolicy` が正本。DB にしかないのは「誰が承認されたか」の結果のほう。

## フェーズ

### フェーズ 0: 権限判定を DB に頼らない（完了）

- リング設定の更新とバナー変更で、所有者を **AT URI の DID** で判定する。
- これまでは所有者チェックがなかったため、他人のリングの `admin_did` を書き換え、
  メンバー管理を乗っ取れた。

### フェーズ 1: リング設定を PDS に寄せる（完了）

- リングレコードの Lexicon に `slug` と `bannerUrl`（外部 URL）を追加する。
- メンバー管理の権限判定（現在は DB の `admin_did`）を、リングレコードの
  `admin` を読む形に変える（公開 `getRecord` の結果を短時間キャッシュ）。
- `rings` テーブルを、PDS から再構築できるキャッシュにする。
- 既存の不具合: 同期処理（`/dashboard/sync`、管理者の全体同期）が
  `INSERT OR REPLACE` で行を丸ごと置き換えるため、`slug` と `banner_url` が消える。
  上の2つを PDS に移せば自然に解消するが、それまでは `ON CONFLICT DO UPDATE` に直す。

### フェーズ 2: 承認結果を PDS に載せる（完了）

- 管理者のリポジトリに置く `net.asadaame5121.at-circle.decision` を新設した
  （対象の member / request レコードへの strongRef、status は approved /
  suspended / removed）。承認だけでなく一時停止とキックも表せるよう、
  当初案の approval から名前と形を変えた。
- 参加の有効判定:
  - 自動承認リング: メンバーレコードがあり、ブロックされていない
  - 要承認リング: 上記に加えて承認レコードがある
- 移行: DB にだけある承認・停止は、所有者がダッシュボードの「同期」を実行した
  ときに decision として PDS に書き込む。
- 詳細な規則は `docs/spec/atproto_crud.md` の「参加状態の決まり方」を参照。

### フェーズ 3: 発見（インデックス）を外部に任せる（完了）

- 「このリングを参照する member / request / approval レコード」を
  Constellation のバックリンクで取得し、実体は PDS から読む。
- `memberships`・`join_requests`・`sites` の読み取りをこれに置き換える。
- 外部サービスが止まったときは DB のキャッシュで応答する。Jetstream 購読で
  キャッシュを作り直す仕組みはフェーズ 4 で検討する。
- まだ DB を読んでいるもの: リング一覧ページ (`/rings`) とメンバー数、
  プロフィールページ、RSS アンテナ、リング指定なしのランダムジャンプ。

### フェーズ 4: 残りを Turso 以外へ移し、Turso を外す

- 残るのは OAuth セッション、RSS アンテナのキャッシュ、ウィジェット確認結果、
  ハンドルのキャッシュ。
- 注意: 本番は Fly のマシン2台構成なので、マシンごとのローカル SQLite では
  セッションが共有されない。選択肢は次のどれか。
  - 書き込みをブラウザ側 OAuth に移し、サーバーはトークンを持たない
  - 共有ストア（Fly の Upstash Redis など）にセッションだけ置く
  - マシンを1台にしてボリューム上の SQLite を使う

## 進め方

各フェーズは単独でデプロイでき、途中で止めても動く状態を保つ。DB への書き込みを
止める前に、PDS から再構築できることをテストで確認する。
