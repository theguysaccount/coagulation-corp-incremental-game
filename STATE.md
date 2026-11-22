# State (rebuild of 2026-11-22)

**Originals:** two single-file Claude artifact games in iCloud `Claude/Artifacts/`, both from 2026-08-03 and both complete and playable. Neither was ever public. Each folder's `versions/` held an older same-day snapshot, which was not used.

- `coagulation-corp/index.html` (Act I). Three resource tiers with 18 assets, 23 upgrades, 7 synthesis upgrades and 21 achievements. It has combo, surge, overclock and signals, a wire ticker, Fork prestige, and a hidden "collective" track with 5 endings.
- `coherence-corp/index.html` (Act II). Buildings, research, charter, expedient upgrades and 12 people to bring over, a race against a compute curve, and 7 endings.

**What worked and was kept:** both engines, their copy, their look, their keyboard shortcuts, their prestige loops and their save codes.

**What was broken or risky, and is fixed:**
- **No persistence.** Artifacts could not use storage, so a refresh lost the run. Both acts now autosave to the browser.
- **Two separate games.** Act I's Defection now opens Act II and carries coherence, conviction (as wisdom) and the timing of the defection across. Act I's own collective track duplicated Act II and was folded into it, which leaves 10 endings in all.
- **Trademarked and real-world names.** Tolkien, Black Mirror and Star Trek references, a real company's governance trust and a real essay title. All were renamed, and tests guard against their return.
- **Missing pieces.** There were no share cards, gallery, sound, analytics switch, search pages, Act II `--bad2` colour or mobile tweaks.

**Now:** a static GitHub Pages site with two pages and two script bundles (about 50 KB each, no framework), a guide built from the data, 7 content tests, 10 page tests, a 41-check end-to-end run, a balance check, and weekly live checks.
