# Local Setup Instructions

To test the application locally without pushing changes to GitHub, follow these steps:

## Clean MySQL + Wi-Fi IP Setup

If you want a fresh empty database and you want the app to connect through the server Wi-Fi IP:

1. Copy `server/.env.example` to `server/.env`.
2. Update the MySQL values in `server/.env`:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
3. Keep `HOST=0.0.0.0` in `server/.env` so the API is reachable from other machines on the same Wi-Fi.
4. Reset MySQL to an empty application state:
   ```bash
   cd server
   npm run db:reset
   ```
5. Save the Wi-Fi server IP for the desktop app:
   ```bash
   cd desktop-app
   npm run set:server-ip
   ```
   Or set it manually:
   ```bash
   cd desktop-app
   node set-server-ip.js 192.168.1.20
   ```
6. Start the API:
   ```bash
   cd server
   npm start
   ```
7. The desktop app will read the server IP from `desktop-app/server_ip.txt` and connect to `http://<wifi-ip>:3000`.

## Windows Auto-Start For The API

If you want the API to start automatically every time Windows boots:

1. Open PowerShell as Administrator.
2. Run:
   ```powershell
   cd server
   powershell -ExecutionPolicy Bypass -File .\install-server-autostart.ps1 -StartNow
   ```
3. This installs a Windows Scheduled Task named `CabinetWalidAraqiApi`.
4. On every Windows startup, the task launches `start-server-background.ps1`, which launches the supervisor.
5. The supervisor automatically restarts `node index.js` if it crashes.

To remove auto-start later:

```powershell
cd server
powershell -ExecutionPolicy Bypass -File .\remove-server-autostart.ps1
```

> [!WARNING]
> `npm run db:reset` clears the application data in MySQL and replaces it with an empty state.

### 1. Run the Web Application (Vite)
The Vite server is currently running in your workspace. You can access it at:
- **URL**: [http://localhost:5174/](http://localhost:5174/)

If you need to restart it manually:
1. Open a terminal.
2. Navigate to the `client` directory: `cd client`
3. Run: `npm run dev`

### 2. Run the Legacy Web App (Root)
If you want to test the plain HTML/JS version in the root directory:
1. Open a terminal in the root directory.
2. Run: `npx serve .`
3. Open: `http://localhost:3000`

### 3. MySQL Configuration (New)
The application now uses MySQL for data storage.
1. Ensure you have **MySQL 5.7+** installed and running.
2. Create `server/.env` from `server/.env.example`, then enter your database credentials.
3. Run the migration script to move your data from JSON to MySQL:
   ```bash
   cd server
   npm run db:init
   ```
4. Start the server:
   ```bash
   cd server
   npm start
   ```

### 4. Verification of the Sorting Fix
- Go to the **Audience** page.
- Check the **Excel Export (Audience Print/Export)**.
- The dossiers should now be sorted by **Year (Ascending)**, from oldest to newest (e.g., 2022 comes before 2027).
- If the years are the same, they are sorted by the reference number (**XXXX**) in ascending order.

> [!NOTE]
> This local mode only interacts with your local filesystem and the browser's `localStorage` (if applicable). It will **not** push any changes to GitHub unless you explicitly use a "Sync" or "Push" button within the application (if implemented).
