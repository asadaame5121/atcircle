---
description: 既存コードのテストカバレッジを測定し、テスト不足箇所を分析する
---

1. Check if `@vitest/coverage-v8` is installed. Command:
   `npm list @vitest/coverage-v8` If not installed, ask the user for permission
   to install it: `npm install -D @vitest/coverage-v8`

2. Run tests with coverage. Command: `npx vitest run --coverage`

3. Analyze the coverage report.
   - Read the output summary in the terminal.
   - If a detailed report is generated (e.g., `coverage/index.html` or
     `coverage/coverage-final.json`), try to read the summary or list the files
     with low coverage.
   - **Agent Action**: Based on the coverage report, identify files or key logic
     with low coverage (< 80%).
   - **Output**: List the files that need more tests and suggest immediate
     actions (e.g., "Create a test file for `src/components/KeyComponent.tsx`
     which currently has 0% coverage").
