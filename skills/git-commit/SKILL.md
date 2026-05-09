---
name: git-commit
description: Smart git commit with automatic summarization and optional squashing
triggers:
  - "git commit"
  - "commit changes"
  - "save changes"
argument-hint: "[--squash] [--message <msg>] [--push]"
level: 2
---

# Git Commit

Use this skill when the user wants to commit git changes with an intelligent summary of what changed.

## Features

- **Auto-stage** all changes before committing
- **Smart summarization** analyzes diff to generate meaningful commit messages
- **Optional squashing** combines unpushed commits into one
- **Push support** optionally pushes after commit

## Usage

```
/git-commit                    # Commit with auto-generated message
/git-commit --squash          # Squash unpushed commits first, then commit
/git-commit --message "fix: bug"  # Use custom message
/git-commit --push            # Commit and push to remote
```

## Commit Message Format

Generated messages follow conventional commit format:

```
<type>: <description> (+added, ~modified, -deleted)

Types:
- chore:   maintenance tasks
- feat:    new features
- fix:     bug fixes
- docs:    documentation
- refactor: code refactoring
- style:   formatting changes
- test:    test additions/changes
```

## Workflow

1. Check git repository status
2. Analyze changes (added, modified, deleted files)
3. Generate intelligent commit message
4. Stage all changes (git add -A)
5. Create commit
6. Optionally squash unpushed commits (if --squash)
7. Optionally push (if --push)

## Smart Message Generation

The skill analyzes:

- File extensions to detect change type (`.ts` → code, `.md` → docs)
- Diff patterns to detect intent (new functions → feat, bug fixes → fix)
- File paths to detect area (tests/, docs/, src/)

## Squash Behavior

When `--squash` is used:

1. Count unpushed commits on current branch
2. If > 1 commit, reset to upstream but keep changes staged
3. Create single commit with summary message
4. Report squashed commit count

## Output

- Commit message used
- Files changed (summary)
- Squash information (if applicable)
- Push result (if --push)

## Error Handling

- Not in a git repository → informative error
- No changes to commit → friendly message
- Push rejected → show git output for debugging
