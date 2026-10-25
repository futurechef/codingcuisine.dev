"""Builds the station's recorded instruments: public/station/<sample>/<note>.mp3 + strudel.json.

Sources (all redistributable, credited in README.md):
  VSCO 2 Community Edition, https://github.com/sgossner/VSCO-2-CE (CC0-1.0):
    Strings/Violin Section/susVib (v1)   -> violins
    Strings/Viola Section/susvib (v1)    -> violas
    Strings/Cello Section/susvib (v1)    -> cellos
    Strings/Solo Contrabass/SusVib (v1)  -> contrabass
    Strings/Harp (mf)                    -> harp
    Keys/Upright Piano (dyn1; Simon Dalzell / Ivy Audio, redistributable) -> piano

Kitchen layer (public/station/kitchen/<name>.mp3), from Wikimedia Commons:
    rain: "Rain against the window.ogg" by cori, via pdsounds.org (public domain;
          decoded from Commons' MP3 transcode, start 20 s)
    cafe: "Cafe ambiance.ogg" by Marble Toast (CC0; start 300 s)

Usage (in a venv with numpy, soundfile, lameenc):
  python scripts/station-samples.py <dir of downloaded wavs named <sample>_<anything>.wav>
  python scripts/station-samples.py kitchen <name> <recording> <start seconds>

Pitch comes from the file name: VSCO's string names run an octave low (OCTAVE_UP), and the
piano files are numbered by the MappingChart (file NNN = MIDI key 21 + 2*NNN). Each file's
pitch is also measured, and a pitch class that disagrees with the name is reported.
Then: mono, trimmed, faded out, peak-normalised to -3 dBFS, MP3 96 kbps.
"""
import json
import pathlib
import sys

import lameenc
import numpy as np
import soundfile as sf

OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'station'
SECONDS = {'harp': 4.0, 'piano': 5.0}  # everything else 6 s
OCTAVE_UP = {'violins': 1, 'violas': 1, 'cellos': 1, 'contrabass': 1}
DEFAULT_SECONDS = 6.0
FADE = 0.4
NAMES = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b']


def pitch(x: np.ndarray, rate: int) -> float:
    """Fundamental by harmonic product spectrum, on a window after the attack."""
    start = int(0.25 * rate)
    seg = x[start:start + 2 ** 16]
    if len(seg) < 2 ** 14:
        seg = x[: 2 ** 16]
    n = 2 ** 17
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n))
    hps = spec.copy()
    for h in (2, 3, 4):
        dec = spec[::h]
        hps[: len(dec)] *= dec
    freqs = np.fft.rfftfreq(n, 1 / rate)
    band = (freqs > 27) & (freqs < 4200)
    return float(freqs[band][np.argmax(hps[band])])


def midi_of(freq: float) -> int:
    return int(round(69 + 12 * np.log2(freq / 440)))


def name_of(midi: int) -> str:
    return f'{NAMES[midi % 12]}{midi // 12 - 1}'


def midi_from_label(sample: str, label: str) -> int:
    if sample == 'piano':
        return 21 + 2 * int(label)
    letter, rest = label[0].lower(), label[1:]
    sharp = rest.startswith('#')
    octave = int(rest[1:] if sharp else rest) + OCTAVE_UP.get(sample, 0)
    return 12 * (octave + 1) + NAMES.index(letter) + (1 if sharp else 0)


def encode(x: np.ndarray, rate: int) -> bytes:
    enc = lameenc.Encoder()
    enc.set_bit_rate(96)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    return enc.encode(pcm) + enc.flush()


def main(src: str) -> None:
    sample_map: dict = {'_base': '/station/'}
    for wav in sorted(pathlib.Path(src).glob('*.wav')):
        sample, label = wav.stem.split('_')[:2]
        x, rate = sf.read(wav, always_2d=True)
        x = x.mean(axis=1)
        # drop leading silence
        on = np.argmax(np.abs(x) > 0.01 * np.abs(x).max())
        x = x[on:]
        midi = midi_from_label(sample, label)
        note = name_of(midi)
        heard = midi_of(pitch(x, rate))
        if heard % 12 != midi % 12:
            print(f'check: {wav.name} named {note}, measured {name_of(heard)}')
        x = x[: int(SECONDS.get(sample, DEFAULT_SECONDS) * rate)]
        f = int(FADE * rate)
        x[-f:] *= np.linspace(1, 0, f) ** 2
        x *= (10 ** (-3 / 20)) / max(np.abs(x).max(), 1e-9)
        out = OUT / sample / f'{note}.mp3'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(encode(x, rate))
        notes = sample_map.setdefault(sample, {})
        if note in notes:
            print(f'warning: {wav.name} measured as {note}, already taken')
        notes[note] = f'{sample}/{note}.mp3'
        print(f'{wav.name:40s} -> {sample}/{note}.mp3 ({out.stat().st_size // 1024} KB)')
    for k, v in sample_map.items():
        if k != '_base':
            sample_map[k] = dict(sorted(v.items(), key=lambda kv: NAMES.index(kv[0][:-1]) + 12 * int(kv[0][-1])))
    (OUT / 'strudel.json').write_text(json.dumps(sample_map, indent=1) + '\n', encoding='utf-8')


LOOP = 45.0      # seconds in the loop
CROSSFADE = 3.0  # tail blended into the head so the loop has no seam


def kitchen(name: str, src: str, start: float) -> None:
    """A seamless mono loop at a steady, quiet level (RMS -20 dBFS; the engine sets the mix)."""
    x, rate = sf.read(src, always_2d=True)
    x = x.mean(axis=1)
    a, n, f = int(start * rate), int(LOOP * rate), int(CROSSFADE * rate)
    seg = x[a:a + n + f].copy()
    if len(seg) < n + f:
        raise SystemExit(f'{src}: not enough audio after {start} s')
    t = np.linspace(0, np.pi / 2, f)
    out = seg[:n].copy()
    out[:f] = seg[:f] * np.sin(t) + seg[n:n + f] * np.cos(t)  # equal-power blend
    out *= (10 ** (-20 / 20)) / max(np.sqrt(np.mean(out ** 2)), 1e-9)
    out = np.clip(out, -0.98, 0.98)
    dest = OUT / 'kitchen' / f'{name}.mp3'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(encode(out, rate))
    print(f'{src} -> kitchen/{name}.mp3 ({dest.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    if sys.argv[1] == 'kitchen':
        kitchen(sys.argv[2], sys.argv[3], float(sys.argv[4]))
    else:
        main(sys.argv[1])
