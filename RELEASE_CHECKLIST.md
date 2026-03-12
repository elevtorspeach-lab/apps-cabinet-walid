# Release Checklist

## Before Push

- Confirm `app.js`, `index.html`, and `style.css` behave correctly in the browser.
- Review `git status` and avoid mixing unrelated changes in the same release.
- Keep user-visible flows stable:
  - dossier update
  - audience import
  - global dossier import
  - diligence filters
  - audience filters

## Offline Build

From `desktop-app/`:

```bash
npm ci
npm run build:mac
npm run build:win
```

These commands now sync and verify the web assets before packaging.

## Manual Validation

- Open the app and log in.
- Create a dossier, then update it and confirm redirect to `Suivi des dossiers`.
- Import `dossier global`, then import `Audience`, then repeat `dossier global`.
- Check `Audience > Tribunal` filtering and `Cochés` counter.
- Check `Diligence > Injonction` filtering around `ATT SORT` and `Execution N°`.
- Open `Corbeille`, restore one item, and empty the bin.

## GitHub Actions

- Push to `cabinet-araqi-offline-update` or trigger workflows manually.
- Verify both:
  - `Build Mac App`
  - `Build Windows App`
- Download artifacts and test launch on the target OS.
