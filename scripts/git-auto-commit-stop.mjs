#!/usr/bin/env node

/**
 * OMC Git Auto-Commit Hook (Stop)
 *
 * Automatically commits git changes when a session stops.
 * Also squashes unpushed commits and re-summarizes them.
 *
 * Configurable via env vars:
 *   - OMC_GIT_AUTO_COMMIT: Enable/disable auto-commit (default: true)
 *   - OMC_GIT_SQUASH_UNPUSHED: Enable/disable squashing (default: true)
 *   - OMC_GIT_COMMIT_MESSAGE: Custom commit message template
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readStdin } from './lib/stdin.mjs';

const ENABLE_AUTO_COMMIT = process.env.OMC_GIT_AUTO_COMMIT !== 'false';
const ENABLE_SQUASH = process.env.OMC_GIT_SQUASH_UNPUSHED !== 'false';
const DEFAULT_COMMIT_MESSAGE = 'chore: auto-commit from omc session';

/**
 * Check if we're in a git repository.
 */
function isGitRepo(cwd) {
  try {
    execSync('git rev-parse --git-dir', {
      cwd,
      stdio: 'pipe',
      timeout: 1000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the git diff summary for changed files.
 */
function getGitDiff(cwd) {
  try {
    const status = execSync('git status --porcelain', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return status.trim();
  } catch {
    return '';
  }
}

/**
 * Get count of unpushed commits.
 */
function getUnpushedCount(cwd) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    if (branch === 'HEAD') return 0; // Detached HEAD

    const result = execSync(`git rev-list --count @{u}...HEAD 2>/dev/null || echo 0`, {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: true,
    });
    return parseInt(result.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Generate commit message based on changes.
 */
function generateCommitMessage(cwd) {
  try {
    const added = execSync('git diff --cached --name-only --diff-filter=A 2>/dev/null | head -5', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: true,
    }).trim().split('\n').filter(Boolean).length;

    const modified = execSync('git diff --cached --name-only --diff-filter=M 2>/dev/null | head -5', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: true,
    }).trim().split('\n').filter(Boolean).length;

    const deleted = execSync('git diff --cached --name-only --diff-filter=D 2>/dev/null | head -5', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: true,
    }).trim().split('\n').filter(Boolean).length;

    const parts = [];
    if (added > 0) parts.push(`+${added}`);
    if (modified > 0) parts.push(`~${modified}`);
    if (deleted > 0) parts.push(`-${deleted}`);

    const summary = parts.length > 0 ? ` (${parts.join(', ')})` : '';
    return `${DEFAULT_COMMIT_MESSAGE}${summary}`;
  } catch {
    return DEFAULT_COMMIT_MESSAGE;
  }
}

/**
 * Stage all changes and commit.
 */
function commitChanges(cwd) {
  try {
    // Stage all changes
    execSync('git add -A', {
      cwd,
      stdio: 'pipe',
    });

    // Check if there's anything to commit
    const diff = getGitDiff(cwd);
    if (!diff) return { committed: false, message: 'No changes to commit' };

    // Generate commit message
    const message = generateCommitMessage(cwd);

    // Commit
    execSync(`git commit -m "${message}"`, {
      cwd,
      stdio: 'pipe',
    });

    return { committed: true, message };
  } catch (error) {
    return { committed: false, message: error.message };
  }
}

/**
 * Squash unpushed commits into one.
 */
function squashUnpushed(cwd) {
  try {
    const count = getUnpushedCount(cwd);
    if (count <= 1) return { squashed: false, message: 'No commits to squash' };

    // Get the upstream branch name
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    if (branch === 'HEAD') return { squashed: false, message: 'Detached HEAD' };

    // Reset to upstream but keep changes staged
    execSync('git reset @{u}', {
      cwd,
      stdio: 'pipe',
    });

    // Commit with summary message
    execSync(`git commit -m "${DEFAULT_COMMIT_MESSAGE} (squashed ${count} commits)"`, {
      cwd,
      stdio: 'pipe',
    });

    return { squashed: true, count };
  } catch (error) {
    return { squashed: false, message: error.message };
  }
}

async function main() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);

    const cwd = data.cwd || process.cwd();

    if (!ENABLE_AUTO_COMMIT) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    if (!isGitRepo(cwd)) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const results = {};

    // Commit any uncommitted changes
    const commitResult = commitChanges(cwd);
    results.commit = commitResult;

    // Squash unpushed commits if enabled
    if (ENABLE_SQUASH) {
      const squashResult = squashUnpushed(cwd);
      results.squash = squashResult;
    }

    // Build output
    const outputParts = [];
    if (results.commit?.committed) {
      outputParts.push(`✓ Committed: ${results.commit.message}`);
    }
    if (results.squash?.squashed) {
      outputParts.push(`✓ Squashed ${results.squash.count} commits`);
    }

    if (outputParts.length > 0) {
      console.log(JSON.stringify({
        continue: true,
        systemMessage: outputParts.join('\n'),
      }));
    } else {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    }
  } catch (error) {
    // Never block on error
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
