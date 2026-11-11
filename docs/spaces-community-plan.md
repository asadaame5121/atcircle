# Atproto Spaces / Bluesky コミュニティ対応の検討

作成日: 2026-11-11（状態: 検討中・未実装）

どちらも未実装。外部仕様が固まりきっていないので、この文書は「何に使えるか」
「どこまで今やるか」「仕様待ちの間に何を準備するか」を整理するためのもの。

## 1. 外部仕様の現状（2026-11-11 時点で確認した内容）

### Atproto Spaces（権限付きデータ）

一次資料: `bluesky-social/proposals` の `0016-permissioned-data`（2026-11-10 更新）、
`bluesky-social/atproto` の `msi/lex-space` ブランチ（Lexicon 草案）。

- 状態: 提案文書は「最終仕様ではない」と明記。2026-08 にアルファ公開。
  実装ブランチでは週単位で破壊的変更が入っている。
  - 例: 提案本文の `memberspace.putMember` / `space.listRepos` / `space.notifyWrite`
    が、Lexicon 草案では `putMembers` / `listWriters` / `notifyRepoUpdate` に
    なっている。**名前を前提にしたコードはまだ書かない。**
- 単位: スペースは `(authority DID, spaceType NSID, skey)` で識別する。
  - URI: `at://{spaceDid}/space/{spaceType}/{skey}/{authorDid}/{collection}/{rkey}`
  - スペース参照だけなら `at://{spaceDid}/space/{spaceType}/{skey}`（新形式 `space-ref`）
- データの置き場所: 各ユーザーが自分の PDS に「スペースごとのリポジトリ」を持つ。
  公開リポジトリと同じく「書いた本人がレコードの所有者」。
- 読み取り: スペースの authority が発行する短命の **space credential**
  （既定 10 分、アプリが持つ P-256 鍵に束縛、HTTP Message Signatures で提示）が必要。
  ユーザー代理で読むなら、ユーザーの PDS から delegation token をもらって交換する。
- 同期: リレー（firehose）は無い。space host に `registerNotify` して書き込み通知を
  受け、各メンバーの PDS から `listRepoOps` で差分を引く。
  アカウント状態の変化は従来どおり firehose で受ける必要がある。
- アクセス制御であって**暗号化ではない**。PDS も認可されたアプリも中身を読める。
- 標準ポリシー（全 PDS が実装必須）:
  - `personalspace`: 本人だけ（ブックマーク、下書き等）
  - `memberspace`: PDS が持つメンバー一覧で判定。`publicRead` / `publicWrite` /
    `allowedApps` / `publishMembers`（メンバー一覧をスペース内レコードとして公開）
  - `managedspace`: 外部アプリ（managingApp）に `checkUserAccess` で都度問い合わせる
- OAuth: `space:<spaceType>?authority=...&action=...&manage=...` という新スコープ。
  スペース型は `"type": "space"` の Lexicon で宣言し、同意画面に `name` が出る。
- モデレーション: authority は `com.atproto.label.record` をスペース内に書いて
  `!takedown` できる。

### Bluesky のコミュニティ機能

- 公表されている方針（2026-06 の報道ベース）: 独自ハンドルを持つ「コミュニティ」を
  年内に導入。公開 / 招待制 / 非公開を選べる。先行して 2026-06 にグループチャットを公開。
- `bluesky-social/bsky`（`app.bsky` / `chat.bsky` の正本、2026-11-10 時点の main）で
  確認できたのは **`chat.bsky.group.*` のみ**。`app.bsky.community` のような
  レコード型の Lexicon は main・ブランチ名とも見つからなかった。
  - `chat.bsky.group.*` はチャットサービス上の XRPC（レコードではない）。
    参加リンク（join link）、`joinRule: anyone | followedByOwner`、
    `requireApproval`、参加申請の承認・却下、メンバー上限（現状 100）。
- 推測（未確認）: コミュニティは Spaces の上に作られる可能性が高い
  （`bsky.space` ハンドルの話、`jetstream-space-sync` ブランチの存在）。
  ただし Lexicon が出るまでは前提にしない。
- **要確認**: 「community 関連の Lexicon が少し出ている」の出どころ。
  上記以外の場所（別リポジトリ、lexicon.garden 上の公開 Lexicon など）なら教えてほしい。

## 2. AT CIRCLE との関係

AT CIRCLE は「公開された個人サイト同士をつなぐ」サービスで、現在のデータは
すべて公開リポジトリにあり、読み取りは Constellation のバックリンクに寄せている
（`docs/turso-reduction-plan.md` フェーズ 3）。Spaces はこれと正反対の
「囲われたデータ」なので、**全面移行の対象ではなく、追加の選択肢**として扱う。

### Spaces が効きそうな場所

| 候補 | 今の状態 | Spaces にすると | ポリシー | 優先度 |
| --- | --- | --- | --- | --- |
| A. 巡回履歴・ブックマーク・既読 | Companion の履歴は `localStorage`（端末ごと） | 端末をまたいで同期。本人以外に見えない | `personalspace` | 高（小さく試せる） |
| B. モデレーション記録の非公開化 | block の `reason`、decision が誰でも読める | 理由や停止履歴をリング管理者（と運営）だけに | `memberspace`（管理者のみ） | 中 |
| C. 限定公開リング | 全リング公開 | 招待されたメンバーだけが一覧・巡回できるリング | `memberspace` | 中（需要次第） |
| D. リング内の掲示板・お知らせ | 無し | メンバー間の連絡 | `memberspace` | 低（新機能） |

B は現状の課題（ブロック理由が公開 PDS に残る）を解消できるので、
仕様が安定したら A の次に検討する価値がある。

### Spaces と相性の悪い点

- **公開ウィジェット・Companion は未ログインで動く**。限定公開リング（C）は
  埋め込みウィジェットを提供できない（ログイン必須の巡回だけになる）。
- **Constellation が使えない**。スペース内のレコードはバックリンク索引に載らない。
  サーバーが syncer になり、通知購読・差分同期・ローカル保持が必要になる。
- **サーバー側に状態が増える**。credential 用の鍵、同期済みコピー、セッション。
  Turso を外す方向（フェーズ 4）と逆行するので、C/D は「状態を持つ」判断とセットになる。
- 本番は Fly のマシン2台構成なので、通知購読（`registerNotify`）の受け口と
  同期状態をどちらのマシンが持つかを決める必要がある。

## 3. 設計案

### 3.1 スペース型

| NSID | 用途 | collections | key |
| --- | --- | --- | --- |
| `net.asadaame5121.at-circle.personal` | A: 個人データ | `...history`, `...bookmark` | `literal:self` |
| `net.asadaame5121.at-circle.circle` | B/C/D: リングごとの囲い | `...member`, `...decision`, `...block`, `...note` | `tid`（= リングの rkey） |

- `circle` の `skey` はリングレコードの rkey と同じにして、公開リング
  `at://{owner}/net.asadaame5121.at-circle.ring/{rkey}` と
  スペース `at://{owner}/space/net.asadaame5121.at-circle.circle/{rkey}` を
  機械的に対応づける。
- authority はまずリング所有者の DID。将来「リング専用 DID」にすれば
  所有者の引き継ぎができる（今は所有者が AT URI の DID に固定されている課題の解決策
  にもなる）が、DID 発行・鍵管理の負担が大きいので後回し。
- 既存レコード型（member / decision / block）をスペース内でもそのまま使えるのが
  Spaces の利点。Lexicon を増やさずに「置き場所」だけ変えられる。

### 3.2 リングとスペースの結び付け

リングレコードに任意項目を足す（後方互換）。

```json
{
  "visibility": "public | members",
  "space": "at://did:plc:owner/space/net.asadaame5121.at-circle.circle/3abc"
}
```

- `visibility: "members"` のリングは、公開リポジトリに「存在と名前だけ」を
  置くか、まったく置かないかを決める必要がある（**要相談**、下記）。
- 参加承認（decision `approved`）と `memberspace.putMembers` を連動させる。
  承認状態の正本をどちらにするかは、`publishMembers: true` にして
  スペース内のメンバー一覧を正本、decision はその写しにするのが素直。

### 3.3 Bluesky コミュニティとの連携

Lexicon が無い段階での実装はしない。代わりに「外部コミュニティへのリンク」を
リングに持たせる形で、どんな仕様が来ても受けられるようにしておく。

```json
{
  "links": [
    { "$type": "net.asadaame5121.at-circle.defs#communityLink", "uri": "at://... or space-ref" },
    { "$type": "net.asadaame5121.at-circle.defs#chatGroupLink", "url": "https://bsky.app/..." }
  ]
}
```

- 今すぐできるのは `chat.bsky.group` の参加リンク URL をリング設定に貼れるように
  すること（レコードに URL を持つだけ。チャット API は呼ばない）。
- コミュニティが Spaces 製なら、将来の候補:
  - 「このリングのメンバーである」ことを参加条件にする（AT CIRCLE が
    `managedspace` の managingApp になり `checkUserAccess` に答える）
  - 逆に「コミュニティのメンバーである」ことをリング参加条件にする
  - RSS アンテナの新着をコミュニティに流す

## 4. 段階的な進め方

### ステップ 0: 仕様待ちの間にやる準備（今すぐ可能・小さい）

- AT URI の解析を一か所に集める。今は `new AtUri(...)` を `atproto.ts`、
  `membership.ts`、`ring.service.ts`、`ring-index.ts`、`dashboard.service.ts`、
  `widget.service.ts`、`ring.repository.ts` などで直接使っている。
  スペース URI をそのまま渡すと `collection` が `"space"`、`hostname` が
  作者ではなく authority になり、**所有者判定（`hostname === did`）を誤る**。
  スペース URI を明示的に拒否 / 分解するパーサーを用意し、テストで固定する（TDD）。
- メンバー情報の取得元を差し替え可能にしておく
  （`resolveMemberships` の入力を「公開レコード」「スペース内レコード」から
  同じ形で受けられるように）。
- リングレコードに `links`（3.3）を追加し、グループチャットの参加リンクを
  貼れるようにする。

### ステップ 1: 個人データ（A）— 仕様がベータになり、bsky.social の PDS が対応したら

- `personalspace` に Companion の巡回履歴とブックマークを保存。
- ブラウザ側だけで完結できる（サーバーは syncer にならない）ので、
  Turso 削減の方向とも矛盾しない。
- `localStorage` はオフライン用キャッシュとして残す。

### ステップ 2: モデレーション記録の非公開化（B）

- 管理者だけが読める `circle` スペースに block の理由・停止履歴を置く。
- 公開側には「除外された DID」だけ残す（巡回から外す判定には必要）。

### ステップ 3: 限定公開リング（C）、掲示板（D）

- サーバーを syncer にする判断（状態の置き場所）とセットで着手。

### 着手条件（共通）

- 0016 が提案から仕様（atproto.com/specs）に昇格、または破壊的変更が止まる
- `@atproto/oauth-client-node` が `space:` スコープに対応
- 主要 PDS（bsky.social）が `com.atproto.space.*` を提供
- 未対応 PDS のユーザーには従来どおり公開レコードで動くこと

## 5. 決めたいこと

1. 「community 関連 Lexicon」の出どころ（1 章の要確認）。
2. 優先度: 個人データ（A）から試すか、限定公開リング（C）を先に見たいか。
3. 限定公開リングの存在自体を公開一覧に出すか（「非公開リングがある」ことは見せる / 完全に隠す）。
4. サーバーが syncer として状態を持つことを許容するか（Turso 削減計画との兼ね合い）。
