import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = JSON.parse(await readFile(new URL('./document-search-index.json', import.meta.url), 'utf8'));
assert.equal(index.version, 1);
assert.equal(index.documentCount, index.documents.length);
assert.equal(index.failedCount, index.failures.length);
assert.ok(index.documentCount <= index.targetCount);
if (process.argv.includes('--require-documents')) assert.ok(index.documentCount > 0, 'at least one public document is indexed');

for (const [id, document] of index.documents.entries()) {
  assert.ok(document.title && document.text, `document ${id} has a title and extracted text`);
  assert.match(document.sourceUrl, /^https:\/\/www\.alpha-labs\.com\//);
  assert.match(document.sha256, /^[a-f0-9]{64}$/);
  assert.ok(['embedded-text', 'ocr', 'mixed', 'spreadsheet-cells'].includes(document.method));
  assert.ok(document.sourcePages.length > 0);
  assert.ok(document.kind === 'image' || document.href === document.sourceUrl);
  for (const word of new Set(document.title.toLowerCase().match(/[a-z0-9]+/g) || [])) {
    assert.ok(index.terms[word]?.some(([resultId]) => resultId === id), `document ${id} title word ${word} is indexed`);
  }
}
for (const postings of Object.values(index.terms)) {
  for (const [id, count] of postings) {
    assert.ok(Number.isInteger(id) && id >= 0 && id < index.documentCount);
    assert.ok(Number.isInteger(count) && count > 0);
  }
}
console.log(`PASS: ${index.documentCount}/${index.targetCount} public documents indexed; ${index.failedCount} failures`);
