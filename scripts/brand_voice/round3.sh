#!/bin/bash
# Round 3 (2026-11-10): 6 kid takes of Light Sleeper's r-cast narrator lines on gemini-3.8-flash-lite-tts, 20 s apart
# (its free tier allows 3 a minute). Stops on the first failure. Run from the repo root.
set -e
L=gemini-3.8-flash-lite-tts; T=scripts/brand_voice/text_light_sleeper_rcast.txt
C="One breath, keep going: each new sentence lifts, stress only the capitalised word"
NV="fast, bright, full voice, not whispery, breathy or soft"
SLEEP="A kid telling a spooky-funny story at a sleepover, fast and gleeful, every sentence a bit more excited, one breath, stress only the capitalised word; full voice, never whispering"
run() { python3 scripts/brand_voice/gem.py gc "$1" $L "$2" "$3" $T; sleep 20; }
sleep 30
run r1_pip Leda "A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing story; not whispery, breathy or soft. $C"
run r2_proud Leda "A happy, bubbly nine-year-old kid proudly telling a friend about their town, as if every weird thing in it were totally normal and kind of cool, never guessing it might be scary; $NV. $C"
run r3_figuring Leda "A happy, bubbly nine-year-old kid figuring the world out loud, sharing fun facts they got a little bit wrong, cheerful and completely sure of themselves; $NV. $C"
run r4_showtell Leda "A bubbly nine-year-old kid at show-and-tell, beaming, sure this is the coolest totally normal thing ever; $NV. $C"
run r5_laomedeia_sleepover Laomedeia "$SLEEP"
run r6_autonoe_sleepover Autonoe "$SLEEP"
