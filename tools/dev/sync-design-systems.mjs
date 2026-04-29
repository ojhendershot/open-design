#!/usr/bin/env node
// Sync design-systems/* from the upstream `getdesign` npm package.
//
// Usage:
//   1) curl -sL $(npm view getdesign dist.tarball) -o /tmp/getdesign.tgz
//      tar -xzf /tmp/getdesign.tgz -C /tmp
//   2) node tools/dev/sync-design-systems.mjs [/tmp/package/templates]
//
// The script re-creates each brand's design-systems/<slug>/DESIGN.md with a
// `> Category: <name>` line inserted after the H1, mapped from the
// awesome-design-md README. Hand-authored systems (default, warm-editorial)
// are not touched.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SRC = process.argv[2] || '/tmp/package/templates';

const CATEGORY = {
  // AI & LLM
  claude: 'AI & LLM', cohere: 'AI & LLM', elevenlabs: 'AI & LLM',
  minimax: 'AI & LLM', 'mistral.ai': 'AI & LLM', ollama: 'AI & LLM',
  'opencode.ai': 'AI & LLM', replicate: 'AI & LLM', runwayml: 'AI & LLM',
  'together.ai': 'AI & LLM', voltagent: 'AI & LLM', 'x.ai': 'AI & LLM',
  // Developer Tools
  cursor: 'Developer Tools', expo: 'Developer Tools', lovable: 'Developer Tools',
  raycast: 'Developer Tools', superhuman: 'Developer Tools',
  vercel: 'Developer Tools', warp: 'Developer Tools',
  // Backend & Data
  clickhouse: 'Backend & Data', composio: 'Backend & Data',
  hashicorp: 'Backend & Data', mongodb: 'Backend & Data',
  posthog: 'Backend & Data', sanity: 'Backend & Data',
  sentry: 'Backend & Data', supabase: 'Backend & Data',
  // Productivity & SaaS
  cal: 'Productivity & SaaS', intercom: 'Productivity & SaaS',
  'linear.app': 'Productivity & SaaS', mintlify: 'Productivity & SaaS',
  notion: 'Productivity & SaaS', resend: 'Productivity & SaaS',
  zapier: 'Productivity & SaaS',
  // Design & Creative
  airtable: 'Design & Creative', clay: 'Design & Creative',
  figma: 'Design & Creative', framer: 'Design & Creative',
  miro: 'Design & Creative', webflow: 'Design & Creative',
  // Fintech & Crypto
  binance: 'Fintech & Crypto', coinbase: 'Fintech & Crypto',
  kraken: 'Fintech & Crypto', mastercard: 'Fintech & Crypto',
  revolut: 'Fintech & Crypto', stripe: 'Fintech & Crypto', wise: 'Fintech & Crypto',
  // E-Commerce & Retail
  airbnb: 'E-Commerce & Retail', meta: 'E-Commerce & Retail',
  nike: 'E-Commerce & Retail', shopify: 'E-Commerce & Retail',
  starbucks: 'E-Commerce & Retail',
  // Media & Consumer
  apple: 'Media & Consumer', ibm: 'Media & Consumer',
  nvidia: 'Media & Consumer', pinterest: 'Media & Consumer',
  playstation: 'Media & Consumer', spacex: 'Media & Consumer',
  spotify: 'Media & Consumer', theverge: 'Media & Consumer',
  uber: 'Media & Consumer', vodafone: 'Media & Consumer', wired: 'Media & Consumer',
  // Automotive
  bmw: 'Automotive', bugatti: 'Automotive', ferrari: 'Automotive',
  lamborghini: 'Automotive', renault: 'Automotive', tesla: 'Automotive',
};

const slugOf = (b) => b.replace(/\./g, '-');

function main() {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  } catch (err) {
    console.error(`Could not read manifest.json under ${SRC}: ${err.message}`);
    console.error('Did you extract the getdesign tarball? See tools/dev/sync-design-systems.mjs header.');
    process.exit(1);
  }

  const written = [];
  const skipped = [];

  for (const entry of manifest) {
    const { brand, file, description } = entry;
    const cat = CATEGORY[brand];
    if (!cat) { skipped.push(`${brand} (unmapped category)`); continue; }
    const slug = slugOf(brand);
    let raw;
    try {
      raw = readFileSync(path.join(SRC, file), 'utf8');
    } catch (err) {
      skipped.push(`${brand} (${err.message})`);
      continue;
    }
    const lines = raw.split(/\r?\n/);
    const h1 = lines.findIndex((l) => /^#\s+/.test(l));
    if (h1 < 0) { skipped.push(`${brand} (no H1)`); continue; }
    const head = lines.slice(0, h1 + 1);
    const tail = lines.slice(h1 + 1);
    while (tail[0] === '') tail.shift();
    const body = [
      ...head,
      '',
      `> Category: ${cat}`,
      `> ${description}`,
      '',
      ...tail,
    ].join('\n');
    const dir = path.join(ROOT, 'design-systems', slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'DESIGN.md'), body);
    written.push(slug);
  }

  console.log(`wrote ${written.length} design systems → design-systems/`);
  if (skipped.length) {
    console.log('skipped:');
    for (const s of skipped) console.log(`  - ${s}`);
  }
}

main();
