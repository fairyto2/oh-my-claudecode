#!/usr/bin/env node

/**
 * GitLab New Requirement Handler
 *
 * Analyzes requirements and creates GitLab issues.
 * Triggered by /gitlab-new-requirement slash command.
 *
 * Environment:
 *   - GITLAB_TOKEN: GitLab personal access token
 *   - GITLAB_PROJECT_URL: GitLab project URL (or .omc/gitlab-project.json)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Get GitLab project URL.
 */
function getProjectUrl(cwd) {
  if (process.env.GITLAB_PROJECT_URL) {
    return process.env.GITLAB_PROJECT_URL;
  }
  try {
    const configPath = join(cwd, '.omc', 'gitlab-project.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return config.project_url;
    }
  } catch {}
  return null;
}

/**
 * Analyze requirement and determine type/labels.
 */
function analyzeRequirement(text) {
  const lower = text.toLowerCase();

  // Determine requirement type
  let type = 'feature';
  let label = 'feature';
  let prefix = '[功能]';

  if (lower.includes('bug') || lower.includes('修复') || lower.includes('fix') || lower.includes('错误')) {
    type = 'bug';
    label = 'bug';
    prefix = '[Bug]';
  } else if (lower.includes('优化') || lower.includes('improve') || lower.includes('性能')) {
    type = 'improvement';
    label = 'improvement';
    prefix = '[优化]';
  } else if (lower.includes('文档') || lower.includes('document')) {
    type = 'documentation';
    label = 'documentation';
    prefix = '[文档]';
  } else if (lower.includes('测试') || lower.includes('test')) {
    type = 'test';
    label = 'test';
    prefix = '[测试]';
  }

  // Extract title (first sentence or first 50 chars)
  let title = text.split(/[。！？.!?]/)[0].trim();
  if (title.length > 50) {
    title = title.substring(0, 47) + '...';
  }
  title = `${prefix} ${title}`;

  return { type, label, title };
}

/**
 * Generate issue description.
 */
function generateDescription(requirement, analysis) {
  const now = new Date();
  const timestamp = now.toLocaleString('zh-CN');

  let desc = `## 需求描述\n\n${requirement}\n\n`;
  desc += `## 需求类型\n\n${analysis.type}\n\n`;
  desc += `## 创建信息\n\n`;
  desc += `- **创建时间**: ${timestamp}\n`;
  desc += `- **来源**: OMC 需求分析\n\n`;

  // Add task breakdown based on type
  desc += `## 任务分解\n\n`;
  if (analysis.type === 'bug') {
    desc += `- [ ] 复现问题\n`;
    desc += `- [ ] 定位根因\n`;
    desc += `- [ ] 修复问题\n`;
    desc += `- [ ] 测试验证\n`;
    desc += `- [ ] 回归测试\n`;
  } else if (analysis.type === 'feature') {
    desc += `- [ ] 需求分析\n`;
    desc += `- [ ] 方案设计\n`;
    desc += `- [ ] 开发实现\n`;
    desc += `- [ ] 单元测试\n`;
    desc += `- [ ] 集成测试\n`;
    desc += `- [ ] 文档更新\n`;
  } else {
    desc += `- [ ] 分析现状\n`;
    desc += `- [ ] 制定方案\n`;
    desc += `- [ ] 实施改进\n`;
    desc += `- [ ] 验证效果\n`;
  }

  desc += `\n---\n*由 OMC GitLab 集成自动创建*`;

  return desc;
}

/**
 * Create GitLab issue.
 */
async function createIssue(projectUrl, title, description, labels) {
  const token = process.env.GITLAB_TOKEN || process.env.OMC_GITLAB_TOKEN;
  if (!token) {
    return { success: false, error: '未配置 GITLAB_TOKEN' };
  }

  try {
    const urlMatch = projectUrl.match(/gitlab\.com\/(.+)$/);
    if (!urlMatch) {
      return { success: false, error: '无效的 GitLab 项目 URL' };
    }

    const projectPath = urlMatch[1].replace(/\/$/, '');
    const encodedPath = projectPath.replace(/\//g, '%2F');
    const apiUrl = `https://gitlab.com/api/v4/projects/${encodedPath}/issues`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        labels: `requirement,omc,${labels}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const issue = await response.json();
    return {
      success: true,
      issue: {
        iid: issue.iid,
        url: issue.web_url,
        title: issue.title,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Save issue metadata for auto-commenting.
 * Includes both URL and IID for robust comment updates.
 */
function saveIssueMetadata(cwd, issueUrl, issueIid) {
  try {
    const configPath = join(cwd, '.omc', 'gitlab-issue.json');
    const config = {
      issue_url: issueUrl,
      issue_iid: issueIid,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch {}
}

/**
 * Main handler.
 */
async function main() {
  const requirement = process.argv[2];

  if (!requirement) {
    console.log('用法: /gitlab-new-requirement <需求描述>');
    console.log('');
    console.log('示例:');
    console.log('  /gitlab-new-requirement 添加用户头像上传功能');
    console.log('  /gitlab-new-requirement 修复登录页面样式错乱问题');
    process.exit(0);
  }

  const cwd = process.cwd();
  const projectUrl = getProjectUrl(cwd);

  if (!projectUrl) {
    console.log('❌ 未配置 GitLab 项目');
    console.log('');
    console.log('请设置 GITLAB_PROJECT_URL 环境变量或运行:');
    console.log('  node ~/.claude/plugins/marketplaces/omc/scripts/set-gitlab-project.mjs <项目URL>');
    process.exit(1);
  }

  // Analyze requirement
  const analysis = analyzeRequirement(requirement);
  const description = generateDescription(requirement, analysis);

  // Create issue
  const result = await createIssue(projectUrl, analysis.title, description, analysis.label);

  if (!result.success) {
    console.log(`❌ 创建 Issue 失败: ${result.error}`);
    process.exit(1);
  }

  const issue = result.issue;

  // Save for auto-commenting
  saveIssueMetadata(cwd, issue.url, issue.iid);

  // Output result
  console.log(`✅ Issue 已创建: #${issue.iid}`);
  console.log(`📝 ${issue.title}`);
  console.log(`🔗 ${issue.url}`);
}

main();
