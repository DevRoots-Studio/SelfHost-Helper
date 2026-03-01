import simpleGit from "simple-git";

const gitInstances = {};

function getGit(projectPath) {
  if (!projectPath) throw new Error("Project path is required");
  if (!gitInstances[projectPath]) {
    gitInstances[projectPath] = simpleGit({ baseDir: projectPath });
  }
  return gitInstances[projectPath];
}

export async function gitStatus(projectPath) {
  const git = getGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) return { isRepo: false, currentBranch: null, files: [], ahead: 0, behind: 0 };
  const status = await git.status();
  return {
    isRepo: true,
    currentBranch: status.current ?? null,
    files: status.files.map((f) => ({
      path: f.path,
      workingDir: f.working_dir ?? f.workingDir ?? "?",
      index: f.index,
      renamed: f.renamed ?? false,
    })),
    ahead: status.ahead ?? 0,
    behind: status.behind ?? 0,
  };
}

export async function gitDiff(projectPath, filePath = null) {
  const git = getGit(projectPath);
  if (filePath) {
    return git.diff(["--", filePath]);
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
  const origin = remotes.origin;
  if (!origin?.refs?.fetch) return null;
  return origin.refs.fetch;
}
