import http from "http";
import { URL } from "url";
import { shell } from "electron";
import logger from "./logger.js";
import settingsService from "./settingsService.js";
import * as gitService from "./gitService.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API_BASE = "https://api.github.com";
// Fixed local port for OAuth redirect; must match GitHub OAuth app callback URL
const GITHUB_OAUTH_CALLBACK_PORT = 53195;

function getGithubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the environment."
    );
  }
  return { clientId, clientSecret };
}

function createRandomState() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function exchangeCodeForToken({ clientId, clientSecret, code, redirectUri }) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub token exchange failed (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("GitHub did not return an access token.");
  }
  return data.access_token;
}

async function fetchGithubUser(token) {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "SelfHost-Helper",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub user fetch failed (${response.status}): ${text || response.statusText}`);
  }
  return response.json();
}

export async function startGithubLogin() {
  const { clientId, clientSecret } = getGithubOAuthConfig();

  // Start a temporary local HTTP server for the OAuth redirect
  const state = createRandomState();

  const server = http.createServer();

  const authPromise = new Promise((resolve, reject) => {
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      try {
        server.close();
      } catch {
        // ignore
      }
    };

    server.on("request", async (req, res) => {
      if (!req.url) return;
      const urlObj = new URL(req.url, "http://localhost");
      if (urlObj.pathname !== "/callback") return;

      const code = urlObj.searchParams.get("code");
      const returnedState = urlObj.searchParams.get("state");

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(
        "<html><body><h2>GitHub login complete</h2><p>You can close this window and return to SelfHost Helper.</p></body></html>"
      );

      if (!code || !returnedState || returnedState !== state) {
        cleanup();
        reject(new Error("GitHub OAuth callback missing or invalid state/code."));
        return;
      }

      try {
        const redirectUri = `http://127.0.0.1:${GITHUB_OAUTH_CALLBACK_PORT}/callback`;
        const token = await exchangeCodeForToken({ clientId, clientSecret, code, redirectUri });
        const user = await fetchGithubUser(token);

        await settingsService.update({
          githubToken: token,
          githubUsername: user.login,
          githubAvatarUrl: user.avatar_url,
        });

        logger.info(`[GitHubAuth] Logged in as ${user.login}`);
        cleanup();
        resolve({
          success: true,
          username: user.login,
          avatarUrl: user.avatar_url,
        });
      } catch (err) {
        logger.error("[GitHubAuth] OAuth flow failed:", err);
        cleanup();
        reject(err);
      }
    });

    server.on("error", (err) => {
      if (finished) return;
      logger.error("[GitHubAuth] Local callback server error:", err);
      finished = true;
      reject(err);
    });

    // Safety timeout
    setTimeout(() => {
      if (finished) return;
      logger.error("[GitHubAuth] OAuth flow timed out.");
      finished = true;
      try {
        server.close();
      } catch {
        // ignore
      }
      reject(new Error("GitHub login timed out. Please try again."));
    }, 5 * 60 * 1000); // 5 minutes
  });

  await new Promise((resolve, reject) => {
    server.listen(GITHUB_OAUTH_CALLBACK_PORT, "127.0.0.1", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const redirectUri = `http://127.0.0.1:${GITHUB_OAUTH_CALLBACK_PORT}/callback`;
  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "repo");
  authorizeUrl.searchParams.set("state", state);

  logger.info("[GitHubAuth] Opening browser for GitHub login...");
  shell.openExternal(authorizeUrl.toString());

  return authPromise;
}

export async function createGithubRepoAndLink(projectPath, { name, private: isPrivate, initLocal }) {
  if (!projectPath) throw new Error("projectPath is required");
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("Repository name is required");
  }

  const settings = await settingsService.getAll();
  const token = settings.githubToken;
  if (!token) {
    throw new Error("Not authenticated with GitHub. Please sign in first.");
  }

  const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "SelfHost-Helper",
    },
    body: JSON.stringify({
      name: name.trim(),
      private: !!isPrivate,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub repository creation failed (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json();
  const cloneUrl = data.clone_url;

  if (initLocal) {
    const initResult = await gitService.gitInit(projectPath);
    if (!initResult?.alreadyRepo) {
      logger.info("[GitHubAuth] Initialized local Git repository before linking remote.");
    }
    await gitService.gitAddRemote(projectPath, "origin", cloneUrl);
  }

  logger.info(`[GitHubAuth] Repository created on GitHub: ${data.full_name}`);
  return {
    htmlUrl: data.html_url,
    cloneUrl,
  };
}

