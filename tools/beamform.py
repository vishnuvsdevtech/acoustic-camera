"""Delay-and-sum beamforming on a real multi-channel recording.

The browser POC simulates the array; this runs the same maths on captured audio,
so the code path exists the day the hardware does.

    python3 tools/beamform.py take.wav --spacing 0.04 --angles -90 90

Input: a WAV whose channels are the mics, in physical order along the array.
Fractional delays are applied by linear interpolation — good enough above ~1 kHz,
which is where an acoustic camera is useful anyway.
"""
from __future__ import annotations

import argparse
import math
import struct
import wave

C = 343.0


def read_wav(path: str):
    with wave.open(path, "rb") as w:
        ch, sw, fs, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    if sw != 2:
        raise SystemExit(f"need 16-bit PCM, got {sw * 8}-bit")
    vals = struct.unpack("<" + "h" * (len(raw) // 2), raw)
    frames = [vals[i:i + ch] for i in range(0, len(vals), ch)]
    return ch, fs, frames


def delay_and_sum(frames, fs, spacing, angle_deg, ch):
    """Steer to `angle_deg`; return normalised power."""
    tau = [i * spacing * math.sin(math.radians(angle_deg)) / C for i in range(ch)]
    max_d = max(abs(t) for t in tau)
    lo = int(max_d * fs) + 2
    hi = len(frames) - lo
    if hi - lo < 256:
        return 0.0
    acc = 0.0
    for i in range(lo, hi, 4):                     # decimate for speed
        s = 0.0
        for c in range(ch):
            d = tau[c] * fs
            idx = i - d
            i0 = int(idx)
            frac = idx - i0
            a = frames[i0][c]
            b = frames[i0 + 1][c]
            s += a + (b - a) * frac
        acc += s * s
    return acc / ((hi - lo) / 4) / (ch * ch)


def sparkline(values, width=64):
    ramp = " .:-=+*#%@"
    lo, hi = min(values), max(values)
    span = (hi - lo) or 1.0
    out = []
    for v in values:
        out.append(ramp[min(len(ramp) - 1, int((v - lo) / span * (len(ramp) - 1)))])
    return "".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("wav")
    ap.add_argument("--spacing", type=float, default=0.04, help="mic spacing in metres")
    ap.add_argument("--step", type=float, default=2.0, help="angle step in degrees")
    ap.add_argument("--lo", type=float, default=-80.0)
    ap.add_argument("--hi", type=float, default=80.0)
    a = ap.parse_args()

    ch, fs, frames = read_wav(a.wav)
    print(f"{a.wav}: {ch} channels, {fs} Hz, {len(frames)} frames, spacing {a.spacing*1000:.0f} mm")
    aperture = (ch - 1) * a.spacing
    print(f"aperture {aperture:.2f} m — resolution limit ≈ {math.degrees(math.asin(min(1, C/fs/aperture*2))):.1f}°")

    angles, powers = [], []
    ang = a.lo
    while ang <= a.hi:
        angles.append(ang)
        powers.append(delay_and_sum(frames, fs, a.spacing, ang, ch))
        ang += a.step

    peak_i = max(range(len(powers)), key=lambda i: powers[i])
    print()
    print(f"  {a.lo:+.0f}° {sparkline(powers)} {a.hi:+.0f}°")
    print(f"  peak bearing: {angles[peak_i]:+.1f}°  (relative to array broadside)")

    # report side lobes above half the peak — these are the ghosts that make an
    # array untrustworthy, and in a real capture they are usually mic mismatch
    half = powers[peak_i] * 0.5
    lobes = [(ang, p) for ang, p in zip(angles, powers)
             if p > half and abs(ang - angles[peak_i]) > 12]
    if lobes:
        print(f"  side lobes above 50%: {', '.join(f'{x:+.0f}°' for x, _ in lobes[:8])}")
        print("  → check mic spacing against λ/2, and check mic gain matching")
    else:
        print("  no side lobes above 50% — the array is resolving cleanly")


if __name__ == "__main__":
    main()
