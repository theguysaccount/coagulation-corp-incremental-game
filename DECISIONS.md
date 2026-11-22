# Decisions

1. **One game, two acts, two pages.** Act I (Coagulation Corp) lives at `/` and Act II (Coherence Corp) at `/coherence/`. The Defection in Act I stores what crosses over and opens Act II. Keeping two pages lets each act keep its own engine, markup and stylesheet nearly unchanged (proven code, low risk). The shared layer (`src/shared/`) adds what both need: endings, cards, the gallery, storage, sound and analytics.
2. **Act I's collective track is folded into Act II.** The original Act I let you defect into an in-place "commons" with its own five upgrades and two endings (Hollow Emergence, The Spear-Ritual). Coherence Corp is the fuller version of the same idea: data-scaling efficiency, the 501(c)(3) filing, Embodied Wisdom and Spear-ritual Architecture all appear there. So the Defection now leads to Act II, and those two endings are covered by Pyrrhic Parity and Coherent Superintelligence. That leaves 3 + 7 = 10 endings. Act I's recognition list drops the four achievements that only the commons could earn, and "Defector" is now earned by taking the Defection.
3. **What carries over.**
   - Coherence carries over, with a floor of 20, as the original's commons did.
   - Conviction becomes √conviction wisdom, the currency Act II already used.
   - Coagulation at the moment you defect starts their compute 10^(c/25) times higher. This makes the thesis ("defect earlier") a mechanic.
4. **Autosave plus the original save codes.** Claude artifacts cannot use storage. The site can, so both acts autosave every 2 seconds and on pagehide, and keep their export/import codes for moving between devices.
5. **Renamed:**
   - Gollum Mode → Hoard Mode; The One Ring → The Sole Key; "Precious" → "Hoarder"; Black Mirror Fleet → Dark Screen Fleet; Resistance Is Futile → No Exit Protocol (all trademarked fiction).
   - The Ring-Bearer → The Keyholder; Hire the Ring's Recruiters → Hire Their Recruiters.
   - Long-Term Benefit Trust → Long-Horizon Trust, because it is the proper name of a real company's governance body.
   - "Gentle Singularity" → "Soft Takeoff", because it is the title of a real CEO's essay.
   - "YC" → accelerators.

   Act II's endings COMPUTRONIUM, GOLLUM and NATIONALIZED became THE CURVE CLOSES, THE HOARDER and CAPTURED, so the ten titles are unique. The satire of real strategies stays, clearly labelled as fiction.
6. **Balance.** Measured with scripted players on the real code rather than retuned blind:
   - A fast scripted first run that defects at once takes about 10–19 minutes; a human who reads along takes about 20–40.
   - Act II ends within about 13–23 minutes, because their curve forces the issue.
   - Never defecting ends Act I in about 32–46 minutes.

   That meets the 20–40 minute first-run target, so no numbers were changed. `scripts/balance.mjs` guards the windows weekly.
7. **Sound off by default.** Sound is short WebAudio blips with a toggle that is remembered per browser, so there is never surprise audio.
8. **Indexed.** Neither game was ever public, so nothing duplicates them. coherencequest.com serves a different site, so the game goes beside it on a subdomain when the domain rollout session sets one up.

## Open questions for Jack (defaults chosen; nothing blocks)

- **Revenue or thesis distribution?** Default: thesis distribution, plus an optional pay-what-you-want link.
- **One merged game or two?** Default: one game in two acts. Act II can also be played directly at `/coherence/`.
- **Should endings link to real Persist, Coherence or CoFactory actions?** Default: no. The prompt said to cut real-world calls to action, and the game links nowhere outside itself.
