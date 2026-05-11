---
name: gitlab-issue
description: Set GitLab issue URL for auto-commenting
triggers:
  - "gitlab issue"
  - "set gitlab"
---

# GitLab Issue Auto-Comment

Sets the GitLab issue URL for automatic commenting on Stop events.

## Usage

```
/gitlab-issue https://gitlab.com/group/project/-/issues/123
```

## Environment Variables

- `GITLAB_TOKEN`: GitLab personal access token
- `OMC_GITLAB_COMMENT`: Set to 'false' to disable
