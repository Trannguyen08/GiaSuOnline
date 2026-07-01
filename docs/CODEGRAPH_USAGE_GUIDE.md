# CodeGraph Usage Guide

This guide explains how to use CodeGraph effectively with AI coding agents while saving tokens and improving accuracy.

## Main Idea

Do not paste the whole codebase into prompts.

Use CodeGraph to extract the smallest useful context first, then give that context to the agent.

Good workflow:

1. Search for the right symbol, file, or feature.
2. Generate focused context for the task.
3. Check callers, callees, or impact before editing.
4. Paste only relevant CodeGraph output into the prompt.
5. Ask the agent to work only from that context unless more is needed.

## Command Path

If `codegraph` is not available in PowerShell PATH, use the full command:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd
```

Examples below use the full command for reliability.

## Update The Index

Run this after changing code:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd sync
```

Run this when you want to rebuild the full index:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd index
```

## Check CodeGraph Status

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd status
```

Use this to confirm the project is indexed and ready.

## Find Files And Symbols

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd query "Tutor"
```

Use `query` before asking an agent to inspect a feature. It helps locate relevant classes, functions, routes, services, models, or files.

Good searches:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd query "login"
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd query "register"
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd query "Tutor"
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd query "booking"
```

## Generate Focused Context

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd context "fix tutor registration validation"
```

Use `context` for a specific task. The more specific the task, the smaller and better the context.

Good:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd context "fix login error when password is wrong"
```

Not as good:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd context "fix project"
```

## Check Callers

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd callers "login"
```

Use this before changing a function or method. It shows what code calls that symbol.

Prompt example:

```text
Here are the callers for the login symbol from CodeGraph.
Change the login behavior without breaking existing callers.
If a caller contract must change, list the affected files first.

[PASTE CODEGRAPH OUTPUT HERE]
```

## Check Callees

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd callees "login"
```

Use this to understand what a function depends on.

Prompt example:

```text
Here are the callees for the login symbol from CodeGraph.
Explain the dependency flow and identify the most likely source of the bug.

[PASTE CODEGRAPH OUTPUT HERE]
```

## Analyze Impact Before Editing

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd impact "Tutor"
```

Use `impact` before editing shared models, services, utilities, hooks, middleware, or API contracts.

Prompt example:

```text
Based on this CodeGraph impact analysis, propose the smallest safe change.
Do not modify unrelated files.
Call out risky affected areas before editing.

[PASTE CODEGRAPH OUTPUT HERE]
```

## Find Affected Tests

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd affected backend\app.py
```

Use this after changing source files to find likely related tests.

## Token-Saving Prompt Template

Use this when asking an AI agent to work with CodeGraph context:

```text
You are working in the GiaSuOnline repo.

Use the CodeGraph context below as the primary source.
Do not scan the whole repository unless the context is clearly insufficient.
If more context is needed, ask for the exact symbol, file, or command output needed.

Task:
[DESCRIBE THE TASK CLEARLY]

Constraints:
- Only edit directly related files.
- Preserve existing behavior unless the task requires a change.
- Identify entrypoints, dependencies, and affected files before editing.
- Run the smallest relevant test or check after editing.

CodeGraph context:
[PASTE CODEGRAPH OUTPUT HERE]
```

## Debugging Prompt Template

```text
Use this CodeGraph context to debug the issue.

Issue:
[DESCRIBE ERROR OR BUG]

Goal:
Find the likely root cause and make the smallest fix.

Rules:
- Do not inspect unrelated areas.
- If the context is missing something, request the exact CodeGraph command needed.
- After fixing, explain which files changed and why.

CodeGraph context:
[PASTE CODEGRAPH OUTPUT HERE]
```

## Refactor Prompt Template

```text
Use the CodeGraph context and impact analysis below.

Refactor goal:
[DESCRIBE REFACTOR]

Rules:
- Keep public behavior unchanged.
- Avoid broad rewrites.
- Use callers/callees to preserve contracts.
- List affected files before making changes.

CodeGraph output:
[PASTE CODEGRAPH OUTPUT HERE]
```

## Review Prompt Template

```text
Review this change using the CodeGraph context below.

Focus on:
- Bugs
- Regressions
- Broken contracts
- Missing tests
- Risky affected files

Do not summarize the whole codebase.

CodeGraph context:
[PASTE CODEGRAPH OUTPUT HERE]
```

## Recommended Workflows

### Fix A Bug

1. Search the feature:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd query "login"
```

2. Generate task context:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd context "fix login error"
```

3. Check impact if editing shared code:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd impact "login"
```

4. Paste the relevant output into the agent prompt.

### Understand A Feature

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd context "explain tutor booking flow"
```

Prompt:

```text
Explain this flow from entrypoint to data persistence.
Only use the CodeGraph context below.
Mention files and symbols involved.

[PASTE CODEGRAPH OUTPUT HERE]
```

### Change A Shared Model Or Service

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd impact "Tutor"
```

Then:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd callers "Tutor"
```

Prompt:

```text
Use this impact and caller information before changing Tutor.
Make the smallest compatible change.
List affected files first.

[PASTE CODEGRAPH OUTPUT HERE]
```

## Best Practices

- Use specific task descriptions in `context`.
- Use `query` before `context` when you are unsure about names.
- Use `impact` before touching shared code.
- Use `callers` and `callees` before changing function behavior.
- Paste only relevant output into prompts.
- Run `sync` after edits so CodeGraph stays current.
- Ask the agent to request exact missing context instead of scanning the whole repo.

## Bad Prompt

```text
Read the whole project and fix the login bug.
```

This wastes tokens and can make the agent inspect unrelated files.

## Better Prompt

```text
Use the CodeGraph context below to fix the login bug.
If more information is needed, ask for the exact symbol or CodeGraph command.
Only edit directly related files.

[PASTE CODEGRAPH CONTEXT HERE]
```

## Quick Command Cheat Sheet

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd status
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd files
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd query "symbol"
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd context "specific task"
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd callers "symbol"
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd callees "symbol"
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd impact "symbol"
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd affected path\to\file
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd sync
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd index
```

