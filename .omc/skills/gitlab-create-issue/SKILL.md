---
name: gitlab-create-issue
description: Create GitLab issue from requirements
triggers:
  - "gitlab create"
  - "create issue"
  - "gitlab-create-issue"
argument-hint: "<requirement-description>"
level: 2
---

# GitLab Issue Creator

Creates a new GitLab issue from requirement description.

## Usage

```
/gitlab-create-issue 用户认证功能需求：支持OAuth2和JWT两种方式
```

## Requirements

- `GITLAB_TOKEN` environment variable
- GitLab project URL in `.omc/gitlab-project.json`
