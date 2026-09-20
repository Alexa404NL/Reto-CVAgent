import "dotenv/config";
import fs from "node:fs";
import pg from "pg";
import { embed } from "../../src/core/embeddings.js";
import { sslConfig } from "../../src/core/db.js";

const CV_PATH = new URL("../../cv.md", import.meta.url);

function parseChunks(markdown) {
  const lines = markdown.split("\n");
  const chunks = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^#{2,3}\s+(.*)/);
    if (heading) {
      if (current) chunks.push(current);
      current = { title: heading[1].trim(), meta: {}, body: [] };
      continue;
    }
    if (current && line.startsWith("**Type:**")) {
      for (const pair of line.match(/\*\*([^:]+):\*\*\s*([^·]+)/g) ?? []) {
        const [, key, val] = pair.match(/\*\*([^:]+):\*\*\s*(.*)/);
        current.meta[key.trim().toLowerCase()] = val.trim();
      }
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) chunks.push(current);

  return chunks
    .map((c) => ({
      title: c.title,
      type: c.meta.type ?? null,
      organization: c.meta.organization ?? c.meta.organización ?? null,
      period: c.meta.period ?? c.meta.periodo ?? null,
      content: `${c.title}\n${c.body.join("\n")}`.trim(),
    }))
    .filter((c) => c.type && c.content.length > 0);
}

async function main() {
  const markdown = fs.readFileSync(CV_PATH, "utf8");
  const chunks = parseChunks(markdown);
  console.log(`Parsed ${chunks.length} chunks from cv.md`);

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL_WRITE,
    ssl: sslConfig(),
  });
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS cv_chunks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL UNIQUE,
      type TEXT,
      organization TEXT,
      period TEXT,
      content TEXT NOT NULL,
      embedding vector(${Number(process.env.EMBEDDING_DIM ?? 768)})
    )
  `);

  for (const chunk of chunks) {
    const vector = await embed(chunk.content);
    await client.query(
      `INSERT INTO cv_chunks (title, type, organization, period, content, embedding)
       VALUES ($1, $2, $3, $4, $5, $6::vector)
       ON CONFLICT (title) DO UPDATE SET
         type = EXCLUDED.type, organization = EXCLUDED.organization,
         period = EXCLUDED.period, content = EXCLUDED.content, embedding = EXCLUDED.embedding`,
      [chunk.title, chunk.type, chunk.organization, chunk.period, chunk.content, `[${vector.join(",")}]`]
    );
    console.log(`Upserted: ${chunk.title}`);
  }

  await client.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
