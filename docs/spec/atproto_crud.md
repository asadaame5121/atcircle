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
| 参加の判断 | `net.asadaame5121.at-circle.decision` | リング管理者 |

OAuth クライアントは上記6コレクションへのリポジトリアクセスと、バナー用 blob
アクセスを要求します。`decision` は後から追加したため、それ以前にログインした
ユーザーは、承認・停止・キックの前にログインし直す必要があります。

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
項目はタイトル、説明、公開状態、承認方式、管理者 DID、公開スラッグ (`slug`)、
外部バナー URL (`bannerUrl`) です。作成日時などフォームで扱わない項目は既存
レコードから引き継ぎます。

スラッグはリングをまたいで一意にする必要があるため、ローカルのキャッシュで
先着順に確認します。他のリングが使っているスラッグは PDS に書く前に拒否し、
キャッシュへの取り込み時にも重複したスラッグは採用しません。

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

承認・拒否は、管理者のリポジトリに `decision` レコードを書いて記録します
(次節)。ローカルの `memberships` と `join_requests` はそのキャッシュです。

### 参加の判断 (decision)

所有者または admin は、参加の根拠になったレコード (member または request) に
対して判断を記録します。

```json
{
  "$type": "net.asadaame5121.at-circle.decision",
  "ring": {
    "uri": "at://did:plc:owner/net.asadaame5121.at-circle.ring/3example"
  },
  "subject": {
    "uri": "at://did:plc:member/net.asadaame5121.at-circle.request/3req",
    "cid": "bafy..."
  },
  "status": "approved",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

| status | 意味 | 使う操作 |
| --- | --- | --- |
| `approved` | 一覧・巡回に含める | 承認、承認済みに戻す |
| `suspended` | 一時的に外す | 一時停止 |
| `removed` | その参加レコードを外す。新しいレコードで再参加は可能 | 拒否、キック |

保留に戻すときは、その対象への自分の decision を削除します。同じ対象に複数の
decision があるときは `createdAt` が新しいものが有効です。

### 参加状態の決まり方

`src/services/membership.ts` の `resolveMemberships` が次の規則で決めます。

1. 信頼するのは、リングの所有者 (リング URI の DID) と、リングレコードの
   `admin` が書いた decision と block だけ。
2. 所有者・admin がブロックした DID は除外する。
3. 対象への最新の decision が `removed` なら除外、`approved` / `suspended` なら
   その状態。
4. decision がなければ、所有者・admin 自身の参加は承認済み。それ以外は、
   自動承認リングの member レコードなら承認済み、それ以外 (要承認リングの
   member、request) は保留。
5. 1 つの DID につき 1 件。承認済み > 一時停止 > 保留の順に優先し、同じ状態なら
   新しいレコードを採用する。並び順はレコードの `createdAt` の古い順。

自動承認から要承認へ切り替えたときは、既存メンバーが保留に落ちないよう、
切り替えの時点で承認済みのメンバーに `approved` を記録します。

### 離脱

`AtProtoService.leaveRing` は参加者自身の参加レコードを削除します。自動承認
リングでは member、要承認リングでは request レコードなので、URI の
コレクションに合わせて消します。アプリケーション側の `memberships` も削除します。

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

ATProto レコードが正本です。ローカル DB はキャッシュで、消えても PDS から
作り直せることを目標にしています (計画: `docs/turso-reduction-plan.md`)。

### 読み取り

リングのメンバー一覧は、次の順で組み立てます (`src/services/ring-index.ts`)。

1. リングレコードを Slingshot で読む。Slingshot が使えなければ、DID ドキュメント
   から PDS を引いて直接読む。
2. Constellation のバックリンクで、リングを `ring.uri` で参照している member /
   request / decision / block レコードの URI を集める。decision と block は
   所有者・admin のものだけを読む。
3. 各レコードを読み、`resolveMemberships` で状態を決める。

結果は 30 秒、個々のレコードは 60 秒メモリにキャッシュし、書き込みのたびに
そのリングのキャッシュを捨てます。マシンが複数あるため、別のマシンには最大で
その時間だけ古い一覧が出ることがあります。

Slingshot・Constellation に届かないときは、ローカル DB のキャッシュで応答します。

### ローカルテーブル

| ローカルテーブル | 役割 |
| --- | --- |
| `rings` | リング表示のキャッシュ、スラッグの一意性の確認 |
| `join_requests` | 承認待ち申請のキャッシュ |
| `memberships` | 参加状態のキャッシュ、ウィジェット設置確認、参加者バナー |
| `block_records` | ブロックのキャッシュ |
| `sites` | 参加サイトの説明・RSS (RSS アンテナ用) |

書き込みは PDS を先に行い、成功してからキャッシュを更新します。PDS に書けな
かった場合はキャッシュを変えずにエラーを返します。

## 実装上の参照先

- CRUD 実装: `src/services/atproto.ts`
- 公開レコードの読み取り: `src/services/public-records.ts`
- メンバー一覧の組み立て: `src/services/ring-index.ts`, `src/services/membership.ts`,
  `src/services/ring-members.ts`
- 管理操作: `src/services/membership-actions.ts`, `src/services/ring-access.ts`
- ルート処理: `src/routes/dashboard/rings.ts`,
  `src/routes/dashboard/members.ts`, `src/routes/dashboard/moderation.ts`
- Lexicon 正本: `lexicons/net.asadaame5121.at-circle.*.json`
- 生成クライアント: `src/lexicons/`
- 生成リファレンス: `docs/lexicons.md`
