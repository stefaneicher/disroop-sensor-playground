// Erzeugt console/kinder/games.json aus allen games/kids-*/game.json.
// Aufruf: node scripts/kids-catalog.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const order = ['Sport', 'Rennen', 'Fliegen', 'Abenteuer', 'Action', 'Knobeln', 'Lernen'];

export function buildCatalog(dir = root) {
  const gamesDir = path.join(dir, 'games');
  const games = readdirSync(gamesDir)
    .filter(name => name.startsWith('kids-') && existsSync(path.join(gamesDir, name, 'game.json')))
    .map(name => {
      const meta = JSON.parse(readFileSync(path.join(gamesDir, name, 'game.json'), 'utf8'));
      return { ...meta, path: `../../games/${name}/${meta.entry || 'index.html'}` };
    })
    .sort((a, b) => (order.indexOf(a.category) - order.indexOf(b.category)) || a.name.localeCompare(b.name, 'de'));
  return { version: 1, games };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.join(root, 'console', 'kinder', 'games.json');
  const catalog = buildCatalog();
  writeFileSync(out, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`${catalog.games.length} Spiele → ${path.relative(root, out)}`);
}
