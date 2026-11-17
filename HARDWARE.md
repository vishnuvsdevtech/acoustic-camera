# Hardware — first build

The simulation tells you what array you need. This is the minimum that proves it
in a real room.

## Bill of materials (4-mic first build)

| part | qty | note |
|---|---|---|
| INMP441 I²S MEMS mic breakout | 4 | ~₹150 each; digital, so no ADC noise |
| ESP32-S3 dev board | 1 | two I²S peripherals → 2 mics per bus (L/R) |
| rigid bar (aluminium or 3 mm acrylic) | 1 | **mics must be held rigidly at an exact spacing** |
| phone or Pi camera | 1 | for the overlay |
| USB power bank | 1 | |

≈ ₹1,200 total.

## Wiring gotchas, in order of how much time they cost

1. **Clock, not just data.** Every mic must share one I²S clock (BCLK/LRCLK). Two
   buses with independent clocks give you drifting sample phases and a beam that
   wanders. If you need 8 mics, prefer one TDM bus over four stereo buses.
2. **Measure the spacing on the board, not on the drawing.** 40 mm nominal,
   42 mm actual spreads the beam sideways and adds side lobes that look like
   real sources.
3. **Match gain.** INMP441 modules differ by 1–2 dB; unmatch and the side lobes
   rise. Record a single source at 0°, compare per-channel RMS, correct in
   software.
4. **Rigidity beats precision.** A mic that moves 0.2 mm between takes changes
   the phase relationship. Glue, don't tape.
5. **Wind and handling noise** dominate below 500 Hz — high-pass at 400 Hz before
   beamforming.

## Once it records

```bash
python3 tools/beamform.py take.wav --spacing 0.04
```

Put one source at a known angle first — a phone playing a 2 kHz tone at 0°, then
+30°, then −45°. If the peak bearing doesn't track the true angle within a few
degrees, fix the array before trusting any result.

## Upgrades, in value order

1. **Six to eight mics** — resolution scales with aperture; this is the single
   biggest jump.
2. **Wider aperture for low frequency** — if you care about 500 Hz leaks, you
   need ~1 m of array, not 0.2 m.
3. **Optical overlay** — camera intrinsics + a flat wall homography turns the
   bearing into a dot on a photograph. That's the "camera" part of the name.
4. **Beamforming in the frequency domain** — per-band maps separate a hiss from
   a rumble in the same place.
