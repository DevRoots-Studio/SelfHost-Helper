import simpleGit from "simple-git";
import path from "path";

const gitInstances = {};

function getGit(projectPath) {
  if (!projectPath) throw new Error("Project path is required");
  if (!gitInstances[projectPath]) {
    gitInstances[projectPath] = simpleGit({ baseDir: projectPath });
  }
  return gitInstances[projectPath];
}

function normalizeWorkingDirFlag(raw) {
  const flag = raw || "?";
  if (flag === "?") return "U"; // Treat simple-git's "?" as Untracked
  return flag;
}

export async function gitStatus(projectPath) {
  const git = getGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) return { isRepo: false, currentBranch: null, files: [], ahead: 0, behind: 0 };
  const status = await git.status();
  return {
    isRepo: true,
    currentBranch: status.current ?? null,
    files: status.files.map((f) => {
      const relPath = f.path;
      const fullPath = path.resolve(projectPath, relPath);
      const workingDir = normalizeWorkingDirFlag(f.working_dir ?? f.workingDir ?? "?");
      return {
        path: relPath,
        fullPath,
        workingDir,
        index: f.index,
        renamed: f.renamed ?? false,
      };
    }),
    ahead: status.ahead ?? 0,
    behind: status.behind ?? 0,
  };
}

export async function gitDiff(projectPath, filePath = null) {
  const git = getGit(projectPath);
  if (filePath) {
    // Show any difference: staged vs HEAD or working tree vs HEAD
    const [cached, working] = await Promise.all([
      git.diff(["--cached", "--", filePath]),
      git.diff(["--", filePath]),
    ]);
    return cached || working;
  }
  return git.diff();
}

export async function gitAdd(projectPath, paths = []) {
  const git = getGit(projectPath);
  if (paths.length) {
    await git.add(paths);
  } else {
    await git.add(".");
  }
  return true;
}

export async function gitUnstage(projectPath, paths = []) {
  const git = getGit(projectPath);
  if (paths.length) {
    await git.reset(["HEAD", "--", ...paths]);
  } else {
    await git.reset(["HEAD"]);
  }
  return true;
}

export async function gitCommit(projectPath, message) {
  const git = getGit(projectPath);
  await git.commit(message);
  return true;
}

export async function gitPush(projectPath) {
  const git = getGit(projectPath);
  await git.push();
  return true;
}

export async function gitPull(projectPath) {
  const git = getGit(projectPath);
  await git.pull();
  return true;
}

export async function gitBranches(projectPath) {
  const git = getGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) return { current: null, all: [] };
  const branch = await git.branch();
  return {
    current: branch.current,
    all: branch.all,
  };
}

export async function gitCheckout(projectPath, branchOrRef) {
  const git = getGit(projectPath);
  await git.checkout(branchOrRef);
  return true;
}

export async function gitClone(repoUrl, targetPath) {
  await simpleGit().clone(repoUrl, targetPath);
  return true;
}

export async function gitRemoteUrl(projectPath) {
  const git = getGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) return null;
  const remotes = await git.getRemotes(true);
  const origin = remotes.find((r) => r.name === "origin");
  if (!origin?.refs?.fetch) return null;
  return origin.refs.fetch;
}
