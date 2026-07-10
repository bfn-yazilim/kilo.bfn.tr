# AGENTS.md

## Purpose

Reduce unnecessary token usage while keeping code changes accurate, safe, and easy to review.

## Core Rules

- Be concise by default.
- Do not repeat the user's request.
- Do not write long explanations unless explicitly asked.
- Do not paste full files unless explicitly requested.
- Prefer small diffs over full rewrites.
- Prefer direct answers over background information.
- Avoid greetings, filler, motivational text, and unnecessary summaries.
- Keep final responses short and focused on what changed.

## Repository Exploration

- Inspect only files that are directly relevant to the task.
- Do not scan the entire repository unless required.
- Prefer targeted search commands over broad file reads.
- Use symbol, filename, route, component, function, or error-message searches first.
- Do not open generated, compiled, dependency, cache, or build-output folders unless required.
- Avoid reading large files completely. Read only the needed sections.
- Stop exploring once enough context is available to make the change safely.

## Avoid These Folders Unless Necessary

- `node_modules/`
- `dist/`
- `build/`
- `.next/`
- `.nuxt/`
- `.cache/`
- `coverage/`
- `.git/`
- `vendor/`
- `target/`
- `bin/`
- `obj/`
- `__pycache__/`
- `.venv/`
- `logs/`
- `tmp/`

## Planning

- For simple tasks, skip the plan and make the change directly.
- For medium or complex tasks, use a maximum 3-step plan.
- Do not over-plan.
- Do not restate obvious steps.
- If a task is ambiguous but still solvable, make the safest reasonable assumption and continue.
- Ask a question only when ambiguity blocks the task.

## Coding Style

- Make the smallest correct change.
- Preserve the existing architecture, naming, formatting, and style.
- Do not refactor unrelated code.
- Do not rename files, functions, variables, routes, or components unless required.
- Do not introduce new dependencies unless clearly necessary.
- Do not add comments that explain obvious code.
- Do not generate unused abstractions, helpers, wrappers, or boilerplate.
- Do not change public behavior outside the requested scope.

## Output Discipline

When replying after a code change, use this format:

```text
Changed:
- <file/path>: <short change>

Tests:
- <command run or "Not run">

Notes:
- <only important caveats, if any>
```

Rules for final output:

- Keep the final answer under 1200 tokens unless the user asks for detail.
- Do not include unchanged code.
- Do not include full file contents.
- Do not include long logs.
- Do not include large command outputs.
- If a command output is important, summarize only the relevant lines.
- If code is requested, provide only the code or patch needed.

## Diffs and Patches

- Prefer patch-style changes when showing code.
- Show only changed blocks.
- Do not include unrelated surrounding code.
- Do not show generated lockfile diffs unless important.
- If many files changed, summarize by file instead of pasting all diffs.

## Testing

- Run the narrowest relevant test first.
- Do not run the full test suite unless the change is broad or risky.
- Do not run expensive commands without a clear reason.
- If tests are skipped, say exactly why in one short sentence.
- If tests fail because of unrelated existing issues, summarize briefly and do not investigate deeply unless asked.

## Debugging

- Start from the exact error message or failing behavior.
- Search for the smallest relevant code path.
- Do not inspect unrelated modules.
- Do not propose multiple speculative fixes when one likely fix is clear.
- Verify the fix with the smallest reproducible check.

## Documentation

- Update docs only when the user asks or when behavior/configuration changes require it.
- Keep documentation changes short.
- Do not create large README sections unless requested.
- Prefer examples over long explanations.

## Security and Secrets

- Never print secrets, tokens, passwords, private keys, cookies, or credentials.
- If a secret appears in files or logs, redact it in the response.
- Do not add secrets to source code.
- Use environment variables for sensitive configuration.

## Large Tasks

For large implementation requests:

1. Identify the smallest deliverable that satisfies the request.
2. Modify only the required files.
3. Provide a concise summary and test result.

Do not split the work into unnecessary phases unless the user asks.

## Review Mode

When asked to review code:

- Focus on bugs, security issues, broken logic, edge cases, and maintainability risks.
- Do not nitpick style unless it causes a real problem.
- Limit findings to the most important issues.
- Include file and line references when possible.
- Do not rewrite the whole solution unless asked.

## Explanation Mode

When asked to explain:

- Start with the answer directly.
- Use short bullets.
- Avoid history and theory unless needed.
- Use examples only when they clarify the answer.
- Keep explanations practical and implementation-focused.

## Default Behavior

Unless the user asks otherwise:

- Be brief.
- Edit minimally.
- Read minimally.
- Test narrowly.
- Summarize only what matters.
