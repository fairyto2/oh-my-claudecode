---
name: gitlab-issue
description: Set GitLab issue URL for auto-commenting
triggers:
  - "gitlab issue"
  - "set gitlab"
  - "gitlab comment"
---

# GitLab Issue Auto-Comment

Sets the GitLab issue URL for automatic commenting on Stop events.

## Usage

```
/gitlab-issue https://gitlab.com/group/project/-/issues/123
```

The issue URL is stored in `.omc/gitlab-issue.json`.

## Environment Variables

- `GITLAB_TOKEN`: GitLab personal access token (required for API access)
- `OMC_GITLAB_COMMENT`: Set to 'false' to disable

## Comment Format

The hook will post comments with:
- Recent commit summaries
- Changed files status
- Timestamp
