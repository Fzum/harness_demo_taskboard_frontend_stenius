import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const DEFAULT_URL = 'http://localhost:4200';
const DEFAULT_SCREENSHOT = path.join(process.cwd(), 'taskboard-footer-smoke.png');
const VERSION_LABEL_PATTERN = /^Backend version (?!unavailable$).+/;

export function resolveChromeBinary(env = process.env) {
  const candidates = [
    env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'google-chrome',
    'chromium-browser',
    'chromium',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.includes(path.sep)) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      continue;
    }

    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) {
      return candidate;
    }
  }

  throw new Error(
    'Could not find a Chrome/Chromium binary. Set CHROME_BIN to a headless-capable browser.',
  );
}

export function extractFooterLabel(dom) {
  const footer = dom.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
  if (!footer) {
    throw new Error('No <footer> element found in the rendered Taskboard page.');
  }

  const small = footer[1].match(/<small\b[^>]*>([\s\S]*?)<\/small>/i);
  if (!small) {
    throw new Error('No <small> footer label found in the rendered Taskboard page.');
  }

  return small[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isVersionFooterLabel(label) {
  return VERSION_LABEL_PATTERN.test(label);
}

function parseArgs(argv) {
  const args = { url: DEFAULT_URL, screenshot: DEFAULT_SCREENSHOT };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--url') {
      args.url = argv[index + 1] ?? args.url;
      index += 1;
    } else if (arg === '--screenshot') {
      args.screenshot = argv[index + 1] ?? args.screenshot;
      index += 1;
    }
  }

  return args;
}

export function runFooterSmoke(
  { url, screenshot, env = process.env } = parseArgs(process.argv.slice(2)),
) {
  const browser = resolveChromeBinary(env);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskboard-footer-smoke-'));
  const command = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1440,1600',
    '--virtual-time-budget=5000',
    `--screenshot=${screenshot}`,
    '--dump-dom',
    url,
  ];

  const result = spawnSync(browser, [...command, `--user-data-dir=${userDataDir}`], {
    encoding: 'utf8',
  });

  fs.rmSync(userDataDir, { recursive: true, force: true });

  if (result.status !== 0) {
    throw new Error(
      result.stderr.trim() || `Chrome exited with status ${result.status ?? 'unknown'}.`,
    );
  }

  const label = extractFooterLabel(result.stdout);
  if (!isVersionFooterLabel(label)) {
    throw new Error(
      `Expected the live footer to show a backend version, but it rendered "${label}" instead.`,
    );
  }

  return { browser, screenshot, url, label };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { browser, screenshot, url, label } = runFooterSmoke();
  process.stdout.write(
    `Verified Taskboard footer via ${browser} at ${url}\nFooter label: ${label}\nScreenshot: ${screenshot}\n`,
  );
}
