import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(path.join(root, 'mirror-manifest.json'), 'utf8'));
const entities = {
  amp: '&', apos: "'", bull: ' ', copy: '©', deg: '°', hellip: '…',
  laquo: '«', lsquo: '‘', ldquo: '“', mdash: ' ', nbsp: ' ', ndash: ' ',
  quot: '"', raquo: '»', reg: '®', rsquo: '’', rdquo: '”', times: '×',
  trade: '™', lt: '<', gt: '>', aacute: 'á', eacute: 'é',
};

function decode(text) {
  return text.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (_, entity) => {
    if (entity.startsWith('#')) {
      const value = entity[1]?.toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isInteger(value) && value > 0 && value <= 0x10ffff
        ? String.fromCodePoint(value) : ' ';
    }
    return entities[entity.toLowerCase()] ?? ' ';
  });
}

function visibleText(html) {
  return decode(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

const tokenize = (value) => value.normalize('NFKD').toLowerCase()
  .replace(/\p{M}/gu, '')
  .match(/[\p{L}\p{N}]+/gu) || [];

const pages = [];
const postings = new Map();
for (const [id, item] of manifest.entries()) {
  const html = await readFile(path.join(root, item.Output.replaceAll('\\', path.sep)), 'utf8');
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) throw new Error(`No main content for ${item.Route}`);
  const heading = main.match(/<h1\b[^>]*class="[^"]*\bentry-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = visibleText(heading || html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || item.Route);
  let text = visibleText(main);
  if (item.Route === '/') {
    const hero = await readFile(path.join(root, 'script.js'), 'utf8');
    const heroCopy = hero.match(/hero\.innerHTML = `([\s\S]*?)`;/)?.[1] || '';
    const railCopy = hero.match(/actionRail\.innerHTML = `([\s\S]*?)`;/)?.[1] || '';
    text = `${visibleText(heroCopy)} ${visibleText(railCopy)} ${text}`.trim();
  }
  const href = item.Route === '/' ? '' : `${item.Route.slice(1)}${item.Route.endsWith('.html') ? '' : '/'}`;
  const page = { title, href, text };
  pages.push(page);
  const frequencies = new Map();
  for (const word of tokenize(`${title} ${text}`)) {
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }
  for (const [word, count] of frequencies) {
    if (!postings.has(word)) postings.set(word, []);
    postings.get(word).push([id, count]);
  }
}

const terms = Object.fromEntries([...postings].sort(([a], [b]) => a.localeCompare(b)));
const index = { version: 1, pageCount: pages.length, pages, terms };
await writeFile(path.join(root, 'search-index.json'), `${JSON.stringify(index)}\n`, 'utf8');
console.log(`Indexed ${pages.length} pages and ${postings.size} distinct words.`);
