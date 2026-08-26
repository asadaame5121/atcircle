# AT CIRCLE 文書一覧

## ユーザー向け

| 文書 | 内容 |
| --- | --- |
| [ユーザー向けヘルプ](help_ja.md) | ログイン、サイト登録、リング参加・管理、ウィジェット、FAQ |
| 利用規約（アプリ内 `/terms`） | サービス利用条件 |
| プライバシーポリシー（アプリ内 `/privacy`） | 取得情報と取り扱い |

## 開発・保守向け

| 文書 | 内容 |
| --- | --- |
| [開発・保守マニュアル](development-maintenance.md) | セットアップ、設定、DB、テスト、デプロイ、監視、障害対応 |
| [ATProto CRUD 仕様](spec/atproto_crud.md) | 独自レコードとローカルインデックスの役割 |
| [Lexicon リファレンス](lexicons.md) | Lexicon から生成されたレコード定義 |
| [リポジトリ README](../README.md) | プロジェクト概要と開発入口 |

## 編集時の注意

- `docs/lexicons.md` は自動生成領域を含みます。コメントで示された生成範囲を直接
  編集せず、Lexicon の正本を変更して再生成してください。
- `docs/spec/atproto_crud.md` と実装が食い違う場合は、
  `lexicons/net.asadaame5121.at-circle.*.json` と `src/services/atproto.ts` を
  確認してください。
- 画面操作を変更したときは `docs/help_ja.md`、環境変数・DB・デプロイを変更した
  ときは `docs/development-maintenance.md` を同じ変更で更新してください。
- `docs/release_article_draft.md` は公開用マニュアルではなく、未完成のリリース
  記事草案です。プレースホルダーを解消するまで公開しないでください。
