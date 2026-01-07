---
description: 特定のファイルのエッジケースや異常系を分析し、テストケースを提案する
---

1. Identify the target file(s).
   - If existing files are open or specified in the prompt, use those.
   - If no file is specified, ask the user which file they want to analyze.

2. **Agent Action**: Read the content of the target file(s) using `view_file`.

3. **Agent Action**: Analyze the code acting as a **"Senior QA Engineer / Test
   Professional"**. Focus on the following aspects:
   - **Boundary Value Analysis**: Limits of loops, string lengths, numerical
     constraints.
   - **Error Handling**: Missing try-catch blocks, unhandled promise rejections,
     undefined/null checks.
   - **Type Safety**: Potential issues with `any` types or unsafe casts.
   - **State & Concurrency**: Race conditions in async functions, state
     inconsistencies in React components.
   - **User Input**: Validation gaps for malicious or unexpected inputs.

4. **Output**: Generate a list of recommended test cases. Format:
   ```markdown
   ## Recommended Test Cases for [Filename]

   ### Edge Cases

   - [ ] Case 1: Description (Why it matters)
   - [ ] Case 2: ...

   ### Error Scenarios

   - [ ] Case 3: ...
   ```

5. (Optional) Ask the user if they want to generate the actual test code for
   these cases.
