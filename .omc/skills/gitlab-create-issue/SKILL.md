---
name: gitlab-create-issue
description: Analyze requirements and create GitLab issue
triggers:
  - "gitlab create"
  - "create issue"
  - "new issue"
---

# GitLab Issue Creator

Analyzes requirements and creates a new GitLab issue.

## Usage

```
/gitlab-create-issue 用户认证功能需求：支持OAuth2和JWT两种方式
```

## Requirements

- `GITLAB_TOKEN` environment variable with GitLab personal access token
- GitLab project URL in `.omc/gitlab-project.json` or `GITLAB_PROJECT_URL`

## Process

1. Analyze the requirement description
2. Generate issue title and detailed description
3. Create issue via GitLab API
4. Save issue URL to `.omc/gitlab-issue.json` for auto-commenting

## Output

Returns the created issue URL and number.
