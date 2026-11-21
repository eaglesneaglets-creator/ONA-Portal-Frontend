// Railway settings for the website, applied with the Railway CLI (v5+):
//
//   railway config plan  --environment Staging      # preview
//   railway config apply --environment Staging      # then Production
//
// Railway does not read this file during deploys: `apply` writes these
// values onto the service, and deploys use what is stored there. It replaces
// railway.json, which Railway stops reading on 2026-12-01.
//
// This repo owns only the website service (the `partial` below). The backend
// repo owns ONA-Records-Backend and the worker; Postgres, Redis, the volumes
// and the bucket are owned by no file, so nothing here can delete them.
// No variables: they stay managed in Railway.

import { defineRailway, github, project, service } from "railway/iac";

export const partial = "ona-frontend";

// The branch each environment deploys. `source` must be declared: leaving it
// out does not mean "unchanged", the plan disconnects the GitHub repo.
const BRANCH: Record<string, string> = { Staging: "develop", Production: "main" };

export default defineRailway((ctx) => {
  const branch = BRANCH[ctx.environment];
  if (!branch) throw new Error(`No branch set for environment "${ctx.environment}" in .railway/railway.ts`);

  const website = service("ONA-Portal-Frontend", {
    source: github("eaglesneaglets-creator/ONA-Portal-Frontend", { branch, checkSuites: true }),
    // Railpack resolves package.json engines ("24.x") to the newest Node 24.
    // Nixpacks, the previous builder, pinned 24.10.0 and is unmaintained.
    //
    // NODE_OPTIONS: Turbopack (the Next 16 default) was killed on Railway's
    // builder after ~2s with exit 1 and no output: a dead process, not a
    // compile failure. Node's default heap is a fraction of the container's
    // memory, so it can be OOM-killed while the container still has room.
    // Not --webpack instead: tsconfig maps @/* with no baseUrl, which
    // Turbopack resolves and webpack does not.
    build: { builder: "RAILPACK", buildCommand: "NODE_OPTIONS=--max-old-space-size=3072 npm run build" },
    start: "npm run start",
    // Served by app/api/health/route.ts. A Next server boots in seconds; 60s
    // is generous.
    healthcheck: "/api/health",
    healthcheckTimeout: 60,
    // Restart on failure is Railway's default (stored as unset); cap the retries.
    deploy: { restartPolicyMaxRetries: 3 },
  });

  return project("ONA-Records", {
    variables: { managed: false },
    resources: [website],
  });
});
