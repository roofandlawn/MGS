#!/usr/bin/env node
/**
 * Read-only Supabase staging check for MGS cloud snapshot RPC.
 * Password sign-in and read-only RPC requests only. No service-role key.
 * Prints counts, never access tokens, passwords, or medical-gas field records.
 * Requires explicit MGS_STAGING_READ_ONLY_TEST=YES.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const roles = ['OWNER', 'EDITOR', 'VIEWER', 'OUTSIDER'];
const names = ['MGS_STAGING_SUPABASE_URL', 'MGS_STAGING_ANON_KEY',
  'MGS_STAGING_PROJECT_ID', ...roles.flatMap(r => ['MGS_' + r + '_EMAIL', 'MGS_' + r + '_PASSWORD'])];
const missing = names.filter(k => !process.env[k]);
if (process.env.MGS_STAGING_READ_ONLY_TEST !== 'YES' || missing.length) {
  console.error('Staging verification not configured. Set MGS_STAGING_READ_ONLY_TEST=YES.');
  if (missing.length) console.error('Missing variable names: ' + missing.join(', '));
  process.exit(2);
}

const base = new URL(process.env.MGS_STAGING_SUPABASE_URL);
assert.equal(base.protocol, 'https:', 'Staging URL must use HTTPS');
assert.equal(base.pathname, '/', 'Staging URL must be a project origin');
assert.equal(base.search, '', 'Staging URL may not contain a query');
assert.equal(base.username, '', 'Staging URL must not embed credentials');
assert.equal(base.password, '', 'Staging URL must not embed credentials');
const key = process.env.MGS_STAGING_ANON_KEY;
assert.ok(!key.startsWith('sb_secret_') && !key.includes('service_role'),
  'Never use a secret or service-role key in this client test');
const projectId = process.env.MGS_STAGING_PROJECT_ID.toLowerCase();
assert.match(projectId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

async function post(route, body, bearer = key) {
  const response = await fetch(new URL(route, base), {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      'content-type': 'application/json',
      apikey: key,
      authorization: 'Bearer ' + bearer
    },
    body: JSON.stringify(body)
  });
  let data;
  try { data = await response.json(); } catch { data = null; }
  return { status: response.status, body: data };
}

async function signIn(role) {
  const prefix = 'MGS_' + role.toUpperCase();
  const response = await post('/auth/v1/token?grant_type=password', {
    email: process.env[prefix + '_EMAIL'],
    password: process.env[prefix + '_PASSWORD']
  });
  assert.equal(response.status, 200, role + ': login failed HTTP ' + response.status);
  assert.ok(typeof response.body?.access_token === 'string', role + ': no access token');
  return response.body.access_token;
}

const families = ['projectMembers', 'projectSystems', 'fieldRecords', 'recordSystems',
  'closeoutItems', 'checklistItems', 'attachments'];

function requireDenied(response, label) {
  assert.ok(response.status >= 400, label + ': unexpected HTTP ' + response.status);
  assert.equal(response.body?.snapshot, undefined, label + ': project snapshot leaked');
}

function requireEnvelope(response, role) {
  assert.equal(response.status, 200, role + ': read failed HTTP ' + response.status);
  const envelope = response.body;
  assert.equal(envelope?.contractVersion, 1, role + ': unexpected contract version');
  assert.equal(envelope?.projectId?.toLowerCase(), projectId, role + ': wrong project ID');
  assert.ok(Number.isSafeInteger(envelope.revision) && envelope.revision > 0,
    role + ': revision must be a positive safe integer');
  const snapshot = envelope.snapshot;
  assert.equal(snapshot?.project?.id?.toLowerCase(), projectId, role + ': wrong project row');
  assert.equal(snapshot.project.deleted_at, null, role + ': deleted project visible');
  for (const family of families) {
    assert.ok(Array.isArray(snapshot[family]), role + ': missing ' + family);
    for (const row of snapshot[family]) {
      if (family !== 'recordSystems') {
        assert.equal(row.project_id?.toLowerCase(), projectId,
          role + ': cross-project row in ' + family);
      }
    }
  }
  const ids = new Set(snapshot.fieldRecords.map(r => r.id));
  for (const row of snapshot.recordSystems) {
    assert.ok(ids.has(row.record_id), role + ': orphaned record-system link');
  }
  assert.ok(!/"dataUrl"\s*:|data:image\/|data:application\//i.test(JSON.stringify(snapshot)),
    role + ': inline file data found in PostgreSQL snapshot');
  return {
    role, revision: envelope.revision,
    fieldRecords: snapshot.fieldRecords.length,
    attachments: snapshot.attachments.length,
    tombstones: families.flatMap(family => snapshot[family]).filter(r => r.deleted_at).length
  };
}

const read = (id, bearer) => post('/rest/v1/rpc/mgs_read_project_snapshot',
  { p_project_id: id }, bearer);

try {
  requireDenied(await read(projectId, key), 'anonymous');
  const results = [];
  let ownerToken;
  for (const role of ['owner', 'editor', 'viewer']) {
    const token = await signIn(role);
    if (role === 'owner') ownerToken = token;
    results.push(requireEnvelope(await read(projectId, token), role));
  }
  const outsiderToken = await signIn('outsider');
  requireDenied(await read(projectId, outsiderToken), 'nonmember');
  requireDenied(await read(randomUUID(), ownerToken), 'unknown project');
  for (const result of results.slice(1)) {
    assert.equal(result.revision, results[0].revision,
      'Role-based snapshot revisions differ without intervening writes');
  }
  console.log('PASS: MGS read-only Supabase snapshot staging gate');
  console.log(JSON.stringify({
    authorized: results, denied: ['anonymous', 'nonmember', 'unknown project']
  }, null, 2));
  console.log('NOT VERIFIED: revocation, concurrent writes, revision increments, atomic writer.');
} catch (error) {
  console.error('FAIL: ' + error.message);
  process.exitCode = 1;
}
