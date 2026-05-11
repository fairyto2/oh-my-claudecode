---
name: gitlab-new-requirement
description: Analyze new requirement and create GitLab issue
triggers:
  - "新需求"
  - "new requirement"
  - "add requirement"
  - "gitlab-new-requirement"
argument-hint: "<requirement-description>"
level: 2
---

# GitLab New Requirement

Analyzes requirements and creates GitLab issues.

## Usage

```
/gitlab-new-requirement 实现用户登录功能，支持邮箱和手机号登录
```

## Configuration

Required:
- `GITLAB_TOKEN` environment variable
- GitLab project URL in `.omc/gitlab-project.json`

## Output

- Issue link and number
- Auto-saved to `.omc/gitlab-issue.json` for continuous commenting
