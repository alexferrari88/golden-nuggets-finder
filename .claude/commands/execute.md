---
allowed-tools: Task, Read, Edit, MultiEdit, Write, Bash, Glob, Grep, TodoWrite, WebFetch, WebSearch, mcp__playwright__*, mcp__context7__*
description: Execute a specific task from a plan file with comprehensive context and parallel processing
---

## Context

- Current working directory: !`pwd`
- Current git status: !`git status --porcelain`
- Current git branch: !`git branch --show-current`

## Parameters

- `$FILE`: The plan file containing the task/phase to execute (from $ARGUMENTS)
- `$ID`: The specific task or phase ID to execute from the plan file (from $ARGUMENTS)

## Your Task

### 1. Preparation Phase

- Carefully read the plan file and locate the specified task/phase ID
- Analyze dependencies and determine if parallel execution is beneficial

### 2. Execution Phase

- Execute the task/phase following the specifications exactly
- **Parallel Processing**: If the task/phase consists of multiple independent items, spawn multiple agents in parallel for faster completion
- **Sequential Processing**: Execute items sequentially if they have dependencies
- Use systems thinking and ultra-hard analysis throughout

### 3. Quality Assurance

- Verify all acceptance criteria are met
- Run tests if applicable
- Ensure no regressions are introduced

### 4. Completion Phase

Update the plan file to:

- Mark the task/phase as completed
- Check off all accomplished acceptance criteria
- Add a `Completion Notes` section only if important details need documentation

## Available Tools

- **Task**: For spawning parallel agents
- **Context7**: For fetching documentation
- **Playwright**: For browser automation and testing
- **All standard file operations**: Read, Edit, MultiEdit, Write
- **Search tools**: Glob, Grep for codebase exploration

## Success Criteria

- All acceptance criteria pass
- No breaking changes introduced
- Plan file accurately reflects completion status
