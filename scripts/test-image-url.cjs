/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/lib/image-url.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleRecord = { exports: {} };
new Function('module', 'exports', compiled)(moduleRecord, moduleRecord.exports);
const { parseApprovedImageUrl } = moduleRecord.exports;

assert.equal(parseApprovedImageUrl('https://down-my.img.susercontent.com/file/cat.webp')?.hostname, 'down-my.img.susercontent.com');
for (const url of [
  'http://down-my.img.susercontent.com/file/cat.webp',
  'https://down-my.img.susercontent.com.evil.test/file/cat.webp',
  'https://user:pass@down-my.img.susercontent.com/file/cat.webp',
  'https://localhost/file/cat.webp',
  'https://127.0.0.1/file/cat.webp',
  'file:///etc/passwd',
  'not a URL',
]) assert.equal(parseApprovedImageUrl(url), null, `must reject ${url}`);

console.log('PASS: image proxy accepts only HTTPS URLs from the approved Shopee image CDN.');
