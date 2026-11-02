import { spawnSync } from "node:child_process";

function run(script: "build" | "db:migrate") {
  const result = spawnSync("npm", ["run", script], {
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  console.log("Production deployment: applying database migrations before build.");
  run("db:migrate");
} else {
  console.log(`Skipping database migrations for ${process.env.VERCEL_ENV ?? "local"} build.`);
}

run("build");
