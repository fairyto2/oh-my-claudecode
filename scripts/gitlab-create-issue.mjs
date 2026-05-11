#!/usr/bin/env node

/**
 * GitLab Issue Creator
 *
 * Analyzes requirements and creates a new GitLab issue.
 *
 * Usage: node gitlab-create-issue.mjs <requirement-description>
 *
 * Environment:
 *   - GITLAB_TOKEN: GitLab personal access token
 *   - GITLAB_PROJECT_URL: GitLab project URL (or use .omc/gitlab-project.json)
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Get GitLab project URL from env or config file.
 */
function getProjectUrl(cwd) {
  // Try env var first
  if (process.env.GITLAB_PROJECT_URL) {
    return process.env.GITLAB_PROJECT_URL;
  }

  // Try .omc/gitlab-project.json
  try {
    const configPath = join(cwd, '.omc', 'gitlab-project.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return config.project_url;
    }
  } catch {
    // Fall through
  }

  return null;
}

/**
 * Analyze requirement and generate issue title/description.
 */
function analyzeRequirement(description) {
  // Extract key points from description
  const lines = description.trim().split('\n').filter(Boolean);

  // First line or first sentence becomes title
  let title = lines[0];
  if (title.length > 80) {
    title = title.substring(0, 77) + '...';
  }

  // Build detailed description
  let body = `## Requirement\n\n${description}\n\n`;

  // Add technical details section
  body += `## Technical Details\n\n`;
  body += `- **Created**: ${new Date().toISOString()}\n`;
  body += `- **Source**: OMC requirement analysis\n\n`;

  // Add task breakdown template
  body += `## Task Breakdown\n\n`;
  body += `- [ ] Analyze requirements\n`;
  body += `- [ ] Design solution\n`;
  body += `- [ ] Implementation\n`;
  body += `- [ ] Testing\n`;
  body += `- [ ] Documentation\n\n`;

  body += `---\n*Created by OMC GitLab integration*`;

  return { title, body };
}

/**
 * Create GitLab issue via API.
 */
async function createIssue(projectUrl, title, description) {
  const token = process.env.GITLAB_TOKEN || process.env.OMC_GITLAB_TOKEN;
  if (!token) {
    return { success: false, error: 'No GitLab token configured' };
  }

  try {
    // Parse project URL: https://gitlab.com/group/project
    const urlMatch = projectUrl.match(/gitlab\.com\/(.+)$/);
    if (!urlMatch) {
      return { success: false, error: 'Invalid GitLab project URL' };
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
        labels: 'requirement,omc',
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
 * Save issue URL to .omc/gitlab-issue.json.
 */
function saveIssueUrl(cwd, issueUrl) {
  try {
    const configPath = join(cwd, '.omc', 'gitlab-issue.json');
    const config = {
      issue_url: issueUrl,
      updated_at: new Date().toISOString(),
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  const description = process.argv[2];

  if (!description) {
    console.error('Usage: node gitlab-create-issue.mjs <requirement-description>');
    console.error('');
    console.error('Environment:');
    console.error('  GITLAB_TOKEN=<token> ... GitLab personal access token');
    console.error('  GITLAB_PROJECT_URL=<url> ... GitLab project URL');
    process.exit(1);
  }

  const cwd = process.cwd();
  const projectUrl = getProjectUrl(cwd);

  if (!projectUrl) {
    console.error('✗ GitLab project URL not configured');
    console.error('  Set GITLAB_PROJECT_URL or create .omc/gitlab-project.json');
    process.exit(1);
  }

  // Analyze requirement
  const { title, body } = analyzeRequirement(description);

  console.log(`Creating issue: ${title}`);

  // Create issue
  const result = await createIssue(projectUrl, title, body);

  if (!result.success) {
    console.error(`✗ Failed to create issue: ${result.error}`);
    process.exit(1);
  }

  const issue = result.issue;
  console.log(`✓ Issue created: #${issue.iid}`);
  console.log(`  URL: ${issue.url}`);

  // Save issue URL for auto-commenting
  saveIssueUrl(cwd, issue.url);
}

main();
