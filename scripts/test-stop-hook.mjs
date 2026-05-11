#!/usr/bin/env node

/**
 * Test Stop Hook - writes to file when triggered
 */

import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

const logFile = join(process.env.HOME, 'Desktop', 'stop-hook-test.log');

async function main() {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] Stop hook triggered\n`;

  try {
    appendFileSync(logFile, message);
  } catch (error) {
    // Silently fail
  }
}

main();
