---
description: 現在のブランチからプルリクエストを作成する
---

現在のブランチの変更をプッシュし、GitHub CLI
を使用してプルリクエストを作成します。

1. 変更をステージングに追加する

```powershell
git add .
```

2. 変更をコミットする（メッセージは適宜修正してください）

```powershell
git commit -m "feat: UI/UX improvements and AI feedback implementation"
```

3. リモートにプッシュする

```powershell
git push origin $(git branch --show-current)
```

4. プルリクエストを作成する（説明文は作業内容に基づき日本語で記述してください）

```powershell
# --body に日本語で作業内容を詳しく記載してください
gh pr create --title "$(git log -1 --pretty=%s)" --body "## 作業内容`n`n- モバイル対応の強化`n- アイコンの導入`n- ダッシュボードの刷新"
```
