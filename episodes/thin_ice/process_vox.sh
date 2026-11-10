#!/usr/bin/env bash
# After scripts/tts.py and the cut (docs/ai_dilemma.md): Grok deeper and bigger (owner: "not strong or deep enough or
# boomy enough"): -3.4 semitones at the same speed, low end up, a sub-octave layer, compressed (~70 Hz median pitch).
# DeepSeek a little higher and colder (it sat at 81 Hz, too close to Grok). Claude 15% faster.
set -euo pipefail
cd "$(dirname "$0")/../../work/thin_ice/vox"
for g in g1 g2; do
  [ -f ${g}_orig.wav ] || cp $g.wav ${g}_orig.wav
  ffmpeg -v error -y -i ${g}_orig.wav -filter_complex "[0]asetrate=24000*0.82,aresample=24000,atempo=1.2195,equalizer=f=90:t=q:w=0.9:g=7,equalizer=f=180:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=-3,asplit=2[a][b];[b]asetrate=24000*0.5,aresample=24000,atempo=2.0,lowpass=f=400,volume=0.22[sub];[a][sub]amix=inputs=2:normalize=0,acompressor=threshold=-20dB:ratio=4:attack=8:release=180:makeup=4" $g.wav
done
[ -f ds_orig.wav ] || cp ds.wav ds_orig.wav
ffmpeg -v error -y -i ds_orig.wav -af "asetrate=24000*1.1,aresample=24000,atempo=0.909,highpass=f=140,aphaser=type=t:speed=0.4:decay=0.3,acompressor=threshold=-18dB:ratio=3" ds.wav
