---
name: gitlab-new-requirement
description: Analyze new requirement and create GitLab issue
triggers:
  - "新需求"
  - "new requirement"
  - "add requirement"
  "requirement"
---

# GitLab New Requirement

Automatically analyzes requirements and creates GitLab issues.

## Usage

```
/gitlab-new-requirement 实现用户登录功能，支持邮箱和手机号登录
```

Or simply describe the requirement:
```
新需求：添加订单导出功能，支持CSV和Excel格式
```

## Configuration

Required:
- `GITLAB_TOKEN` environment variable
- GitLab project URL in `.omc/gitlab-project.json`

## Output

The command will:
1. Analyze the requirement
2. Generate structured issue title and description
3. Create issue via GitLab API
4. Save issue URL for auto-commenting
5. Return issue link and number

## Example

Input: "添加用户头像上传功能，限制2MB"

Output:
```
✓ Issue created: #123
📝 [功能] 添加用户头像上传功能
🔗 https://gitlab.com/group/project/-/issues/123
```
