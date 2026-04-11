# Local Setup Instructions

To test the application locally without pushing changes to GitHub, follow these steps:

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
2. Open `server/.env` and enter your database credentials.
3. Run the migration script to move your data from JSON to MySQL:
   ```bash
   cd server
   node migrate-to-mysql.js
   ```
4. Start the server:
   ```bash
   cd server
   node index.js
   ```

### 4. Verification of the Sorting Fix
- Go to the **Audience** page.
- Check the **Excel Export (Audience Print/Export)**.
- The dossiers should now be sorted by **Year (Ascending)**, from oldest to newest (e.g., 2022 comes before 2027).
- If the years are the same, they are sorted by the reference number (**XXXX**) in ascending order.

> [!NOTE]
> This local mode only interacts with your local filesystem and the browser's `localStorage` (if applicable). It will **not** push any changes to GitHub unless you explicitly use a "Sync" or "Push" button within the application (if implemented).
