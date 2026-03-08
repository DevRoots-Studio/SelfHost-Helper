# Publishing releases for auto-update

The app uses **electron-updater** with GitHub releases. To avoid 404 errors when users click "Check for updates", releases must follow this format.

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

1. Set `version` in `package.json` (e.g. `0.8.0`).
2. Build and publish to GitHub in one go:

   ```bash
   npm run build
   npx electron-builder --publish always
   ```

   Or use a script that runs `electron-builder` with a publish option (`always`, `onTag`, etc.).

3. Ensure **GitHub token** is set so electron-builder can create the release and upload assets:
   - `GH_TOKEN` or `GITHUB_TOKEN` with `repo` scope.

electron-builder will:

- Create or update the GitHub release with tag **`v` + version** (e.g. `v0.8.0`).
- Upload `latest.yml` and the installer (and other platform-specific files) as release assets.

## 4. If you already created a release by hand

- Either **delete** that release and publish again with `electron-builder --publish always`,
- Or **edit** the release:
  - Change the tag to `vX.Y.Z` (e.g. `v0.8.0`).
  - Add the `latest.yml` and installer from a local electron-builder build (e.g. from `release/` or `dist/`) as release assets.

After that, "Check for updates" and install should work.
