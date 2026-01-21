import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'replpress.config.json');

export function getConfig() {
  const fileBuffer = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(fileBuffer);
}

export function updateConfig(newConfig: any) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
}
