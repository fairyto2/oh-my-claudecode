#!/usr/bin/env node
/**
 * LLM-based Git Commit Message Generator
 *
 * Standalone script that generates commit messages using `claude -p`
 * based on staged git changes.
 *
 * Usage:
 *   node generate-commit-message.mjs [--directory DIR] [--fallback MESSAGE]
 *
 * The script:
 * 1. Gets the git diff of staged changes
 * 2. Sends the diff to Claude with a prompt to generate a commit message
 * 3. Returns the generated message (or fallback if generation fails)
 *
 * Exit codes:
 *   0 - success (message generated or fallback used)
 *   1 - error
 */

import { execFileSync } from 'child_process';

const DEFAULT_FALLBACK = 'auto-commit';
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

function log(...args) {
  if (verbose) {
    console.error('[commit-msg]', ...args);
  }
}

/**
 * Get the staged git diff.
 */
function getStagedDiff(directory = '.') {
  try {
    const result = execFileSync('git', ['diff', '--cached'], {
      cwd: directory,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error) {
    log('git diff --cached failed:', error.message);
    return '';
  }
}

/**
 * Get list of staged files for context.
 */
function getStagedFiles(directory = '.') {
  try {
    const result = execFileSync('git', ['diff', '--cached', '--name-only'], {
      cwd: directory,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim().split('\n').filter(f => f);
  } catch (error) {
    log('git diff --cached --name-only failed:', error.message);
    return [];
  }
}

/**
 * Generate commit message using `claude -p`.
 */
function generateCommitMessage(diff, files) {
  const prompt = `You are a git commit message generator. Given the following git diff and changed files, generate a concise commit message following conventional commit format (type: description).

Guidelines:
- Use conventional commit types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
- Keep the subject line under 72 characters
- Use imperative mood (add, not added; fix, not fixed)
- Do NOT end with a period
- Include scope in parentheses when applicable (e.g., feat(auth): add login)
- For trivial/formatting changes, use chore or style
- Output ONLY the commit message, nothing else

Changed files:
${files.map(f => `- ${f}`).join('\n')}

Diff:
${diff || '(no diff)'}

Commit message:`;

  try {
    const result = execFileSync('claude', ['-p', prompt], {
      encoding: 'utf-8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: 'commit-message' },
    });
    const message = result.trim().split('\n')[0]; // Take first line only
    return message || null;
  } catch (error) {
    log('claude -p failed:', error.message);
    return null;
  }
}

/**
 * Validate commit message is safe for git commit -m.
 */
function sanitizeCommitMessage(message) {
  if (!message) return DEFAULT_FALLBACK;
  // Remove newlines and limit length
  return message.replace(/[\r\n]+/g, ' ').slice(0, 200).trim() || DEFAULT_FALLBACK;
}

function main() {
  let directory = '.';
  let fallbackMessage = null;

  // Parse arguments
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const next = process.argv[i + 1];

    if (arg === '--directory' || arg === '-d') {
      directory = next || '.';
      i++;
    } else if (arg === '--fallback' || arg === '-f') {
      fallbackMessage = next || DEFAULT_FALLBACK;
      i++;
    }
  }

  log('directory:', directory);
  log('fallback:', fallbackMessage || DEFAULT_FALLBACK);

  // Get staged changes
  const diff = getStagedDiff(directory);
  const files = getStagedFiles(directory);

  if (files.length === 0) {
    log('no staged files found');
    console.log(fallbackMessage || DEFAULT_FALLBACK);
    process.exit(0);
  }

  log('staged files:', files.length);
  log('diff size:', diff.length, 'bytes');

  // Limit diff size to avoid overwhelming the LLM
  const maxDiffSize = 50_000; // 50KB limit
  const truncatedDiff = diff.length > maxDiffSize
    ? diff.slice(0, maxDiffSize) + '\n... (diff truncated)'
    : diff;

  // Generate commit message
  const generated = generateCommitMessage(truncatedDiff, files);
  const message = sanitizeCommitMessage(generated);

  log('generated message:', generated ? 'yes' : 'no');
  log('final message:', message);

  console.log(message);
  process.exit(0);
}

main();
