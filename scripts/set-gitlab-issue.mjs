#!/usr/bin/env node

/**
 * Set GitLab Issue URL helper script
 * Usage: node set-gitlab-issue.mjs <issue-url>
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[2];

if (!url) {
  console.error('Usage: node set-gitlab-issue.mjs <issue-url>');
  process.exit(1);
}

// Validate GitLab issue URL format and extract IID
const urlMatch = url.match(/gitlab\.com\/(.+\/.+\/-\/issues\/(\d+))/);
if (!urlMatch) {
  console.error('Invalid GitLab issue URL format');
  console.error('Expected: https://gitlab.com/group/project/-/issues/123');
  process.exit(1);
}

const issueUrl = `https://gitlab.com/${urlMatch[1]}`;
const issueIid = urlMatch[2];

const cwd = process.cwd();
const configPath = join(cwd, '.omc', 'gitlab-issue.json');

const config = {
  issue_url: issueUrl,
  issue_iid: issueIid,
  updated_at: new Date().toISOString(),
};

try {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✓ GitLab issue metadata saved to ${configPath}`);
  console.log(`  Issue #${issueIid}: ${issueUrl}`);
} catch (error) {
  console.error(`✗ Failed to save: ${error.message}`);
  process.exit(1);
}
