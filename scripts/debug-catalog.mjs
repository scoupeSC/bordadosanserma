import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = readFileSync(resolve(root, ".ENV"), "utf8");
const dbUrl = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const products = await client.query(
  `select id, name from products where is_active = true limit 3`
);
console.log("active products:", products.rows);

const links = await client.query(
  `select count(*)::int as n from product_attribute_options`
);
console.log("product_attribute_options count:", links.rows[0].n);

if (products.rows[0]) {
  const pid = products.rows[0].id;
  const detail = await client.query(
    `
    select p.name, g.name as group_name, ao.label
    from product_attribute_options pao
    join attribute_options ao on ao.id = pao.option_id
    join attribute_groups g on g.id = ao.group_id
    join products p on p.id = pao.product_id
    where pao.product_id = $1
    order by g.display_order, ao.display_order
  `,
    [pid]
  );
  console.log("first product tags:", detail.rows);
}

const allGroups = await client.query(`
  select g.name, count(ao.id)::int as options
  from attribute_groups g
  left join attribute_options ao on ao.group_id = g.id
  group by g.id, g.name
  order by g.display_order
`);
console.log("groups in system:", allGroups.rows);

await client.end();
