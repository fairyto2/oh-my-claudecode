#!/usr/bin/env node

/**
 * Set GitLab Project URL helper script
 * Usage: node set-gitlab-project.mjs <project-url>
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.argv[2];

if (!url) {
  console.error('Usage: node set-gitlab-project.mjs <project-url>');
  console.error('Example: node set-gitlab-project.mjs https://gitlab.com/group/project');
  process.exit(1);
}

// Validate GitLab project URL format
const urlMatch = url.match(/gitlab\.com\/[^\/]+\/[^\/]+\/?$/);
if (!urlMatch) {
  console.error('Invalid GitLab project URL format');
  console.error('Expected: https://gitlab.com/group/project');
  process.exit(1);
}

const cwd = process.cwd();
const configPath = join(cwd, '.omc', 'gitlab-project.json');

const config = {
  project_url: url.replace(/\/$/, ''), // Remove trailing slash
  updated_at: new Date().toISOString(),
};

try {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✓ GitLab project URL saved to ${configPath}`);
  console.log(`  Project: ${config.project_url}`);
} catch (error) {
  console.error(`✗ Failed to save: ${error.message}`);
  process.exit(1);
}
