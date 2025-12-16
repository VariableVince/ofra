import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

function run(
  exe: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: opts.shell ?? false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`${exe} ${args.join(" ")} failed (code ${code})\n${stderr}`));
    });
  });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export type CheckoutOptions = {
  repoUrl: string;
  commit: string;
  cacheDir: string;
  log?: (msg: string) => void;
};

export async function checkoutOpenFrontCommit(opts: CheckoutOptions): Promise<{ gameRoot: string }> {
  const log = opts.log ?? (() => {});
  const cacheDir = path.resolve(opts.cacheDir);
  const repoDir = path.join(cacheDir, "repo");
  const worktreesDir = path.join(cacheDir, "worktrees");
  const gameRoot = path.join(worktreesDir, opts.commit);

  await fs.mkdir(cacheDir, { recursive: true });
  await fs.mkdir(worktreesDir, { recursive: true });

  if (!(await pathExists(path.join(repoDir, ".git")))) {
    log(`cloning OpenFront repo: ${opts.repoUrl}`);
    await run("git", ["clone", "--filter=blob:none", "--no-checkout", opts.repoUrl, repoDir]);
  }

  log(`fetching commit: ${opts.commit}`);
  await run("git", ["-C", repoDir, "fetch", "--depth", "1", "origin", opts.commit]);

  if (!(await pathExists(gameRoot))) {
    log(`creating worktree: ${gameRoot}`);
    await run("git", ["-C", repoDir, "worktree", "add", "--force", gameRoot, opts.commit]);
  }

  return { gameRoot };
}

export async function ensureGameDepsInstalled(opts: {
  gameRoot: string;
  log?: (msg: string) => void;
}): Promise<void> {
  const log = opts.log ?? (() => {});
  const nodeModules = path.join(opts.gameRoot, "node_modules");
  if (await pathExists(nodeModules)) return;

  log(`installing deps in ${opts.gameRoot}`);

  // When invoked via `npm run`, this points at npm-cli.js. Running it via `node` avoids Windows .cmd issues.
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    await run(process.execPath, [npmExecPath, "ci"], { cwd: opts.gameRoot });
    return;
  }

  await run("npm", ["ci"], { cwd: opts.gameRoot, shell: process.platform === "win32" });
}
