// Two-user RLS check for a user-owned table. Everything runs inside one transaction that is
// always rolled back, so nothing is kept in the live database.
//
// Usage: node rls-check.js <table> '<sample row JSON>' ['<server-set fields JSON>']
//   sample row:        a valid row of the user-insertable fields, e.g. {"name":"x","kind":"sop"}
//   server-set fields: values users must not be able to set, e.g. {"status":"approved"}
// Needs DB_URL (the non-pooling Postgres URL) and the `pg` package (via NODE_PATH).
const { Client } = require('pg');

const IDENT = /^[a-z_][a-z0-9_]*$/;
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

const [table, sampleJson, serverSetJson = '{}'] = process.argv.slice(2);
if (!table || !sampleJson || !process.env.DB_URL) {
  console.error("Usage: node rls-check.js <table> '<sample row JSON>' ['<server-set fields JSON>'] (with DB_URL set)");
  process.exit(2);
}
const sample = JSON.parse(sampleJson);
const serverSet = JSON.parse(serverSetJson);
for (const id of [table, ...Object.keys(sample), ...Object.keys(serverSet)]) {
  if (!IDENT.test(id)) { console.error(`Not a plain identifier: ${id}`); process.exit(2); }
}

const insertSql = (row) => {
  const cols = Object.keys(row);
  return {
    text: `insert into public.${table} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
    values: Object.values(row),
  };
};

async function main() {
  const url = new URL(process.env.DB_URL);
  url.searchParams.delete('sslmode'); // otherwise it overrides the ssl option below
  const c = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await c.connect();

  const results = [];
  const check = (pass, label, detail) => results.push(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? `: ${detail}` : ''}`);
  const as = async (role, sub) => {
    await c.query('reset role');
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(sub ? { sub, role } : { role })]);
    await c.query(`set local role ${role}`);
  };
  const expectRefused = async (label, query) => {
    await c.query('savepoint s');
    try {
      const r = await c.query(query);
      // An update/delete that matched no rows is not a refusal, but RLS hid them: report it.
      check(false, label, `succeeded (${r.rowCount} rows)`);
    } catch (e) {
      check(true, label, `refused (${e.message})`);
    }
    await c.query('rollback to savepoint s');
  };

  try {
    await c.query('begin');
    await c.query(
      `insert into auth.users (id, email, aud, role) values ($1, 'a@rls.test', 'authenticated', 'authenticated'), ($2, 'b@rls.test', 'authenticated', 'authenticated')`,
      [A, B]
    );

    const ids = {};
    for (const [who, sub] of [['A', A], ['B', B]]) {
      await as('authenticated', sub);
      const r = await c.query(insertSql(sample));
      ids[who] = r.rows[0].id;
      const defaultsOk = r.rows[0].user_id === sub;
      check(defaultsOk, `${who} inserts; user_id filled in`, JSON.stringify({ user_id: r.rows[0].user_id, ...Object.fromEntries(Object.keys(serverSet).map((k) => [k, r.rows[0][k]])) }));
    }

    for (const [who, sub] of [['A', A], ['B', B]]) {
      await as('authenticated', sub);
      const r = await c.query(`select id from public.${table}`);
      check(r.rows.length === 1 && r.rows[0].id === ids[who], `${who} sees only own row`, JSON.stringify(r.rows.map((x) => x.id)));
    }

    await as('authenticated', A);
    await expectRefused('A sets user_id to B', insertSql({ ...sample, user_id: B }));
    for (const [col, value] of Object.entries(serverSet)) {
      await expectRefused(`A sets ${col}`, insertSql({ ...sample, [col]: value }));
    }
    await expectRefused('A updates', { text: `update public.${table} set ${Object.keys(sample)[0]} = ${Object.keys(sample)[0]}` });
    await expectRefused('A deletes', { text: `delete from public.${table}` });

    await as('anon', null);
    await expectRefused('anon selects', { text: `select * from public.${table}` });
    await expectRefused('anon inserts', insertSql(sample));
  } finally {
    await c.query('rollback');
    await c.end();
  }

  console.log(results.join('\n'));
  process.exit(results.some((l) => l.startsWith('FAIL')) ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
