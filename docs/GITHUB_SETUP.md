# GitHub Setup Guide 🚀

**Step-by-step instructions to deploy Space Monkey to GitHub**

---

## ✅ Step 1: Update README.md

**Status:** ✅ Done (new user-friendly version created)

Your [`README.md`](../README.md) is now visitor-friendly with:
- Clear "Play Now" button
- Simple controls and goal
- Badges for visual appeal
- Link to technical docs

---

## ✅ Step 2: Move Technical Docs

**Status:** ✅ Done

All technical documentation moved to [`DEVELOPERS.md`](DEVELOPERS.md) including:
- 50-line working prototype
- Complete physics formulas
- Upgrade systems
- Architecture details

---

## ✅ Step 3: Add LICENSE

**Status:** ✅ Done

[`LICENSE`](../LICENSE) file created with MIT License - allows others to:
- Use the code
- Modify it
- Distribute it
- Create commercial versions (with attribution)

---

## ✅ Step 4: GitHub Pages — enabled (Source: GitHub Actions)

**Status:** ✅ Done (2026-08-03)

Deployment was disabled for a period while third-party imagery was being replaced.
That work finished at v1.0: all art in [`assets/`](../assets/) is original (see
[`ATTRIBUTIONS.md`](../ATTRIBUTIONS.md)), so the site is live again.

The current, correct configuration — already applied to this repo:

1. The `deploy` job is restored in `.github/workflows/deploy.yml` (it assembles
   `_site/` from `index.html` + `assets/` and publishes via `deploy-pages`).
2. The Pages site is configured with **Source: GitHub Actions** (Settings → Pages →
   Build and deployment). Do **not** choose "Deploy from a branch" — the
   workflow's `deploy-pages` action only works with the Actions source, and branch
   mode would serve the whole repo (source, tests, docs) instead of the assembled
   `_site/`.
3. Test it by visiting the URL: `https://atominnovationth.github.io/SMX/`

---

## 🏷️ Step 5: Add Repository Metadata

**Status:** ✅ Done (2026-08-03 — applied when the repo was recreated; the original
repo never actually had these set)

Applied values:

- **Description:** `🚀🐵 Contactless space-elevator-climber simulation — climb to the Kármán line`
- **Website:** `https://atominnovationth.github.io/SMX/`

If you are setting up a **fork**, the manual route is: repo → ⚙️ gear icon next to
"About" → fill in Description and Website. Optional topics: `game`, `html5-game`,
`physics-game`, `browser-game`, `javascript-game`, `canvas`, `space`,
`educational`, `webgl`.

---

## 📦 Step 6: Upload Asset Files

**Status:** ✅ Done — the 98 assets in [`assets/`](../assets/) are committed to the repo
(see `tools/check_refs.py`: 98 referenced, 0 missing, 0 orphans).

**Option A: Push assets directly (Recommended)**
```bash
git add "assets/"
git commit -m "Add game assets (images and icons)"
git push origin main
```

**Option B: Regenerate `index.html` (not a single-file build)**
```bash
# Use the embed_assets.py script
python3 embed_assets.py

# This inlines the statically-referenced assets (clouds, the monkey, textures)
# into index.html as data URIs. The ~70 landmark sprites are referenced through a
# runtime-built path and are NOT inlined, so index.html is not standalone: it must
# ship alongside the assets/ folder (as it does on GitHub Pages).
```

---

## 🏷️ Step 7: Create Version Tags

**Action Required** (move the `v1.0.0` tag onto the final tree):

```bash
# Tag the current version (force-move the existing v1.0.0 onto HEAD)
git tag -f -a v1.0.0 -m "v1.0.0 — the legally-clean release (all artwork original)"
git push --force origin refs/tags/v1.0.0
```

Then on GitHub:
1. Go to **Releases** (right sidebar)
2. Click **Create a new release**
3. Select tag: `v1.0.0`
4. Release title: `v1.0.0 - legally-clean release (original artwork)`
5. Description:
   ```markdown
   ## 🎮 v1.0.0 — legally-clean release
   
   - All artwork original (third-party imagery + history rewritten out)
   - Original-asset generation pipeline (`art-gen/`)
   - 78 educational landmark sprites
   - Continuous-coupling climb + EPM energy loop
   - Browser-ready (no install needed)
   
   **[▶️ Play Now](https://atominnovationth.github.io/SMX/)**
   ```
6. Click **Publish release**

---

## 🔗 Step 8: Cross-Link with GMX Repository

**Action Required — external / owner-only.** This step edits a different repository
(`AtomInnovationTH/GMX`) and *cannot* be completed from this repo, so the checklist
item below is intentionally left unchecked.

1. **In SMX Repository:**
   - Already added to new [`README.md`](../README.md) under "For Developers"

2. **In GMX Repository:**
   - Go to: `https://github.com/AtomInnovationTH/GMX`
   - Edit its README.md
   - Add near the top:
     ```markdown
     ## Related Projects
     🚀 [SMX - Space Monkey](https://github.com/AtomInnovationTH/SMX) - Physics-based climbing game using graphene tethers
     ```

---

## 🎯 Quick Summary Checklist

Once you complete the action-required steps above:

- [x] Step 1: Update README.md ✅ Done
- [x] Step 2: Move technical docs to DEVELOPERS.md ✅ Done  
- [x] Step 3: Add LICENSE ✅ Done
- [x] Step 4: GitHub Pages ✅ Done — Source: GitHub Actions (see Step 4 above)
- [x] Step 5: Add repository metadata ✅ Done (applied at repo recreation, 2026-08-03)
- [x] Step 6: Upload asset files ✅ Done (assets are committed; check `git status` clean)
- [x] Step 7: Create version tags ✅ Done (moved `v1.0.0` onto HEAD, 2026-08-03)
- [ ] Step 8: Cross-link GMX repo (update GMX README) — external/owner-only, cannot be done from this repo

---

## 📸 Optional Enhancements

### Add Screenshots to README

Capture gameplay at different altitudes and add to README:

```markdown
## 📸 Screenshots

![Ground Level](../screenshots/ground.png)
![Stratosphere](../screenshots/stratosphere.png)
![Space](../screenshots/space.png)
```

### Add Social Preview Image

1. Create 1280x640px image showing gameplay
2. Go to **Settings → Options → Social preview**
3. Upload image
4. Now when shared on social media, shows preview!

---

## 🆘 Troubleshooting

### GitHub Pages not working?
- Check **Settings → Pages**: Source must be **GitHub Actions** (not "Deploy from a
  branch" — the `deploy-pages` action only works with the Actions source).
- Check the latest **Build & Deploy** workflow run under Actions — the `deploy`
  job only runs on pushes to `main`, and the very first run after Pages is
  (re)created may need a re-run once Pages exists.

### Assets not loading?
- Check file paths are correct (case-sensitive!)
- Verify all files pushed to GitHub
- Check browser console (F12) for errors

### Game not running?
- Make sure `index.html` is in root directory
- Check browser supports HTML5/Canvas
- Test locally first with `python3 -m http.server 8000`

---

## 🎉 After Setup Complete

Once all steps are done, your repository will have:

✅ Professional README with badges  
✅ Technical docs separated  
✅ Proper license  
✅ Live playable demo  
✅ Good discoverability (tags/description)  
✅ Version releases  
✅ Cross-project linking  

**Share your game:** `https://atominnovationth.github.io/SMX/` 🚀🐵
