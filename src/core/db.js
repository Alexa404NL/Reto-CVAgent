import fs from "node:fs";
export function sslConfig() {
  const ca = process.env.DB_CA_CERT
    ? Buffer.from(process.env.DB_CA_CERT, "base64").toString("utf8")
    : fs.readFileSync(new URL("../../ca.pem", import.meta.url), "utf8");
  return { ca, rejectUnauthorized: true };
}
