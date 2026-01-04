---
description: 規約に基づいたコミットメッセージを作成し、Obsidian デイリーノートにログを記録する
---

1. 変更されたファイルを確認する // turbo
2. `git add .` を実行して全ての変更をステージングする
3. 以下の規約に従ってコミットメッセージを決定する
   - 形式: `Tag: message`
   - タグ一覧:
     - `feature`: 機能追加・更新
     - `refactor`: リファクタリング・コードスタイル・コードフォーマット修正など
     - `fix`: バグ修正
   - ルール: `why` を意識して過去形で記述。Issue番号は任意。
4. Obsidian デイリーノートへの記録処理を実行する
   - 今日の日付を `yyyy-MM-dd` 形式で取得する
   - パス `C:\Users\Yudai\personal-website\ObsidianWebsite\log\yyyy-MM-dd.md`
     の存在を確認する
   - **ファイルが存在する場合**: 以下の内容をファイル末尾に追記する
     ```markdown
     ### yyyyMMddhhmmss - {Tag}: {message}

     - プロジェクト: atcircle
     - 更新の概要をWalkthroughから取得し、ここに書き込む。
     - 変更ファイル:
       - [変更されたファイルの一覧]
     ```
   - **ファイルが存在しない場合**: ユーザーに「デイリーノート
     `log/yyyy-MM-dd.md` が見つかりません。先に作成してください。」と通知する
5. `git commit -m "{Tag}: {message}"` を実行する