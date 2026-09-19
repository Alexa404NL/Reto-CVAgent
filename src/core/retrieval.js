import pg from "pg";
import { embed } from "./embeddings.js";
import { sslConfig } from "./db.js";

const TOP_K = 4;

let pool;
function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_READONLY, ssl: sslConfig(), max: 3 });
  }
  return pool;
}

export async function retrieve(query) {
  const threshold = Number(process.env.SIMILARITY_THRESHOLD ?? 0.55);
  let vector;
  try {
    vector = await embed(query);
  } catch (err) {
    console.error("embedding failed:", err.message);
    return { degraded: true, chunks: [] };
  }

  try {
    const { rows } = await getPool().query(
      `SELECT title, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM cv_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [`[${vector.join(",")}]`, TOP_K]
    );
    return { degraded: false, chunks: rows.filter((r) => r.similarity >= threshold) };
  } catch (err) {
    console.error("retrieval query failed:", err.message);
    return { degraded: true, chunks: [] };
  }
}

export function formatContext(chunks) {
  return chunks.map((c) => `[${c.title}]\n${c.content}`).join("\n\n");
}
