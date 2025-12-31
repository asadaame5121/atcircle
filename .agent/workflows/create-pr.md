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

4. プルリクエストを作成する

```powershell
gh pr create --fill
```
