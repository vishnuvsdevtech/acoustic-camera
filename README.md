# Acoustic Camera

**Live:** https://vishnuvsdevtech.github.io/acoustic-camera/

Point a microphone array at a wall and *see* where the sound is. This POC
computes the real array response — resolution, grating lobes, low-frequency
reach — so the array can be designed before any parts are bought.

## What is computed, precisely

For `N` mics spaced `d`, steered to φ while the source sits at θ:

```
R(φ) = | Σ_n exp(j · k · d · n · (sinθ − sinφ)) | / N        k = 2πf/c
```

Delay-and-sum in the frequency domain. The beam points at θ by construction;
everything interesting is in what *else* it points at.

## The three things that decide whether a build works

- **Resolution** scales with aperture (`N·d`). Too narrow an array smears every
  source into one blob.
- **Aliasing** appears when `d > λ/2`. The array starts reporting sources that
  are physically impossible — the most common reason a DIY array "works" in
  testing and fails in a plant room. Drag the spacing slider past `λ/2` and
  watch it happen.
- **Low-frequency reach** is aperture versus wavelength. Below ~1 kHz the beam
  widens until nothing separates.

## Scope, honestly

The page is a **simulation of the array response**. It models the physics
exactly, which is what you need before buying mics. It does not model
reverberation, mic mismatch, near-field curvature or self-noise — which is why
`tools/beamform.py` ships alongside: it runs the same delay-and-sum on a real
multi-channel WAV, so the code path exists when the hardware does.

`HARDWARE.md` has the parts list (≈₹1,200 for four mics) and the five wiring
mistakes that cost the most time — starting with clocks, not data.
