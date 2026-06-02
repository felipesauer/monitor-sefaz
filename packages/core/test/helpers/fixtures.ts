import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, '..', 'fixtures');

/** Lê o conteúdo de uma fixture pelo nome de arquivo. */
export function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}
