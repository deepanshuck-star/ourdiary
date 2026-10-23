import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (...p) => fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');
const migration = () => read('supabase', 'migrations', '20261014000019_game_sessions.sql');

test('Migration 19: a game session carries a version and a turn holder', () => {
  const sql = migration();
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.game_sessions'));
  // The two things a feature_state blob cannot express.
  assert.ok(sql.includes('version INTEGER NOT NULL DEFAULT 1'));
  assert.ok(sql.includes('turn_user_id UUID REFERENCES public.profiles(id)'));
  assert.ok(sql.includes('game_sessions_couple_game_uidx'));
});

test('Migration 19: a move against a stale version is refused, not applied', () => {
  const sql = migration();
  // This is the whole fix: the later write no longer simply wins.
  assert.ok(sql.includes('IF current.version <> p_expected_version THEN'));
  assert.ok(/RAISE EXCEPTION 'This game moved on while you were deciding/.test(sql));
  assert.ok(sql.includes('version = version + 1'));
});

test('Migration 19: moving out of turn is refused server-side', () => {
  const sql = migration();
  assert.ok(sql.includes('IF current.turn_user_id IS NOT NULL AND current.turn_user_id <> uid THEN'));
  assert.ok(/RAISE EXCEPTION 'It is not your turn'/.test(sql));
});

test('Migration 19: the table takes no direct writes', () => {
  const sql = migration();
  // SELECT is the only policy, so every write must go through the RPCs that
  // perform the version and turn checks. A policy for INSERT or UPDATE would
  // let a client skip both.
  assert.ok(sql.includes('"Game sessions select policy"'));
  assert.equal(/CREATE POLICY[^;]*game_sessions[\s\S]*?FOR INSERT/.test(sql), false);
  assert.equal(/CREATE POLICY[^;]*game_sessions[\s\S]*?FOR UPDATE/.test(sql), false);
  assert.ok(sql.includes('SECURITY DEFINER'));
});

test('Migration 19: RLS scopes a session to its couple', () => {
  const sql = migration();
  assert.ok(sql.includes('ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('public.is_couple_member(couple_id)'));
  // Every RPC resolves the caller's own couple rather than trusting an argument.
  const lookups = sql.split('FROM public.couple_members cm').length - 1;
  assert.ok(lookups >= 3, 'each RPC should resolve the caller’s couple itself');
});

test('Migration 19: the RPCs are not executable anonymously', () => {
  const sql = migration();
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.apply_game_move'));
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.apply_game_move'));
  assert.ok(sql.includes('TO authenticated'));
});

test('Migration 19: moves are pushed to the other device', () => {
  const sql = migration();
  assert.ok(sql.includes('supabase_realtime'));
  // Re-runnable: a bare ALTER PUBLICATION ... ADD TABLE errors the second time.
  assert.ok(sql.includes('pg_publication_tables'));
});

test('the client distinguishes a conflict from an ordinary failure', () => {
  const src = read('src', 'lib', 'supabase', 'gameSessions.ts');
  assert.ok(src.includes('export class GameConflictError'));
  assert.ok(src.includes('export class NotYourTurnError'));
  // Typed errors, so the hook can reload the board for a conflict instead of
  // showing the raw Postgres message.
  assert.ok(src.includes('function translate'));
});

test('a refused move reloads the board instead of retrying over it', () => {
  const src = read('src', 'hooks', 'useGameSession.ts');
  assert.ok(src.includes('instanceof GameConflictError'));
  assert.ok(src.includes('await reload()'));
  // Never re-send the same state with a bumped version — that is exactly the
  // overwrite the migration exists to prevent.
  assert.equal(src.includes('versionRef.current + 1'), false);
});

test('the game hook sends the version it actually acted on', () => {
  const src = read('src', 'hooks', 'useGameSession.ts');
  // Read from a ref, not from render state, so a realtime update landing
  // between render and click can't make the move claim a stale version.
  assert.ok(src.includes('versionRef.current'));
});

test('the game hook cleans up its realtime channel', () => {
  const src = read('src', 'hooks', 'useGameSession.ts');
  assert.ok(src.includes('removeChannel'));
});

test('the arcade lists every registered game and can open each one', () => {
  const page = read('src', 'app', 'games', 'page.tsx');
  const registry = read('src', 'lib', 'features', 'games', 'registry.ts');
  // A game in the registry with no component would render a blank screen
  // behind a tile that says "Play".
  const ids = [...registry.matchAll(/^\s{4}id: '([a-z0-9]+)',$/gm)].map((m) => m[1]);
  assert.ok(ids.length >= 20, `expected the full catalogue, found ${ids.length}`);
  for (const id of ids) {
    assert.ok(new RegExp(`^\\s+${id}: `, 'm').test(page), `no component wired up for "${id}"`);
  }
});

test('every game tile carries its rules and a player count', () => {
  const registry = read('src', 'lib', 'features', 'games', 'registry.ts');
  const blocks = registry.split(/^\s{2}\{$/m).slice(1);
  assert.ok(blocks.length >= 20);
  for (const block of blocks) {
    if (!block.includes('id:')) continue;
    assert.ok(block.includes('rules: ['), 'a game is missing its rules');
    assert.ok(block.includes('players:'), 'a game is missing its player count');
    assert.ok(block.includes('tagline:'), 'a game is missing its tagline');
  }
});

test('the arcade has a way back to the tiles', () => {
  const page = read('src', 'app', 'games', 'page.tsx');
  assert.ok(page.includes('All games'));
  assert.ok(page.includes('setOpenId(null)'));
});

test('games that need data say so rather than opening empty', () => {
  const registry = read('src', 'lib', 'features', 'games', 'registry.ts');
  assert.ok(registry.includes('export function unmetRequirement'));
  const page = read('src', 'app', 'games', 'page.tsx');
  assert.ok(page.includes('unmetRequirement'));
  // A blocked tile must not be clickable into a dead end.
  assert.ok(page.includes('disabled={Boolean(blocked)}'));
});
