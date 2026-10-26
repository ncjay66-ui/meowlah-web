#!/usr/bin/env node
/**
 * sync-scores.mjs
 * ---------------
 * 把 API 上的最新评分同步进 src/data/product-library.json。
 *
 * 为什么需要这个脚本：
 *   产品详情页从 API 实时取评分，但列表页和产品卡片读的是这个静态 JSON。
 *   静态 JSON 原本没有 score_status / score_version 字段，导致前端的
 *   hasPublishedScore() 对所有条目返回 false —— 卡片上永远不显示评分。
 *
 * ⚠️ 只同步评分相关的 4 个字段：
 *      final_score / grade / score_status / score_version
 *
 *    绝不碰 image_url（静态库用的是本地 /products/media/*.webp 路径，
 *    和 API 返回的外链不一样）、affiliate_* 、name_* 等可能人工调过的字段。
 *
 * 用法：
 *   node scripts/sync-scores.mjs --dry     # 只看会改什么，不写文件
 *   node scripts/sync-scores.mjs           # 实际写入
 *
 * 什么时候跑：
 *   每次在后端跑完 rescore_all.py 之后。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.MEOWLAH_API || 'https://meowlah-production.up.railway.app';
const DRY = process.argv.includes('--dry');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'src', 'data', 'product-library.json');

/**
 * 只有这些字段会被覆盖。
 * is_prescription 也在内：处方粮标记直接决定前端是否显示评分和「🩺 处方粮」标记，
 * 不同步的话静态目录会一直停留在旧值（踩过这个坑）。
 */
const SCORE_FIELDS = ['final_score', 'grade', 'score_status', 'score_version', 'is_prescription'];

async function fetchAll() {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${API}/products?page=${page}&page_size=100`);
    if (!res.ok) throw new Error(`API ${res.status} on page ${page}`);
    const data = await res.json();
    const items = data.items ?? [];
    out.push(...items);
    process.stdout.write(`\r  fetched ${out.length} / ${data.total ?? '?'}`);
    if (items.length < 100) break;
  }
  process.stdout.write('\n');
  return out;
}

const run = async () => {
  console.log(`── sync-scores ${DRY ? '(dry run)' : ''} ──`);
  console.log(`API: ${API}`);

  console.log('\n[1/3] Fetching products from API…');
  const api = await fetchAll();
  const byId = new Map(api.map((p) => [p.id, p]));

  console.log('\n[2/3] Comparing with product-library.json…');
  const lib = JSON.parse(fs.readFileSync(FILE, 'utf8'));

  let changed = 0;
  let unchanged = 0;
  let missing = 0;
  const becamePublished = [];
  const lostPublished = [];

  for (const entry of lib) {
    const live = byId.get(entry.id);
    if (!live) {
      missing++;
      continue;
    }
    const before = entry.score_status ?? null;
    let dirty = false;
    for (const f of SCORE_FIELDS) {
      const next = live[f] ?? null;
      if ((entry[f] ?? null) !== next) {
        entry[f] = next;
        dirty = true;
      }
    }
    if (dirty) {
      changed++;
      const after = entry.score_status ?? null;
      if (after === 'current' && before !== 'current') {
        becamePublished.push(`[${entry.grade}] ${entry.final_score} — ${entry.name_en}`);
      } else if (before === 'current' && after !== 'current') {
        lostPublished.push(entry.name_en);
      }
    } else {
      unchanged++;
    }
  }

  console.log(`  updated        : ${changed}`);
  console.log(`  unchanged      : ${unchanged}`);
  console.log(`  not in API     : ${missing}`);
  console.log(`  newly published: ${becamePublished.length}`);
  if (lostPublished.length) {
    console.log(`  ⚠️  lost published score: ${lostPublished.length}`);
    lostPublished.slice(0, 10).forEach((n) => console.log(`      - ${n}`));
  }

  if (becamePublished.length) {
    console.log('\n  Newly visible scores (first 15):');
    becamePublished.slice(0, 15).forEach((l) => console.log(`      ${l}`));
  }

  const published = lib.filter((p) => p.score_status === 'current').length;
  console.log(`\n  product-library now has ${published} / ${lib.length} publishable scores`);

  console.log('\n[3/3] Writing…');
  if (DRY) {
    console.log('  dry run — nothing written.');
  } else {
    fs.writeFileSync(FILE, JSON.stringify(lib, null, 2) + '\n', 'utf8');
    console.log(`  ✅ wrote ${FILE}`);
  }
};

run().catch((e) => {
  console.error('\n❌ failed:', e.message);
  process.exit(1);
});
