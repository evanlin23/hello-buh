"""cbx.py <exaggeration> <out.wav> [text file] : Chatterbox (original, 0.5B) via onnx-community/chatterbox-ONNX, q4 LM,
the model's own default_voice.wav (no cloning). One generation per paragraph of the text, joined with 0.25 s gaps."""
import os
import subprocess
import sys
import time

import numpy as np
import onnxruntime as ort
import soundfile as sf
from huggingface_hub import hf_hub_download
from transformers import AutoTokenizer

ex, out = float(sys.argv[1]), sys.argv[2]
text = open(sys.argv[3] if len(sys.argv) > 3 else "scripts/voice_search/text.txt").read().strip().split("\n\n")
MID = "onnx-community/chatterbox-ONNX"
D = os.environ.get("CBDIR", "cbmodel")
SR, START, STOP = 24000, 6561, 6562


def get(name):
    p = hf_hub_download(MID, filename=f"{name}.onnx", subfolder="onnx", local_dir=D)
    hf_hub_download(MID, filename=f"{name}.onnx_data", subfolder="onnx", local_dir=D)
    return p


so = ort.SessionOptions()
so.intra_op_num_threads = 4
enc, emb, lm, dec = (ort.InferenceSession(get(n), so) for n in
                     ("speech_encoder", "embed_tokens", "language_model_q4", "conditional_decoder"))
ref = hf_hub_download(MID, filename="default_voice.wav", local_dir=D)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", ref, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True,
                     check=True).stdout
audio = np.frombuffer(raw, np.float32)[None, :].copy()
tok = AutoTokenizer.from_pretrained(MID, cache_dir=D)
cond_emb, prompt_token, xvec, pfeat = enc.run(None, {"audio_values": audio})
kv_names = [i.name for i in lm.get_inputs() if "past_key_values" in i.name]


def say(t):
    ids = tok(t, return_tensors="np")["input_ids"].astype(np.int64)
    pos = np.where(ids >= START, 0, np.arange(ids.shape[1])[None, :] - 1)
    inp = {"input_ids": ids, "position_ids": pos, "exaggeration": np.array([ex], np.float32)}
    gen = np.array([[START]], np.int64)
    for i in range(1000):
        e = emb.run(None, inp)[0]
        if i == 0:
            e = np.concatenate((cond_emb, e), 1)
            past = {k: np.zeros([1, 16, 0, 64], np.float32) for k in kv_names}
            mask = np.ones((1, e.shape[1]), np.int64)
        logits, *pres = lm.run(None, dict(inputs_embeds=e, attention_mask=mask, **past))
        lg = logits[:, -1, :].copy()
        sc = np.take_along_axis(lg, gen, 1)
        np.put_along_axis(lg, gen, np.where(sc < 0, sc * 1.2, sc / 1.2), 1)
        nxt = np.argmax(lg, -1, keepdims=True).astype(np.int64)
        gen = np.concatenate((gen, nxt), -1)
        if nxt[0, 0] == STOP:
            break
        inp["input_ids"], inp["position_ids"] = nxt, np.full((1, 1), i + 1, np.int64)
        mask = np.concatenate([mask, np.ones((1, 1), np.int64)], 1)
        for j, k in enumerate(past):
            past[k] = pres[j]
    toks = np.concatenate([prompt_token, gen[:, 1:-1]], 1)
    w = dec.run(None, {"speech_tokens": toks, "speaker_embeddings": xvec, "speaker_features": pfeat})[0].squeeze(0)
    return w


t0 = time.time()
parts = []
for t in text:
    parts += [say(t.replace("\n", " ")), np.zeros(int(0.25 * SR), np.float32)]
y = np.concatenate(parts[:-1])
sf.write(out, y, SR)
print(f"{out}: {len(y)/SR:.1f}s audio in {time.time()-t0:.0f}s CPU")
