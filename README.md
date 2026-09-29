# THE FIRST BITE — THE STRATEGY · Treviso Tiramisù × INHAUS

Part two of the approved pitch (https://inhausdigitalpresentations.github.io/treviso/).
The pitch sold the idea; this deck shows how it works: the mechanics, the platforms,
the gifts, the calendar.

**27 scenes + 5 chapter dividers · 6 chapters** — same design system, same horizontal
scroll engine, same fonts and tokens as the pitch.

## Structure
```
index.html                  The presentation (copy inline, scene by scene)
css/main.css                Pitch design system — UNCHANGED copy
css/strategy.css            New components only (menu wall, search mock, ticket, IG grid,
                            number cards, platform tiles, series, gift box, 90-day plan…)
js/main.js                  Pitch engine — UNCHANGED copy
media/                      Only the assets this deck uses (fonts, logos, images, video)
Treviso_Strategy_Copy_v2.md Approved copy — source of truth
```

## Run / deploy
Open `index.html` directly, or `python3 -m http.server 8080`.
GitHub Pages: push this folder to a new repo (e.g. `treviso-strategy`) → Settings → Pages →
Deploy from branch `main` / root. No build step; all paths are relative.

## Chapters
Cover · 01 What We Learned · 02 The Strategy · 03 The First Bite · 04 Platforms & Content ·
05 The Launch · 06 The Close

## Placeholders still to replace (search `class="placeholder"` in index.html)
- `[OPENING DATE]` — scenes 25 and 27
- `[SOCIAL HANDLE]` — scene 13 (IG grid header)
- Teaser posts 01–03 — scene 13 (assets; post 03 line to be defined)
- Post-show offer with Dubai Opera — scene 10
- Second-bite return offer — scene 17
- Box design (scene 22), packaging (scene 23), real Espresso Atelier footage (scene 08)
- Delivery launch timing — scene 25 ("[if live]")

## Notes
- Scene 04 names the Dubai chocolate case — confirm the client is comfortable with it.
- Numbers on slides are sourced (Dubai Media Office; Khaleej Times) — see copy file.
- Visuals are the pitch's conceptual/reference images, reused; replace with real brand
  photography when available.
- Mobile / tablet re-flows into a vertical scroll; reduced-motion respected (inherited).
