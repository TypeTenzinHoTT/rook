import fs from 'fs';
import os from 'os';
import path from 'path';
import { Config } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.rook');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function getConfig(): Config | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.token || !parsed.username || !parsed.userId) return null;
    return parsed as Config;
  } catch (err) {
    return null;
  }
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  const data = JSON.stringify(config, null, 2);
  fs.writeFileSync(CONFIG_PATH, data, { mode: 0o600 });
}

export function clearConfig(): void {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
  } catch (err) {
    // ignore
  }
}

export function isLoggedIn(): boolean {
  const config = getConfig();
  return Boolean(config && config.token && config.username && config.userId);
}

export { CONFIG_PATH };
