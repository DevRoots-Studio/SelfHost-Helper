# Restore from backup (recover projects after upgrade)

If you updated to a newer version and your project list is empty, the app may have created a **backup file** of your old database. You can restore it without losing any data.

## Option 1: Restore from the app (recommended)

1. Open **Settings** (gear or settings in the app).
2. Scroll to **Data & backup**.
3. Do one of the following:
   - **Choose backup file…** – Pick your backup file from anywhere (e.g. Desktop, Downloads). Supported: `.sqlite` or `.db` files, or any file named like `projects.sqlite.backup_1234567890`.
   - **Open data folder** – Opens the folder where the app stores data. If your backup is already there (e.g. `projects.sqlite.backup_...`), use **Restore** next to that file.

4. After restore, the project list refreshes automatically.

## Option 2: Manual restore (if the app won’t start or you prefer)

1. **Find your backup file**  
   It may be named like:
   - `projects.sqlite.backup_<timestamp>`
   - `projects.sqlite.backup_skip_<timestamp>`
   - `projects.sqlite.backup_empty_<timestamp>`

2. **Find the app’s data folder**
   - **Windows:** `%APPDATA%\selfhost-helper` (e.g. `C:\Users\<You>\AppData\Roaming\selfhost-helper`)
   - **macOS:** `~/Library/Application Support/selfhost-helper`
   - **Linux:** `~/.config/selfhost-helper`

3. **Restore**
   - Quit the app fully.
   - (Optional) Rename or move the current `data.json` in that folder if you want to replace current data.
   - Copy your backup file into the data folder and rename it to **`projects.sqlite`**.
   - Start the app. On startup it will detect `projects.sqlite`, migrate it into the new storage, then rename the file to a backup again. Your projects will be back.

## Need help?

If your backup has a different name or location, use **Settings → Data & backup → Choose backup file…** and select that file directly. The app accepts any valid legacy SQLite database from older versions.
