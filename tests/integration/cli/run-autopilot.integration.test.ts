import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = path.resolve(process.cwd(), 'scripts/traffic/run-autopilot.mjs');
const tmpDirs = new Set<string>();

function createPack() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-autopilot-'));
  tmpDirs.add(dir);

  const packPath = path.join(dir, 'social-pack-test-campaign.json');
  fs.writeFileSync(
    packPath,
    JSON.stringify(
      {
        campaign: 'test-campaign',
        channels: {
          linkedin: {
            copyPaste: 'Post copy'
          }
        }
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return { dir, packPath };
}

function runAutopilot(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    encoding: 'utf8',
    cwd: process.cwd(),
    env: {
      ...process.env
    }
  });
}

afterEach(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.clear();
});

describe('run-autopilot CLI', () => {
  it('allows --minChannels 0 and exits successfully when no channels are ready', () => {
    const { dir, packPath } = createPack();

    const result = runAutopilot([
      '--packPath',
      packPath,
      '--outDir',
      dir,
      '--channels',
      'linkedin',
      '--minChannels',
      '0'
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Ready channels: -');
    expect(result.stdout).toContain('Autopilot completed with no ready channels.');
    const reportName = fs.readdirSync(dir).find((entry) => entry.startsWith('autopilot-report-test-campaign-'));
    expect(reportName).toBeTruthy();

    const report = JSON.parse(fs.readFileSync(path.join(dir, reportName as string), 'utf8'));
    expect(report.readyChannels).toEqual([]);
    expect(report.steps.goLive).toBe('skipped');
    expect(report.steps.dryPublish).toBe('skipped');
    expect(report.steps.livePublish).toBe('skipped');
  });

  it('still blocks when ready channels are below the default minimum', () => {
    const { dir, packPath } = createPack();

    const result = runAutopilot([
      '--packPath',
      packPath,
      '--outDir',
      dir,
      '--channels',
      'linkedin'
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Autopilot blocked: ready channels 0 is below minChannels 1.');
  });
});
