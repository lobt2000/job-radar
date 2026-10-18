import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client";
import { profile } from "./schema";
import { count } from "drizzle-orm";
import path from "node:path";

const migrationsFolder = path.join(process.cwd(), "src", "db", "migrations");

migrate(db, { migrationsFolder });

const [{ value }] = db.select({ value: count() }).from(profile).all();
if (value === 0) {
  db.insert(profile)
    .values({
      roles: "[]",
      keywords: "[]",
      excludeKeywords: "[]",
    })
    .run();
  console.log("Seeded empty profile row.");
}

console.log("Migrations complete.");
sqlite.close();
