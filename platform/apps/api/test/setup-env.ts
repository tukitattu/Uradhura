import * as fs from 'fs';
import * as path from 'path';

process.env.NODE_ENV = 'test';

function loadDotEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

function toTestUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = '/gaming_platform_test';
  url.search = '';
  url.hash = '';
  return url.toString();
}

const env = loadDotEnvFile(path.resolve(__dirname, '..', '.env'));

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || toTestUrl(process.env.DATABASE_URL || env.DATABASE_URL || '');
if (!process.env.TEST_DATABASE_URL) process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;

process.env.JWT_SECRET = process.env.JWT_SECRET || env.JWT_SECRET || 'level-up-studio-test-jwt';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET || 'level-up-studio-test-refresh';
process.env.REDIS_HOST = process.env.REDIS_HOST || env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || env.REDIS_PORT || '6379';