# Cinematic scenes from existing recordings (scripts/cinematic.py)

Owner, 2026-11-10: "can we render a super cinematic scene". THE KEEP (`episodes/keep/scene.json`) re-shoots the
published lapse_castle recording: no server, no new recording.

```bash
python3 scripts/cinematic.py episodes/keep/scene.json --sheet --at 0.1,0.5,0.9   # stills of every clip (~3 min a clip)
python3 scripts/cinematic.py episodes/keep/scene.json --sheet --only gold --portrait
# full render on Actions (.github/workflows/render-cinematic.yml): 12 slices x 2 cuts, then the score and the title
echo '{"scene": "episodes/keep/scene.json", "portrait": true}' > renders/cine_job.json && git commit -am queue && git push
gh run download <run> -n film -n vertical
```

A scene is a list of clips. Each clip is a window of the recording (`t0` seconds) played at `rate` recording seconds per
screen second (0.06 = near-frozen, 8.5 = a time-lapse), one render.js camera spec (`shot`; `path`/`lookPath` keys and
`degPerSec` in screen seconds), an hour (`day`: a dayTime or `[[sec, dayTime], ...]`, a time mark every frame), a `look`
merged over the stunt module's (stunts/cinematic_keep.js) and an optional `fogSea`. `drop` removes block changes (the
recording's small builds), the recording bot is parked under the world, `xfade` dissolves into a clip, `title` and
`cues` place the card and the score's sections. The vertical cut (`--portrait`) widens each lens by 1.55 (or `vfov`)
and drops the letterbox.

Renderer changes it needed: a time change only re-meshes when the sky darkening changes (`DAY_LIGHT_STEP`, 0.025 here,
rounds it at dawn and dusk), the grade clamps before its S-curve (blown skies near the sun went cyan), and
`look.reflect.ice: false` mirrors water only (grass level with the plane mirrored the whole courtyard).

Costs: each render.js call meshes the world (~25 s) and walks to its frames; a dusk clip re-meshes a few times
(~20-50 s each). On Actions the 16:9 film's slices took 4-16 minutes each.
