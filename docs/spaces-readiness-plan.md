# ATProto スペース（Spaces）対応の準備計画

作成日: 2026-11-14

ATProto の非公開データ拡張「スペース（atproto spaces）」が 2026-12-01 にパブリック
ベータへ移行する。AT CIRCLE のどこにスペースを使い、何を今のうちに準備しておくかを
まとめる。

## 参照した資料

- [Getting Ready for the Spaces Public Beta](https://atproto.com/blog/getting-ready-for-the-spaces-public-beta)（2026-11-13）
- [The Atproto Spaces Alpha is Live](https://atproto.com/blog/atproto-spaces-alpha)（2026-08-20）
- [提案 0016 Atproto Spaces](https://github.com/bluesky-social/proposals/tree/main/0016-permissioned-data)（仕様の正本）
- サンプルアプリ [bluesky-social/bulletin](https://github.com/bluesky-social/bulletin)
- npm `@atproto/space`（`alpha` タグ: `0.0.0-spaces-alpha-20261113224550`）

## スケジュール

| 時期 | 出来事 | AT CIRCLE への影響 |
| --- | --- | --- |
| 〜2026-11-30 | アルファ。毎週木曜に破壊的変更あり | **本番には入れない**。設計と、仕様に依存しない下準備だけ進める |
| 2026-12-01 | パブリックベータ開始。参照 PDS と Bluesky の PDS 群が一斉更新 | 大半のアカウントがスペース対応 PDS になる。以後の仕様変更は「本番運用前提」で最小化 |
| 2026-12〜 | 公式ドキュメント・正式 SDK が順次公開 | SDK が出てから実装に着手する |
| 2027 年初頭 | エンドユーザー向けの周知開始 | このころまでに最初の機能を出せると良い |

注意: アルファ版 PDS からのデータ移行は「スムーズではない」と明言されている。
開発用 PDS（`pds/`）をアルファ版に切り替えないこと。12/1 の正式リリースを待って更新する。

## スペースの要点（AT CIRCLE に関係する部分だけ）

- **アクセス制御であって暗号化ではない。** PDS とアクセスを許可されたアプリは中身を読める。
- スペースは `(authority DID, space type NSID, skey)` で識別される。
  - レコード URI: `at://{authority}/space/{spaceType}/{skey}/{authorDid}/{collection}/{rkey}`
  - スペース参照: `at://{authority}/space/{spaceType}/{skey}`（Lexicon の新フォーマット `space-ref`）
- 各ユーザーは自分の PDS 上に「スペースごとのリポジトリ」を持つ。書き込みは
  `com.atproto.space.createRecord` などで、**自分の PDS に OAuth で**行う。
- 他人のレコードを読むには **スペース資格情報（space credential）** が要る。
  1. ユーザーの PDS で `getDelegationToken`（`space:` スコープの `read` が必要）
  2. authority の PDS で `authorizeSpaceSync`（P-256 鍵を渡し、10 分程度有効な資格情報を受け取る）
  3. `listWriters` で書き込み済みアカウントを列挙し、各人の PDS から `listRecords` / `listRepoOps` で取得
  4. 各リクエストに HTTP Message Signature、応答の検証に HPKE 由来の MAC が必要（`@atproto/space` が担当）
- **リレー（firehose）に流れない。** Constellation などのバックリンクでは見つからない。
  発見は `listWriters` で行う。
- PDS が必ず実装する標準ポリシーは 3 種類:
  - `personalspace`: 本人だけ
  - `memberspace`: PDS が持つメンバー一覧で判定（`publicRead` / `publicWrite` あり）
  - `managedspace`: 外部アプリに判定を委ねる
- OAuth スコープ: `space:<spaceType>?authority=<did|self|*>&skey=…&collection=…&action=…&manage=…`
  - `authority` の既定値は `self`（自分のスペースだけ）
  - スペース作成には `manage=create`、メンバー管理には `manage=update`
- スペース型は Lexicon の `"type": "space"` 定義で宣言し、同意画面に `title`（`title:lang` で日本語も可）が出る。

## 何をスペースに載せるか

### 公開のまま残すもの

ウェブリングは本質的に公開の仕組みなので、次はスペースに移さない。

- リング（`ring`）、メンバー（`member`）、バナー（`banner`）
- 承認結果（`decision`）とブロック（`block`）の **存在そのもの**
  - 巡回ウィジェットや Constellation による発見がこれらに依存しているため

### 候補 A: 自分だけのデータ（`personalspace`）— 最初に着手する

| データ | 今の保存先 | スペース化の効果 |
| --- | --- | --- |
| Companion の巡回履歴・再開位置 | ブラウザの `localStorage` | 端末をまたいで再開できる |
| お気に入りサイト・「あとで見る」 | なし（新機能） | 本人以外に見えない |
| RSS アンテナの既読位置 | なし／DB | Turso 削減計画（フェーズ 4）の受け皿になる |

- スペース型: `net.asadaame5121.at-circle.personal`（skey は `self`）
- authority は本人の DID。読むのも書くのも本人の PDS だけなので、資格情報・MAC・
  `listWriters` が不要で、**SDK の検証用として最も安全**。
- スペース非対応 PDS のユーザーは今まで通り `localStorage` を使う。

### 候補 B: 参加申請のメッセージと運営メモ（`memberspace`）— 本命

今は次の内容が **誰でも読める公開レコード** に入っている。

- 参加申請（`request`）の `message`（申請者から管理者へのひとこと）
- ブロック（`block`）の `reason`（キック・ブロックの理由）

これらを「リングごとの運営用スペース」に移す。

- スペース型: `net.asadaame5121.at-circle.ringInbox`（仮）
- authority: リング所有者の DID、skey: リングの rkey
- ポリシー: `memberspace`、`publicRead: false`、`publicWrite: true`
  - メンバー一覧: 所有者（暗黙）と `admin`（read/write）
  - 申請者は自分の PDS に申請メッセージを書くだけ。`publicWrite` により writer set に載る
  - 読めるのは所有者と管理者（とアプリ）だけ
- 公開の `request` レコードは残し、`message` だけをスペース側の
  `requestNote`（仮）に移す。`block` の `reason` も同様に `blockNote`（仮）へ。
- 管理者がダッシュボードを開いたときに、その管理者のセッションで
  `getDelegationToken` → `authorizeSpaceSync` → `listWriters` → 各 PDS から取得、と
  **その場で読む**。常駐の同期や通知エンドポイントは最初は作らない
  （Fly 2 台構成でも状態を共有しなくて済む）。
- スペース非対応 PDS が絡む場合（所有者側・申請者側どちらか）は、従来どおり公開の
  `message` を使い、画面で「このメッセージは公開されます」と明示する。

### 後回しにするもの

- **非公開リング**（メンバー以外に一覧も見せないリング）: 公開サイト上のウィジェットや
  巡回と相性が悪く、設計が大きくなる。ベータの様子を見てから判断する。
- **通知登録による常時同期**（`notifySpaceUpdate`）: 候補 B の読み取り頻度では不要。

## 準備フェーズ

### フェーズ 0: 今すぐできる下準備（12/1 前、本番影響なし）

仕様の細部に依存しない部分だけを TDD で進める。

1. **AT URI の取り扱いをスペース URI に耐えるようにする**
   - 第 1 セグメントが `space` の URI を、公開 URI と取り違えずに判別・拒否する関数を用意する
   - 既存の `at://` 処理（`ring-access.ts`, `public-records.ts` など約 20 箇所）が
     スペース URI を受け取っても誤動作しないことをテストで固定する
2. **PDS のスペース対応判定**
   - DID ドキュメントの `verificationMethod` に `#atproto_kem` があるかで判定する
     （12/1 の移行で `did:plc` アカウントに KEM 鍵が追加される）
   - 判定結果は短時間キャッシュし、UI と保存先の切り替えに使う
3. **保存先の抽象化**
   - 候補 A のデータを「`localStorage` 実装」と「スペース実装」で差し替えられる
     インターフェースにしておく（まず `localStorage` 実装だけで現状を再現）
4. **スペース型宣言の草案**
   - `docs/` に置く（`lexicons/` には入れない）。`lex-cli` が `"type": "space"` に
     対応するまでコード生成の対象にしない
5. **プライバシー表記の確認**
   - 申請メッセージとブロック理由が公開されることを、現時点でも画面・`/privacy` に
     明記しておく（スペース化の前でもやる価値がある）

### フェーズ 1: 開発環境の更新（12/1 以降）

1. 開発用 PDS（`pds/`）を 12/1 リリースの参照 PDS に更新する
   - `pds/Dockerfile` の oauth-provider パッチは `@0.19.5` のパスを直接 `sed` している。
     更新後はパスが無くなりビルドが失敗するので、パッチの要否を確認して外す
   - 更新後、テストアカウントの DID ドキュメントに `#atproto_kem` が載ったか確認する
2. 正式 SDK（`@atproto/space` ほか）を **正確なバージョンで固定** して導入する
   - `@atproto/api` / `@atproto/oauth-client-node` / `@atproto/lex` も同じリリース系列に揃える必要があるか確認する
3. OAuth スコープの扱いを決める
   - クライアントメタデータの `scope` に `space:` を足すと全ユーザーに再同意が必要になる
   - スペース非対応の認可サーバーが未知のスコープでどう振る舞うかを開発用 PDS と
     bsky.social で確認し、「スペース機能を使うときだけ追加で同意を取る」方式にできるか検証する
4. client attestation の要否
   - 現在は公開クライアント（`token_endpoint_auth_method: none`）。`allowedApps` を
     使わない限り不要なので、候補 A・B では公開クライアントのまま進める

### フェーズ 2: 候補 A（個人スペース）を実装

- 対象: Companion の巡回履歴、お気に入り
- 本人の PDS への CRUD のみ。スペース非対応ならそのまま `localStorage`
- ここで SDK・スコープ・同意画面・失敗時の挙動を一通り確認する

### フェーズ 3: 候補 B（申請メッセージとブロック理由）を実装

- リング作成時・設定保存時に、所有者が対応 PDS なら運営用スペースを作成する
  （`createSpace`、`manage=create`）
- 管理者（`admin`）の変更時に `putMembers` で同期する
- 既存の公開 `message` / `reason` は、移行後も過去分は公開のまま残る。
  削除するかどうかは所有者・申請者それぞれの判断になる点を画面で説明する

## リスクと未確定事項

- **仕様はまだ変わる。** ベータでも更新は続くと明言されている。各フェーズ着手時に
  提案 0016 の差分を確認する。
- **Constellation で発見できない。** スペースのデータは `listWriters` でしか列挙できない。
  Turso 削減計画のフェーズ 3（Constellation 経由の読み取り）とは別の経路になる。
- **全 PDS が対応するとは限らない。** 独自実装や更新しない自前 PDS が残る前提で、
  常にフォールバックを持つ。
- **アクセス制御は暗号化ではない。** 「非公開」ではなく「関係者だけが読める」と表記する。
- **アカウント状態の追従。** スペースのデータも、退会・停止したアカウントのものは
  表示しない。アカウントイベントは引き続き firehose 側から得る必要がある。

## 進め方

既存の計画と同様、各フェーズは単独でデプロイでき、途中で止めても動く状態を保つ。
スペース対応 PDS かどうかで分岐する箇所は、必ず両方の経路をテストで確認する。
