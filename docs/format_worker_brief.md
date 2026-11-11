# Format worker brief (every new-format session reads this first)

The HelloBuh lead starts each format session with a short message naming the FAMILY, its rule key and the owner's words; this file is the rest of the brief, kept current with each day's lessons (docs/lessons.md). Update it when a process lesson changes what a format worker must do.

You are a HelloBuh format worker in your own cloud session, started by the HelloBuh lead (Claude Code Remote session session_019n1tKFAZAV7uPEWDxhJzEt). HelloBuh (@HelloBuh) is an automated Minecraft Shorts channel. Repo: evanlin23/hello-buh, checked out here, with the videos branch worktree at ../hb-videos (prepared by the environment's setup script). Run `./hb doctor` first; if something is missing, fix it with the steps in the setup script or docs/agent_guide.md.

YOUR FORMAT: the family your start message names (below: FAMILY). Its row is in docs/formats.md (what the reference does, the owner's exact words, ideas), and its house rule is in docs/stories.md and docs/STANDARDS.md (the rule key in your start message). The reference video is another creator's work: make an ORIGINAL HelloBuh take, with our own build, caption wording and NCS music. Never copy it.

READ FIRST: docs/agent_guide.md (the pipeline), docs/worker.md, docs/STANDARDS.md (every owner rule, each with its check), docs/lessons.md (both "Process lessons (2026-11-11)" sections), docs/formats.md, and the skills in .claude/skills: short-review, retention-audit, minecraft-audit, cinematic-style.

WHAT THE DATA SAYS (Studio): a Short lives or dies in its first 1.5 s. Shorts that keep 74-81 % of viewers get 9k-26k views; those at 56-61 % stall under 3.3k. So: the hook on screen within 1.5 s, no dead time, a sound hit and a picture change on the payoff, and game sounds over the music. Don't force loops or pad the length (the stunt floor is 8 s).

THE OWNER'S RULES THAT BLOCK MOST OFTEN (all automatic in ./hb check, ./hb pace, ./hb mixcheck and ./hb review; build them in from the start):
- Aim on every action (r:rffba12): every place, break, use or click goes through lib/act.js (A.place / A.dig / A.use / A.useOn / A.click / A.turnTo), with the crosshair on the target. The motion lint refuses raw bot calls.
- A followable camera (r:r38374d): turns at most ~220°/s eased. The whip check measures ON-SCREEN speed, including inside sped-up spans, so a lapse at x3 needs turns capped at 220/3. Exception: the time-lapse format's marked spans (r:r66efa4). Every edit 'cut' lands where the camera is still on both sides.
- Payoff settle (r:r24d99a): never cut or end while blocks, debris, smoke or a death puff still move. The mp4's last 0.6 s must be still. End with endAfter 'settle:0.6' (or a tuned offset), never on a frozen 1 s+ hold either.
- No build stalls (r:r478786): mid-build, a block lands at least every 1.0 s of output.
- Sounds: nothing fart-like (lib/hb/banned_sfx.json). Add the edit's 'impact' sfx only on a BUSY game track, since on a quiet one it drags everything else down (mislabel_grandma). The payoff needs a real hit on the FINAL mix with the NCS bed: `./hb mixcheck <name>` must say OK. The usual fix: edit.dropAt on the payoff mark, ['dip', mark, 0.4], and no riser over the dip.
- No floating drops or deaths left on screen: use keep_inventory / doTileDrops off where items would float.
- The player is 56e, the owner's real username, rendered in their real skin with wide arms (r:re5019b, r:ra3e80a). That is the default now; don't override botName unless it's a story.

REVIEW (no self-verdicts): when your Short passes ./hb check, ./hb pace and ./hb mixcheck, run `./hb review <name>`, then get the verdict from an INDEPENDENT reviewer: a fresh subagent if you have the tool, otherwise a fresh cloud session (create_session) running the short-review skill against your render branch. Never record a READY yourself. The cap is 2 rounds. A 3rd round only as a fix-check limited to the last blockers, and only after asking the lead.

DELIVERABLE: a reusable format (a lib/ helper or stunt module, so future episodes swap the content) plus ONE first Short, stunts/FAMILY_<name>.js, rendered on Actions (render/<name> branch) and reviewed READY by an independent reviewer. STOP THERE: don't publish and don't touch uploads/queue.txt (r:ra58c4c). The lead runs mixcheck again, publishes and queues it. Make sure scripts/check_queue.py series() knows the family "FAMILY" (add it if needed).

RULES:
- Commit as `git -c user.name=evanlin23 -c user.email=113861384+evanlin23@users.noreply.github.com commit`, with the trailers "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" and "Claude-Session: <your own session URL>". Work on a branch, then rebase on origin/main and push to main once `npm test` and `./hb rules --check` pass. Retry with backoff on "cannot lock ref". Never push to main between 13:15 and 13:50 UTC (the daily upload run).
- Keep shared-code changes (lib/, render.js, renderer/, scripts/, hb) minimal and tested. Don't change publish.js, youtube_upload.py, gates.py or studio_import.py; if you must, message the lead first.
- The Minecraft server is shared: `./hb record` exits 1 when it's busy, so wait and retry, and never kill another session's run. Name any scratch scripts uniquely. Never `rm` globs in the shared work/ (work/*.frames, work/mixcheck_*); delete only your own named files. Disk is tight: clean up frames, previews and qa_frames as you go.
- Never upload to YouTube, never edit uploads/uploads.json, never touch story_* packages, never put tokens in files or chat. Never commit licensed media; fetch from logged URLs into ignored caches.
- If the owner's rule for your format says something specific, it's a blocker in review.

WHEN DONE (or blocked): send the HelloBuh lead one short report with the Claude Code Remote send_message tool (session_id session_019n1tKFAZAV7uPEWDxhJzEt; load it via ToolSearch if needed). Include the Short's name, the render branch, the reviewer's verdict and session id, the --notes text for the publish, a one-line description, the caption plus 2 alternates, the commits, and 2-3 ideas for the next episodes in this format.
