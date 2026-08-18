import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function parseFixture(provider: string): Record<string, unknown> {
    const runner = fileURLToPath(new URL("./gjs/parse-provider.js", import.meta.url));
    const fixture = fileURLToPath(new URL(`./fixtures/${provider}.json`, import.meta.url));
    const result = spawnSync("gjs", [ "-m", runner, provider, fixture ], {
        encoding: "utf8",
        env: { ...process.env, TZ: "UTC" }
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const lines = result.stdout.trim().split("\n");
    return JSON.parse(lines.at(-1)!);
}
