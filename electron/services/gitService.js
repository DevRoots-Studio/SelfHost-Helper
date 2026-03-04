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

function getRemotesList(raw) {
  if (Array.isArray(raw)) return raw;
  return Object.entries(raw || {}).map(([n, refs]) => ({
    name: n,
    refs: refs?.refs ?? refs,
  }));
}

/**
 * List all remotes. Returns [] if not a repo.
 * Each item: { name, fetch, push } (push may equal fetch if not set).
 */
export async function gitRemotes(projectPath) {
  const git = getGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) return [];
  const raw = await git.getRemotes(true);
  const list = getRemotesList(raw);
  return list.map((r) => {
    const refs = r.refs ?? r;
    const fetchUrl = refs.fetch ?? "";
    const pushUrl = refs.push ?? fetchUrl;
    return {
      name: r.name ?? "",
      fetch: typeof fetchUrl === "string" ? fetchUrl : "",
      push: typeof pushUrl === "string" ? pushUrl : fetchUrl,
    };
  });
}

export async function gitRemoveRemote(projectPath, name) {
  if (!name || !name.trim()) throw new Error("Remote name is required");
  const git = getGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new Error("Not a Git repository.");
  await git.removeRemote(name.trim());
  return true;
}

export async function gitInit(projectPath) {
  const git = getGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (isRepo) return { initialized: false, alreadyRepo: true };
  await git.init();
  return { initialized: true, alreadyRepo: false };
}

export async function gitAddRemote(projectPath, name, url) {
  if (!name || !url) throw new Error("Remote name and URL are required");
  const git = getGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error("Cannot add remote: Git repository is not initialized for this project.");
  }
  const raw = await git.getRemotes(true);
  const list = getRemotesList(raw);
  const existing = list.find((r) => (r.name ?? r) === name);
  if (existing) {
    // Update existing remote URL
    await git.remote(["set-url", name, url]);
  } else {
    await git.addRemote(name, url);
  }
  return true;
}
