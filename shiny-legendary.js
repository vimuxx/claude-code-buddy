/**
 * claude-code-buddy-shiny-legendary
 *
 * Shiny + Legendary buddy calculator
 *
 *   node shiny-legendary.js
 *
 * Algorithm: Mulberry32 PRNG + FNV-1a hash, matches companion.ts exactly
 */

import fs from 'fs';
import path from 'path';

// ========== Game Data ==========

const SPECIES = ['duck','goose','blob','cat','dragon','octopus','owl','penguin','turtle','snail','ghost','axolotl','capybara','cactus','robot','rabbit','mushroom','chonk'];
const EYES = ['·','✦','×','◉','@','°'];
const HATS = ['none','crown','tophat','propeller','halo','wizard','beanie','tinyduck'];
const RARITIES = ['common','uncommon','rare','epic','legendary'];
const RARITY_WEIGHTS = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
const HEX = '0123456789abcdef';
const SALT_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SALT = 'friend-2026-401';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

// ========== Core ==========

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  if (typeof Bun !== 'undefined') return Number(BigInt(Bun.hash(s)) & 0xffffffffn);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function rollRarity(rng) {
  const total = 100;
  let roll = rng() * total;
  for (const r of RARITIES) { roll -= RARITY_WEIGHTS[r]; if (roll < 0) return r; }
  return 'common';
}

function randomString(length, chars) {
  let result = '';
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// ========== Buddy Logic ==========

// RNG call order must match companion.ts rollFrom():
//   1. rarity  2. species  3. eye  4. hat (if not common)  5. shiny
function getDetails(userId, salt) {
  const rng = mulberry32(hashString(userId + salt));
  const rarity = rollRarity(rng);
  const species = pick(rng, SPECIES);
  const eye = pick(rng, EYES);
  const hat = rarity === 'common' ? 'none' : pick(rng, HATS);
  const shiny = rng() < 0.01;
  return { seed: hashString(userId + salt), rarity, species, eye, hat, shiny };
}

function isShinyLegendary(userId, salt) {
  const d = getDetails(userId, salt);
  return d.rarity === 'legendary' && d.shiny;
}

// ========== Search ==========

function find(label, identifier, gen, count = 5) {
  let found = 0, attempts = 0;
  const results = [];
  while (found < count && attempts < (label === 'SALT(s)' ? 100000 : Infinity)) {
    attempts++;
    const key = gen();
    if (isShinyLegendary(key[0], key[1])) { results.push(key[2]); found++; }
  }
  console.log(`\nFound ${results.length} ${BOLD}${label}${RESET} with ${identifier} in ${attempts.toLocaleString()} attempts:\n`);
  for (const r of results) console.log(`  ${r}`);
  console.log();
}

// ========== Config ==========

function readUserId() {
  const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  const cfg = JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf-8'));
  const userId = cfg.oauthAccount?.accountUuid || cfg.userID;
  if (!userId) throw new Error('No userID');
  return userId;
}

// ========== Main ==========

console.log(`
+=====================================+
| Claude Code Buddy - Shiny Legendary |
+=====================================+
`);

let userId;
try { userId = readUserId(); }
catch { console.log('  warning: could not read ~/.claude.json\n'); }

if (userId) find('SALT(s)  ', userId.slice(0, 15) + ' (~/.claude.json)', () => { const s = randomString(15, SALT_CHARS); return [userId, s, s]; }, 5);
find('userID(s)', SALT + ' (2.1.88 default)', () => { const u = randomString(64, HEX); return [u, SALT, u]; }, 5);
