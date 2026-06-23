#!/usr/bin/env node

/**
 * GitLab Issue Comment Hook (Stop)
 *
 * Adds comments to GitLab issues when changes are made.
 * Issue URL is stored in .omc/gitlab-issue.json.
 *
 * Configurable via env vars:
 *   - OMC_GITLAB_TOKEN: GitLab personal access token
 *   - OMC_GITLAB_COMMENT: Enable/disable (default: true)
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import https from 'node:https';

const ENABLE_GITLAB_COMMENT = process.env.OMC_GITLAB_COMMENT !== 'false';
const SKIP_TLS_VERIFY = process.env.GITLAB_SKIP_TLS_VERIFY === 'true';

/**
 * Get GitLab issue metadata from .omc/gitlab-issue.json or env var.
 * Returns { url, iid } or null.
 */
function getIssueMetadata(cwd) {
  // Try env var first
  if (process.env.GITLAB_ISSUE_URL) {
    return { url: process.env.GITLAB_ISSUE_URL, iid: null };
  }

  // Try .omc/gitlab-issue.json
  try {
    const configPath = join(cwd, '.omc', 'gitlab-issue.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return {
        url: config.issue_url,
        iid: config.issue_iid || null,
      };
    }
  } catch {
    // Fall through
  }

  return null;
}

/**
 * Set GitLab issue URL in .omc/gitlab-issue.json.
 */
function setIssueUrl(cwd, url) {
  try {
    const omcDir = join(cwd, '.omc');
    const configPath = join(omcDir, 'gitlab-issue.json');

    const config = { issue_url: url, updated_at: new Date().toISOString() };
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user input from recent git commits or changes.
 */
function getSummary(cwd) {
  try {
    // Get recent changes summary
    const status = execSync('git status --short', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    // Get recent commits
    const commits = execSync('git log --oneline -5 --pretty=format:"%s"', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    return {
      status,
      commits,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Post comment to GitLab issue.
 * Accepts issue metadata with url and optional iid.
 */
async function postComment(issueMetadata, summary) {
  const token = process.env.GITLAB_TOKEN || process.env.OMC_GITLAB_TOKEN;
  if (!token) {
    return { success: false, error: 'No GitLab token configured' };
  }

  try {
    const { url: issueUrl, iid: storedIid } = issueMetadata;

    // Parse issue URL: https://gitlab.com/group/project/-/issues/123 or https://custom.host/group/project/-/issues/123
    const urlMatch = issueUrl.match(/https?:\/\/([^\/]+)\/(.+?)\/-\/issues\/(\d+)/);
    if (!urlMatch) {
      return { success: false, error: 'Invalid GitLab issue URL' };
    }

    const [, host, projectPath, parsedIid] = urlMatch;
    // Use stored IID if available, otherwise use parsed from URL
    const issueIid = storedIid || parsedIid;
    const encodedPath = projectPath.replace(/\//g, '%2F');
    const apiUrl = `https://${host}/api/v4/projects/${encodedPath}/issues/${issueIid}/notes`;

    // Build comment body
    const commentBody = buildCommentBody(summary);

    // Use https module to support SKIP_TLS_VERIFY
    return new Promise((resolve) => {
      const url = new URL(apiUrl);
      const postData = JSON.stringify({ body: commentBody });

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        rejectUnauthorized: !SKIP_TLS_VERIFY,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}` });
          }
        });
      });

      req.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Build comment body from summary.
 */
function buildCommentBody(summary) {
  if (!summary) {
    return '🤖 No changes to report.';
  }

  let body = `## 📝 Update Summary (${new Date().toLocaleString('zh-CN')})\n\n`;

  if (summary.commits) {
    body += `### Recent Commits\n`;
    body += '```\n' + summary.commits + '\n```\n\n';
  }

  if (summary.status) {
    body += `### Changed Files\n`;
    body += '```\n' + summary.status + '\n```\n';
  }

  body += `\n---\n*Posted by OMC auto-comment hook*`;

  return body;
}

async function main() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);

    const cwd = data.cwd || process.cwd();

    if (!ENABLE_GITLAB_COMMENT) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const issueMetadata = getIssueMetadata(cwd);
    if (!issueMetadata) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const summary = getSummary(cwd);
    const result = await postComment(issueMetadata, summary);

    if (result.success) {
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `✓ Posted comment to GitLab issue`,
      }));
    } else {
      // Silently fail on error
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    }
  } catch (error) {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.on('data', (chunk) => data += chunk);
    process.stdin.on('end', () => resolve(data || '{}'));
    process.stdin.on('error', reject);
  });
}

main();
