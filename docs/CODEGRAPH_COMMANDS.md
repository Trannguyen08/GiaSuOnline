# CodeGraph Commands

CodeGraph data is stored in:

```powershell
C:\GiaSuOnline\.codegraph
```

Use the full command path if `codegraph` is not available in PowerShell PATH:

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd
```

## Check Status

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd status
```

Shows index status, node count, edge count, and project statistics.

## View Indexed Files

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd files
```

Shows the project file structure from the CodeGraph index.

## Search Code Symbols

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd query "Tutor"
```

Searches for symbols, classes, functions, files, or code names.

## Build Task Context

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd context "explain authentication flow"
```

Builds markdown context for a task.

## Find Callers

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd callers "login"
```

Finds functions or methods that call a symbol.

## Find Callees

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd callees "login"
```

Finds functions or methods called by a symbol.

## Analyze Impact

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd impact "Tutor"
```

Shows code affected by changing a symbol.

## Find Affected Tests

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd affected backend\app.py
```

Finds test files affected by changed source files.

## Reindex Project

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd index
```

Rebuilds the full index.

## Sync Changes

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd sync
```

Syncs changes since the last index.

## Start MCP Server

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd serve
```

Starts CodeGraph as an MCP server for AI assistants.

## Install Into AI Agents

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd install
```

Installs CodeGraph MCP integration into supported agents such as Codex CLI, Cursor, Claude Code, opencode, or Hermes Agent.

## Remove CodeGraph From Project

```powershell
C:\Users\Nguyen\AppData\Roaming\npm\codegraph.cmd uninit
```

Removes CodeGraph from the current project by deleting the `.codegraph` directory.

