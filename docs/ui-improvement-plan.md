# UI/UX 改善プラン

作成日: 2026-08-07
対象: ATcircle (Hono + `hono/html` SSR + daisyUI 4 CDN + Tailwind v4)

このドキュメントは、dev 環境 (https://dev-at-circle.asadaame5121.net)
のスクリーンショット調査に基づく UI/UX 改善の実装計画です。
別エージェントがこの計画に従って実装する。

---

## 技術上の前提(実装前に必読)

- **SSR**: 全画面 `hono/html` の `html` タグ付きテンプレート。React
  ランタイムはない。クライアント側 JS は `Modals.tsx` /
  `modals/Scripts.tsx` の素のスクリプトのみ。
- **CSS**: daisyUI **4.4.19** を CDN 読み込み
  (`src/components/Layout.tsx` L41) + Tailwind v4 をビルド
  (`assets/index.css`、`npm run build:css` で生成)。
  daisyUI 5 系のクラス・記法は使えない。
- **i18n**: 全ユーザー向け文字列は `t()` 経由。
  `src/locales/ja.json` と `src/locales/en.json` の**両方**にキーを
  追加すること。片方だけの追加はテスト・本番で表示崩れの原因になる。
- **テスト**: `npm run test` (vitest) が各ルートに存在。
  マークアップ変更後は必ず実行。`npm run lint` (biome) も通すこと。
- **プロフィール解決**: DID→ハンドル/表示名のバッチ解決には既存の
  `AtProtoService.getProfilesPublic(actors: string[])`
  (`src/services/atproto.ts` L410) を流用できる。
  参照実装: `src/routes/dashboard/members.ts` L52。

---

## 0. バグ修正(最優先・全タスクの前提)

### 0-1. `<header>` 開始タグ欠落

- **ファイル**: `src/components/Layout.tsx`
- **現状**: L74 に `<div class="navbar-start ...>` が突然始まり、L93 に
  閉じタグ `</header>` のみ存在する**不正な HTML**。
  ブラウザの自動補正でヘッダーが崩れ、ブランド行とナビリンク行が
  2段に分かれて表示されている(全ページ共通)。
- **対応**: タスク 1 のヘッダー刷新で構造ごと書き直すため、
  このバグはタスク 1 に内包する。

### 0-2. Buy Me a Coffee ボタンの重なり

- **ファイル**: `src/components/Layout.tsx` L129
- **現状**: 左下固定の BMC ボタンがモバイルでコンテンツに重なる。
- **対応**: タスク 1 でフッター内リンクに移す、または BMC スクリプトを
  削除してフッターの「シェア」横に通常リンクとして置く。

---

## タスク 1: ヘッダー修正・刷新

**ファイル**: `src/components/Layout.tsx`

### 現状の問題

- 上記 0-1 の不正 HTML。
- ヘッダーが sticky ではなく、長いページ(ダッシュボード等)で
  ナビゲーションに戻れない。
- モバイルではヘルプリンクが `hidden sm:flex` で消え、
  導線が減る。GitHub アイコンのみ押し出される。
- ナビゲーションらしい見た目(背景・境界)がなく、コンテンツと
  同化している。

### 実装内容

1. ヘッダーを正しい構造で書き直す:

   ```
   <header class="navbar bg-base-100/90 backdrop-blur sticky top-0 z-30
                  shadow-sm rounded-box mb-4">
     <div class="navbar-start">…ブランド(ロゴ + AT CIRCLE)…</div>
     <div class="navbar-end">…ナビ…</div>
   </header>
   ```

2. デスクトップ (`sm:` 以上): 現行リンク
   (ウェブリングを探す / ダッシュボード / ヘルプ / GitHub) を
   横並び表示。
3. モバイル: daisyUI の `dropdown dropdown-end` でハンバーガー
   メニュー化し、ヘルプ・GitHub を含む全リンクを格納。
   (daisyUI 4 の dropdown は CSS のみで動作するため JS 不要。
   `<details>` ベースか `tabindex` ベースの公式パターンを使う)
4. BMC スクリプトを削除し、フッターのシェア欄に
   `https://www.buymeacoffee.com/asadaame5121` への
   通常リンク(アイコンボタン)として追加。
5. `data-theme="light"` は維持(ダークモードは今回のスコープ外)。

### 受け入れ条件

- 全ページで HTML バリデーション上 `<header>` が正しく入れ子になる。
- 1280px / 390px の両ビューポートでヘッダーが 1 行に収まり、
  スクロールしてもヘッダーが追従する。
- モバイルでハンバーガーメニューから全リンクに到達できる。

---

## タスク 2: ホームページ刷新(非ログイン訪問者向けのコンテンツ充実)

**ファイル**: `src/routes/home.tsx`、必要に応じて新規
`src/components/HomeView.tsx` に分離

### 現状の問題

- hero がタイトル + 1文 + ログインボタンのみで、
  「何ができるアプリか」が一切伝わらない。
- **非ログインで見れる実コンテンツがゼロ**。
  `/rings` や `/antenna` は未ログインでも閲覧可能なのに、
  ホームからの導線もプレビューもなく、ログインを求めるだけの
  殺風景なページになっている(ユーザーからの指摘あり)。
- ファーストビューの下半分が空白で間が抜けている。

### 実装内容

1. **ヒーロー**: キャッチコピー(大) + サブコピー + CTA 2個
   -  primary: 「Blueskyでログイン」(`/login`)
   -  secondary: 「ウェブリングを探す」(`/rings`) ← 未ログイン導線
2. **公開リングのプレビュー(本タスクの主題)**:
   ヒーロー直下に「どんなリングがあるか」を実データで見せる。
   - データ取得: `RingRepository.getAllWithMemberCount({ onlyOpen: true })`
     (`/rings` 一覧と同じ公開クエリ) をホームのハンドラでも呼び、
     先頭 N 件(目安 4〜6 件)をカードで表示。
     表示順は `member_count` 降順 or 新着順。
     メソッドに ORDER BY / LIMIT がないため、
     ルート側で `sort` + `slice` するのが最小変更。
     (きれいにやるなら `getAllWithMemberCount` に
     `{ orderBy?: "member_count" | "created_at", limit?: number }`
     オプションを追加)
   - カード構成は `RingListView` のリングカードと揃える
     (タイトル / 説明 / メンバー数バッジ / 作成者 /
     「サイトを見る」リンク)。共通化できるなら
     `src/components/RingCard.tsx` として切り出し、
     `RingListView` からも使う(重複排除)。
   - 作成者表示はタスク 3-1 と同じく
     `AtProtoService.getProfilesPublic()` でハンドル解決。
     **失敗してもページを落とさない**(try/catch で DID 短縮表示に
     フォールバック)。ホームは外部 API 障害で真っ白になる
     リスクを避けるため、リング取得自体も try/catch し、
     失敗時はセクションごと非表示にしてよい。
   - セクション末尾に「すべてのウェブリングを見る →」で
     `/rings` へリンク。
   - 可能なら「最近のアンテナ更新」ミニ一覧(3〜5件、
     `/antenna` と同じ `AntennaRepository` 由来)も検討。
     工数が膨らむ場合はリングプレビューのみでよい。
3. **機能紹介セクション**: 3〜4枚のカード(grid)。
   既存機能に対応:
   - ウェブリング作成・管理(招待リンク、承認フロー)
   - 埋め込みウィジェット(前へ/次へ/ランダム)
   - アンテナ(RSS 集約)と OPML エクスポート
   - Bluesky (ATProto) OAuth ログイン
   各カードに FontAwesome アイコン + タイトル + 1文説明。
4. **使い方ステップ**: 3ステップの簡易ガイド
   (ログイン → サイト登録 → リング参加/作成)。
   ダッシュボードの `dashboard.usage_guide_step1..3` が
   流用できるか確認し、流用 or 新規キー追加。
5. フッター直前に再度 CTA(ログイン + 探す)。

### ページ構成イメージ(上から)

```
ヒーロー(キャッチ + CTA×2)
公開リングプレビュー(実データ 4〜6件 + /rings へのリンク)
機能紹介(3〜4カード)
使い方 3ステップ
最終 CTA
```

### i18n 追加キー(案・ja/en 両方)

```
home.cta_explore
home.preview_rings_title   (例: "公開中のウェブリング" / "Public rings")
home.preview_rings_more    (例: "すべてのウェブリングを見る")
home.features_title
home.feature_rings_title / home.feature_rings_desc
home.feature_widget_title / home.feature_widget_desc
home.feature_antenna_title / home.feature_antenna_desc
home.feature_oauth_title / home.feature_oauth_desc
home.steps_title
home.step1_title / home.step1_desc  (〜 step3)
```

### 受け入れ条件

- **未ログインで `/` を開くと、実際の公開リングの
  タイトル・説明・メンバー数が表示される**(リングが 0 件の
  環境ではセクション非表示 or 空状態メッセージ)。
- 未ログインのまま `/rings`・各リング詳細・`/antenna` へ
  ホームから辿れる。
- スクロールせず CTA が 2 つ見える。
- 機能紹介が 390px 幅で 1 列、md 以上で複数列になる。
- `AtProtoService` や DB 障害時でも `/` が 500 にならない。
- `src/routes/home.test.ts` が通る(リポジトリ呼び出しの
  モック追加が必要)。

---

## タスク 3: リング一覧 / 詳細の改善

**ファイル**: `src/components/RingListView.tsx`、
`src/components/RingDetailView.tsx`、`src/routes/rings.tsx`

### 3-1. 一覧: 作成者 DID の人間可読化

- **現状**: `作成者: did:plc:4nbeoflrcbgukz7umqeuh7mq` と生 DID 表示。
- **対応**: `src/routes/rings.tsx` の一覧ハンドラで、
  取得リングの `owner_did` を集約して
  `AtProtoService.getProfilesPublic()` に渡し、
  `handle`(あれば `displayName`)を `RingListView` に渡す。
  解決失敗時は DID を短縮表示(`did:plc:4nbe…h7mq`)にフォールバック。
- **注意**: 外部 API 呼び出しの失敗で一覧全体を落とさないこと
  (try/catch で DID のまま描画)。`src/routes/rings.test.ts` は
  モック追加が必要になる可能性あり。

### 3-2. 一覧: カードの視認性

- メンバー数バッジを `badge-secondary`(マゼンタ)から
  `badge-primary badge-outline` 系に変更(ブランド統一)。
- ランダムジャンプの絵文字 🎲 を FontAwesome
  (`fa-shuffle`) に統一。`title` 属性は維持。
- カード hover 時の影・ボーダー強調は維持。

### 3-3. 詳細: メンバー一覧をカード化

- **現状**: 素の `table table-zebra` で「説明」列が空だと間が抜け、
  モバイルで横スクロールが発生。
- **対応**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` の
  カードグリッドに変更。各カード:
  サイトタイトル(太字) + URL(短縮表示) + 説明(2行クランプ) +
  「訪問」ボタン + RSS バッジ(既存の `badge-warning` 維持)。
- 空状態は既存の alert を維持。

### 3-4. 詳細: アクションボタンの整理

- **現状**: 「このウェブリングに参加する」が `btn-secondary`
  (マゼンタ)で浮いている。Antenna/OPML が絵文字始まりで統一感がない。
- **対応**:
  - 参加ボタンを `btn-primary` に変更(ページの主アクション)。
  - ランダムジャンプは `btn-outline` に格下げ。
  - Antenna/OPML の絵文字を FontAwesome
    (`fa-tower-broadcast` / `fa-file-export`) に置換。

### i18n 追加キー(案)

```
rings.owner_unknown   (例: "不明なユーザー" / "Unknown user")
```

### 受け入れ条件

- 一覧で DID がハンドル(または短縮 DID)表示になる。
- 詳細のメンバー一覧が 390px 幅で横スクロールしない。
- `src/routes/rings.test.ts` / `src/routes/navigation.test.ts` が通る。

---

## タスク 4: ダッシュボードの改善

**ファイル**: `src/components/dashboard/DashboardView.tsx`、
`src/components/dashboard/RingsSection.tsx`

### 4-1. 生 at:// URI の視覚ノイズ削減

- **現状**: `RingsSection.tsx` L41-43 で各リングカードに
  `URI: at://did:plc:…/net.asadaame5121.at-circle.ring/…` が
  フル表示され、画面の大半を占有。
- **対応**: URI 行を削除し、代わりに
  「URIをコピー」ボタン(既存のコピー用 JS
  `window.copyInviteLinkFromBtn` と同系のクリップボード処理)にする。
  確認用途には `<details>`/`<summary>` の折りたたみで
  URI を格納してもよい(デフォルト非表示)。

### 4-2. リングカードの密度整理

- タイトル行・バッジ行(オーナー/メンバー数/保留)は維持。
- 管理者アクション(招待コピー/メンバー管理/設定)は
  現行の小ボタン群を維持しつつ、参加中フッター
  (`joined_as` 行)の URL を `break-all` から
  ドメイン抽出表示 or `truncate` + title 属性に変更し、
  改行だらけになるのを防ぐ。
- カード間の `space-y-4` は維持。

### 4-3. モバイルレイアウト

- **現状**: 390px 幅でリング一覧 → My Site → DANGER ZONE が
  ひたすら縦に続き、到達性が悪い。
- **対応**:
  - `DashboardView.tsx` のグリッドで、モバイル時は
    「My Site」セクションをリング一覧の**上**に表示
    (CSS の `order-*` クラスで実現。DOM 順は変えない)。
  - ヘッダーの DID 表示(L39)は `truncate` + title 属性に。
  - 「DANGER ZONE」は `<details class="collapse collapse-arrow">`
    の折りたたみ化を検討(誤操作防止にもなる)。

### 4-4. Moderation セクション

- **現状**: 参加リクエストが画面上部にベタ置きで、
  「承認」ボタンと「拒否」ボタンの優先度が視覚的に不明瞭
  (承認が緑塗り、拒否が小さな赤リンク)。
- **対応**: 拒否を `btn btn-xs btn-error btn-outline` に揃えて
  ボタンサイズを統一。`ModerationSection.tsx` の構造は大きく変えない。

### 受け入れ条件

- ダッシュボード初期表示で at:// URI が画面に直接表示されない。
- 390px 幅で My Site がリング一覧より先に表示される。
- `src/routes/dashboard.test.ts` / `dashboard.debug.test.ts` が通る。

---

## 共通: i18n と文言の注意

- `RingsSection.tsx` L15 に日本語ハードコード
  (`まだ参加しているリングがありません。…`) がある。
  ついでに `dashboard.no_rings_desc` 等のキーに外出しする
  (en.json にも追加)。

## 検証手順(実装後に必ず実施)

1. `npm run test` — 全ユニットテスト通過。
2. `npm run lint` — biome 通過。
3. dev 環境または `npm run dev` + Playwright で以下を撮影・目視:
   - `/`(未ログイン)、`/rings`、`/rings/view?ring=…`、
     `/dashboard`(alice で OAuth ログイン)を
     1280px と 390px の両幅で。
   - OAuth ログイン補助は `tests/e2e/helpers.ts` の
     `oauthLogin()` を流用(PDS の承認ボタンは日本語「承認」
     なので正規表現は `/authorize|承認/i` とすること)。
4. `npm run test:e2e` は dev PDS 依存のため、
   環境が使える場合のみ実行。

## スコープ外(今回やらない)

- ダークモード / `data-theme` 切替機能。
- `/antenna` 画面のデザイン刷新(現状でも概ね許容)。
- ウィジェットビルダー (`/dashboard/ring/widget`) の刷新。
- daisyUI のバージョンアップ(4→5)。
