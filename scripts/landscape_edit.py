"""edit.py at 16:9: the same HUD, death screen, subtitles, counters, cards, slow-mo and replay, laid out on a
full 1920x1080 frame (long-form video, docs/longform.md) instead of the Short's 1080x1920 caption layout.

    python3 scripts/landscape_edit.py <every edit.py argument>      (--caption is optional here)

Nothing in edit.py changes for the Shorts: this sets its layout constants (and retention.py's, which draws
the counters, cards and replay tag) before edit.main() runs. There's no caption band at 16:9, so the
caption image is an empty layer and --caption, --red, --colors, --hook and --loop do nothing.
GUI scale stays 3 (the Shorts' scale; vanilla's "auto" at 1080p is 4, which looks oversized in video).
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "scripts"))

from PIL import Image  # noqa: E402

import edit  # noqa: E402
import retention  # noqa: E402

W, H = 1920, 1080


def landscape():
    for mod in (edit, retention):
        mod.W, mod.H, mod.BAND, mod.GAME_H = W, H, 0, H

    def empty_caption(text, red_word, path, colors=None):
        # (edit.caption_png at BAND=0 still drew a 1 px black row along the top)
        Image.new("RGBA", (W, H), (0, 0, 0, 0)).save(path)

    edit.caption_png = empty_caption


def strip(argv):
    """Drop the Short-only options: caption styling, the hook preview, the loop dissolve and any song (the
    episode mixes its own music bed and narration over every segment)."""
    drop1 = {"--red", "--colors", "--hook", "--loop", "--song", "--song_start", "--song_drop_at"}
    out, i, has_caption = [], 0, False
    while i < len(argv):
        a = argv[i]
        key = a.split("=", 1)[0]
        if key in drop1:
            i += 1 if "=" in a else 2
            continue
        if key == "--caption":
            has_caption = True
        out.append(a)
        i += 1
    if not has_caption:
        out += ["--caption", ""]
    return out


if __name__ == "__main__":
    landscape()
    sys.argv = [sys.argv[0]] + strip(sys.argv[1:])
    edit.main()
