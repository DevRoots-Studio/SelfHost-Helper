# Publishing releases for auto-update

The app uses **electron-updater** with GitHub releases. To avoid 404 errors when users click "Check for updates", releases must follow this format.

## 0. GitHub token (required for publish)

electron-builder needs a **GitHub Personal Access Token** to create/update releases and upload assets. Without it you get:

`GitHub Personal Access Token is not set, neither programmatically, nor using env "GH_TOKEN"`

**Steps:**

1. **Create a token**  
   GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic).  
   Enable scope **`repo`** (full control of private repositories).

2. **Set the token when publishing** (PowerShell):

   ```powershell
   $env:GH_TOKEN = "ghp_your_token_here"
   npx electron-builder --publish always
   ```

   Or in one line (replace with your token):

   ```powershell
   $env:GH_TOKEN = "ghp_xxxx"; npx electron-builder --publish always
   ```

   On bash/macOS/Linux:

   ```bash
   GH_TOKEN=ghp_your_token_here npx electron-builder --publish always
   ```

   You can also set `GH_TOKEN` in your environment or in a `.env` file that you load before running (do not commit the token).

## 1. Release tag format

- Tag must be **`v` + version** (e.g. `v0.8.0`), not `0.8.0v` or `0.8.0`.
- This matches `vPrefixedTagName: true` in `package.json` → `build.publish`.

If the tag is wrong (e.g. `0.8.0v`), the update URL will be wrong and you’ll see:

`Cannot find latest.yml in the latest release artifacts ... 404`

## 2. Required files on the release

Each GitHub release must include:

- **`latest.yml`** – update metadata (required by electron-updater).
- **Installer** – e.g. `SelfHost Helper Setup x.x.x.exe` (Windows NSIS).

These are created and uploaded automatically when you **publish with electron-builder**.

## 3. How to publish correctly

1. Set `version` in `package.json` (e.g. `0.18.1`).
2. Set **`GH_TOKEN`** (see section 0 above).
3. Build and publish:

   ```bash
   npm run build
   npx electron-builder --publish always
   ```

   With token in PowerShell:

   ```powershell
   npm run build
   $env:GH_TOKEN = "ghp_your_token"; npx electron-builder --publish always
   ```

electron-builder will:

- Create or update the GitHub release with tag **`v` + version** (e.g. `v0.8.0`).
- Upload `latest.yml` and the installer (and other platform-specific files) as release assets.

## 4. If you already created a release by hand

- Either **delete** that release and publish again with `electron-builder --publish always`,
- Or **edit** the release:
  - Change the tag to `vX.Y.Z` (e.g. `v0.8.0`).
  - Add the `latest.yml` and installer from a local electron-builder build (e.g. from `release/` or `dist/`) as release assets.

After that, "Check for updates" and install should work.
