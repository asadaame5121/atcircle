# ATProto レコード CRUD 仕様

この文書は、AT CIRCLE が ATProto のユーザーリポジトリへ保存する独自レコードと、
アプリケーション内のキャッシュとの役割分担を説明します。Lexicon の正本は
`lexicons/net.asadaame5121.at-circle.*.json` です。

## コレクション

| 用途 | NSID | レコードを所有する主体 |
| --- | --- | --- |
| リング | `net.asadaame5121.at-circle.ring` | リング作成者 |
| メンバー | `net.asadaame5121.at-circle.member` | 参加者 |
| 参加申請 | `net.asadaame5121.at-circle.request` | 申請者 |
| ブロック | `net.asadaame5121.at-circle.block` | リング管理者 |
| バナー | `net.asadaame5121.at-circle.banner` | リング管理者 |

OAuth クライアントは上記5コレクションへのリポジトリアクセスと、バナー用 blob
アクセスを要求します。

## 共通の参照形式

リングへの参照は `net.asadaame5121.at-circle.defs#ringRef` を使用します。

```json
{
  "uri": "at://did:plc:example/net.asadaame5121.at-circle.ring/3example",
  "cid": "省略可能"
}
```

## リング

### 作成

`AtProtoService.createRing` はログイン中の DID のリポジトリにリングレコードを
作成します。初期値は `status: "open"`、`acceptancePolicy: "automatic"` です。

```json
{
  "$type": "net.asadaame5121.at-circle.ring",
  "title": "個人サイトの輪",
  "description": "個人サイト同士をつなぐリング",
  "admin": "did:plc:example",
  "status": "open",
  "acceptancePolicy": "automatic",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

### 取得・一覧

- 1件取得: AT URI を分解し、`com.atproto.repo.getRecord` を使用
- 所有リング一覧: `net.asadaame5121.at-circle.ring` のレコードを
  `com.atproto.repo.listRecords` 相当の生成クライアントで取得

### 更新

`AtProtoService.updateRing` は同じ rkey に `putRecord` します。更新可能な ATProto
項目はタイトル、説明、公開状態、承認方式、管理者 DID です。公開スラッグと外部
バナー URL はアプリケーション側の表示用データです。

### 削除

`AtProtoService.deleteRing` はリング URI の rkey を使って、所有者のリング
レコードを削除します。ルート処理は関連するローカルの参加・申請データも整理
します。

## 参加

### 自動承認リング

`AtProtoService.joinRing` は参加者自身のリポジトリにメンバーレコードを作成します。

```json
{
  "$type": "net.asadaame5121.at-circle.member",
  "ring": {
    "uri": "at://did:plc:owner/net.asadaame5121.at-circle.ring/3example"
  },
  "url": "https://example.com/",
  "title": "Example Site",
  "rss": "https://example.com/feed.xml",
  "note": "省略可能",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

作成後、アプリケーションは `memberships` に承認済みのインデックスを保存します。

### 要承認リング

`AtProtoService.createJoinRequest` は申請者自身のリポジトリに申請レコードを作成
し、アプリケーションは `join_requests` に保留中の申請を保存します。

```json
{
  "$type": "net.asadaame5121.at-circle.request",
  "ring": {
    "uri": "at://did:plc:owner/net.asadaame5121.at-circle.ring/3example"
  },
  "siteUrl": "https://example.com/",
  "siteTitle": "Example Site",
  "rssUrl": "https://example.com/feed.xml",
  "message": "参加希望です",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

現行の承認処理はローカルの `memberships` を承認済みにし、
`join_requests.status` を更新します。申請者の PDS にある申請レコードを
メンバーレコードへ自動変換する処理ではありません。このため、要承認フローの
PDS レコードとローカル参加状態を調査するときは別々に確認してください。

### 離脱

`AtProtoService.leaveRing` はメンバーレコード URI の rkey を使って、参加者自身の
メンバーレコードを削除します。アプリケーション側の `memberships` も削除します。

## モデレーション

### ブロック

リング管理者は自身のリポジトリに独自のブロックレコードを作成します。これは
Bluesky の `app.bsky.graph.block` とは別の、リング単位の記録です。

```json
{
  "$type": "net.asadaame5121.at-circle.block",
  "subject": "did:plc:member",
  "ring": {
    "uri": "at://did:plc:owner/net.asadaame5121.at-circle.ring/3example"
  },
  "reason": "省略可能",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

`AtProtoService.unblock` はブロック URI の rkey を削除します。ローカルの
`block_records` は公開一覧や参加判定に使うインデックスです。

## バナー

`AtProtoService.setRingBanner` は画像を blob としてアップロードした後、リングと
同じ rkey でバナーレコードを `put` します。これにより1リングにつき1バナーを
扱います。

```json
{
  "$type": "net.asadaame5121.at-circle.banner",
  "ring": {
    "uri": "at://did:plc:owner/net.asadaame5121.at-circle.ring/3example"
  },
  "banner": {
    "$type": "blob",
    "ref": {
      "$link": "bafy..."
    },
    "mimeType": "image/png",
    "size": 12345
  },
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

Lexicon 上の最大サイズは1,000,000バイトです。アップロード画面は JPEG、PNG、
WebP のみを受け付けます。

## ATProto とローカルデータベースの役割

ATProto レコードはユーザーの意思と所有権を示す正本です。ローカル DB は公開
一覧、承認状態、ナビゲーション、RSS アンテナを高速に提供する AppView 相当の
インデックスです。

| ローカルテーブル | 主な役割 |
| --- | --- |
| `rings` | リング表示、状態、スラッグ、外部バナーURL |
| `join_requests` | 承認待ち申請 |
| `memberships` | 参加状態、設置確認、参加者バナー |
| `block_records` | ブロック状態 |
| `sites` | 参加サイトの表示・RSS情報 |

PDS との同期や管理者の全体同期でローカルインデックスを再構築します。新しい
処理を追加するときは、ATProto 側の更新とローカル側の更新の片方だけが成功した
場合を考慮してください。

## 実装上の参照先

- CRUD 実装: `src/services/atproto.ts`
- ルート処理: `src/routes/dashboard/rings.ts`,
  `src/routes/dashboard/members.ts`, `src/routes/dashboard/moderation.ts`
- Lexicon 正本: `lexicons/net.asadaame5121.at-circle.*.json`
- 生成クライアント: `src/lexicons/`
- 生成リファレンス: `docs/lexicons.md`
