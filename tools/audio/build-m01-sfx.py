#!/usr/bin/env python3
"""Build the M01 recorded SFX/ambience OGG files from the mirrored CC0/CC-BY freesound clips.

Usage: python3 -I tools/audio/build-m01-sfx.py [--src-ww2 DIR] [--src-ambient DIR] [--out assets/audio/m01]

Inputs (data only, never executed):
  <src-ww2>/*.mp3      StevenACZ/ww2-movie-map public/audio (edits of freesound clips, licences in CREDITS.md)
  <src-ambient>/*.ogg  Muges/ambientsounds wind.ogg and fireplace.ogg
Outputs: assets/audio/m01/sfx/*.ogg and the "sfx/" entries of assets/audio/m01/manifest.json.
Deterministic: no randomness. Needs numpy and ffmpeg (libvorbis).
"""
import argparse
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as A  # noqa: E402
import manifestlib as M  # noqa: E402

SR = A.SR
WW2_REPO = 'https://github.com/StevenACZ/ww2-movie-map'
AMB_REPO = 'https://github.com/Muges/ambientsounds'
CC0 = ('CC0-1.0', 'https://creativecommons.org/publicdomain/zero/1.0/')
CCBY = ('CC-BY-4.0', 'https://creativecommons.org/licenses/by/4.0/')

ap = argparse.ArgumentParser()
ap.add_argument('--src-ww2', default='/home/user/ext/StevenACZ_ww2-movie-map/public/audio')
ap.add_argument('--src-ambient', default='/home/user/ext/Muges_ambientsounds')
ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'audio', 'm01'))
args = ap.parse_args()
OUT = os.path.abspath(args.out)


def git_head(path):
    root = os.path.dirname(os.path.dirname(path.rstrip('/'))) if path.endswith('public/audio') else path
    return subprocess.run(['git', '-C', root, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()


WW2_COMMIT = git_head(args.src_ww2)
AMB_COMMIT = git_head(args.src_ambient)
records = []


def emit(cue, name, x, *, loop, title, author, lic, source, via, edits, gain=1.0):
    path = os.path.join(OUT, 'sfx', name)
    if loop and np.abs(x).max() > 0.85:  # loops normalised by RMS can exceed full scale: cap the peak before encoding
        x = x * (0.85 / np.abs(x).max())
    A.write_ogg(path, x)
    for _ in range(4):  # Vorbis can overshoot: make sure the shipped file peaks <= -1 dBFS
        if A.peak_db(A.load_audio(path, sr=SR)) <= -1.0:
            break
        x = x * 10 ** (-0.6 / 20)
        A.write_ogg(path, x)
    # Measure the file that actually ships (decoded back), not the float buffer.
    d = A.load_audio(path, sr=SR)
    rec = {'cue': cue, 'file': 'sfx/' + name, 'loop': loop, 'gain': gain}
    rec.update(A.describe(d))
    rec.update({'title': title, 'author': author, 'license': lic[0], 'licenseUrl': lic[1], 'source': source,
                'via': via, 'edits': edits + ', mono, 44100 Hz, OGG Vorbis q5'})
    rec['bytes'] = os.path.getsize(path)
    records.append(rec)
    print(f"{name:34s} {rec['durationSec']:7.3f}s {rec['channels']}ch peak {rec['peakDbfs']:6.2f} lufs {rec['lufs']:6.1f} {rec['bytes']:8d} B")


def ww2(name):
    return os.path.join(args.src_ww2, name)


def via_ww2(name):
    return f'{WW2_REPO} public/audio/{name} @{WW2_COMMIT}'


def via_amb(name):
    return f'{AMB_REPO} {name} @{AMB_COMMIT}'


def fs(user, sid, slug=None):
    return f'https://freesound.org/people/{user}/sounds/{sid}/'


def onsets(x, sr=SR):
    """Onsets of a burst of separate shots: 1 ms peak envelope -> local maxima above -14 dBFS at least 60 ms apart,
    then walk back from each peak to the last sample that is still below 20 % of that peak (the start of the attack)."""
    b = int(0.001 * sr)
    env = np.array([np.abs(x[i:i + b]).max() for i in range(0, len(x) - b, b)])
    peaks = []
    k = 0
    while k < len(env) - 1:
        if env[k] > 0.2 and env[k] == env[max(k - 25, 0):k + 26].max():
            peaks.append(k)
            k += 60
        else:
            k += 1
    res = []
    for pk in peaks:
        j = pk
        while j > 0 and pk - j < 20 and env[j] > 0.2 * env[pk]:
            j -= 1
        res.append(j * b)
    return res


# ---------------------------------------------------------------- rifle shot (ww2.mp3: shot + M1 clip ping)
x = A.load_audio(ww2('ww2.mp3'), 1)
# Envelope/centroid inspection: the shot runs 0.045-0.27 s; from 0.28 s the spectrum jumps to a 4 kHz+ ping (clip eject).
start = int(np.nonzero(np.abs(x) > 10 ** (-30 / 20))[0][0]) - int(0.001 * SR)
end = int(0.272 * SR)
shot = A.fade(x[start:end], 0.0005, 0.03)
shot = A.normalise_peak(shot, -1.0)
emit('weapon.rifle.shot', 'weapon-rifle-shot.ogg', shot, loop=False, title='Rifle gunshot, one shot',
     author='felix.blume', lic=CC0, source=fs('felix.blume', 710084), via=via_ww2('ww2.mp3'),
     edits=f'only the shot kept ({start / SR:.3f}-{end / SR:.3f} s of the mirrored clip; the M1 Garand clip ping by serøutōnin--deprivəd from 0.28 s dropped), 30 ms fade-out, peak-normalised to -1 dBFS')

# ---------------------------------------------------------------- MG burst + single rounds (sp-gunfire.mp3)
x = A.load_audio(ww2('sp-gunfire.mp3'), 1)
ons = onsets(x)
print('mg onsets (s):', [round(o / SR, 3) for o in ons])
gaps = np.diff(ons) / SR
print('mg gaps (ms): ', [round(g * 1000) for g in gaps])
burst = A.normalise_peak(A.fade(A.trim_silence(x, -60), 0.001, 0.02), -1.0)
emit('weapon.mg.burst', 'weapon-mg-burst.ogg', burst, loop=False, title='Clean Machine Gun Burst', author='qubodup',
     lic=CC0, source=fs('qubodup', 482122), via=via_ww2('sp-gunfire.mp3'), gain=0.8,
     edits='whole burst, trimmed, 20 ms fade-out, peak-normalised to -1 dBFS')
pre = int(0.001 * SR)
n_ons = len(ons)
picks = [3, 6, 9]  # three mid-burst rounds
variants = []
for k in picks:
    a, b = ons[k] - pre, ons[k + 1] - pre
    variants.append((a, b, A.fade(x[a:b], 0.0005, 0.02), f'round {k + 1} of {n_ons} ({a / SR:.3f}-{b / SR:.3f} s), onset to just before the next onset, 20 ms fade-out'))
a = ons[-1] - pre
last = A.trim_silence(x[a:], -60)
variants.append((a, len(x), A.fade(last, 0.0005, 0.03), f'last round ({a / SR:.3f} s to end) with its full natural tail, 30 ms fade-out'))
for i, (a, b, seg, desc) in enumerate(variants, 1):
    emit('weapon.mg.round', f'weapon-mg-round-{i}.ogg', A.normalise_peak(seg, -1.0), loop=False,
         title='Clean Machine Gun Burst (single round)', author='qubodup', lic=CC0, source=fs('qubodup', 482122),
         via=via_ww2('sp-gunfire.mp3'), gain=0.9, edits=desc + ', peak-normalised to -1 dBFS')

# ---------------------------------------------------------------- explosions
# sp-boom (3.4 s) and sp-blast (3.1 s, credited as filtered/compressed) are two edits of the same recording: keep sp-boom only.
x = A.load_audio(ww2('sp-boom.mp3'), 1)
emit('explosion.near', 'explosion-near.ogg', A.normalise_peak(A.fade(A.trim_silence(x, -70), 0.0005, 0.15), -1.0),
     loop=False, title='Nearby explosion with debris', author='juskiddink', lic=CCBY, source=fs('juskiddink', 108641),
     via=via_ww2('sp-boom.mp3'), edits='mirrored edit sp-boom.mp3 (longer, less filtered than sp-blast.mp3) trimmed, 150 ms fade-out, peak-normalised to -1 dBFS')
x = A.load_audio(ww2('sp-far.mp3'), 1)
emit('explosion.distant', 'explosion-distant.ogg', A.normalise_peak(A.fade(A.trim_silence(x, -70), 0.0005, 0.4), -1.0),
     loop=False, title='Quarry blasting', author='juskiddink', lic=CCBY, source=fs('juskiddink', 82682),
     via=via_ww2('sp-far.mp3'), edits='trimmed, 400 ms fade-out, peak-normalised to -1 dBFS')
x = A.load_audio(ww2('sp-rumble.mp3'), 1)
emit('explosion.low', 'explosion-low.ogg', A.normalise_peak(A.fade(A.trim_silence(x, -70), 0.001, 0.5), -1.0),
     loop=False, title='Large, Low Boom', author='duckduckpony', lic=CCBY, source=fs('duckduckpony', 130973),
     via=via_ww2('sp-rumble.mp3'), edits='trimmed, 500 ms fade-out, peak-normalised to -1 dBFS')
x = A.load_audio(ww2('sp-blast-tail.mp3'), 1)
emit('explosion.tail', 'explosion-tail.ogg', A.normalise_peak(A.fade(x, 0.15, 3.0), -1.0), loop=False, gain=0.5,
     title='R29-03-Long Rumble for Earthquake or Explosion', author='craigsmith', lic=CC0, source=fs('craigsmith', 483287),
     via=via_ww2('sp-blast-tail.mp3'), edits='full 16 s mirrored excerpt, 150 ms fade-in, 3 s fade-out, peak-normalised to -1 dBFS (suggested engine gain 0.5: it is a sustained rumble)')

# ---------------------------------------------------------------- aircraft
x = A.load_audio(ww2('sp-drone.mp3'), 1)
XF = int(1.5 * SR)
loop = A.loop_crossfade(x, XF)
loop = A.normalise_rms(loop, -20.0)
emit('aircraft.formation.loop', 'aircraft-formation-loop.ogg', loop, loop=True, title='Bombers Fly in Formation',
     author='craigsmith', lic=CC0, source=fs('craigsmith', 437892), via=via_ww2('sp-drone.mp3'),
     edits='tail 1.5 s equal-power crossfaded into the head for a seamless loop (loop length = source - 1.5 s), RMS-normalised to -20 dBFS')
x = A.load_audio(ww2('sp-merlin-1940.mp3'), 1)
emit('aircraft.flyby', 'aircraft-flyby.ogg', A.normalise_peak(A.fade(A.trim_silence(x, -48), 0.02, 0.4), -1.0), loop=False,
     title='Spitfire flyby', author='Cheeseheadburger', lic=CCBY, source=fs('Cheeseheadburger', 170477),
     via=via_ww2('sp-merlin-1940.mp3'), edits='trimmed at -48 dB, 20 ms fade-in, 400 ms fade-out, peak-normalised to -1 dBFS (Merlin engine, used as a stand-in for a Ju 87 pass)')
x = A.load_audio(ww2('sp-heavy-prop.mp3'), 1)
# Per CREDITS.md the mirrored file is a 14 s loop region with a 2 s internal crossfade and 0.2 s margins.
core = x[int(0.2 * SR):int(14.2 * SR)]
rep = A.seam_report(core)
print('heavy-prop seam (as shipped by mirror, 0.2-14.2 s):', rep)
# Re-seam it ourselves from the margins (0.2 s each side) with a short crossfade: continue the end into the head.
xf = int(0.2 * SR)
seg = x[int(0.0 * SR):int(14.4 * SR)]
loop = A.loop_crossfade(seg, xf)
rep2 = A.seam_report(loop)
print('heavy-prop seam after our 0.2 s crossfade:', rep2)
emit('aircraft.heavy.loop', 'aircraft-heavy-loop.ogg', A.normalise_rms(loop, -20.0), loop=True, title='b24.wav (B-24 engines)',
     author='relwin', lic=CCBY, source=fs('relwin', 391516), via=via_ww2('sp-heavy-prop.mp3'),
     edits='mirrored 14 s loop (already crossfaded by its editor; B-24 used as a stand-in for a heavy piston plane); 0.2 s equal-power crossfade of the margins re-applied at the seam, RMS-normalised to -20 dBFS')

# ---------------------------------------------------------------- ambience loops
def stable_window(x, length, step=1.0, block=0.5):
    """Start index of the window of `length` samples whose block-RMS (dB) varies least (deterministic scan)."""
    b = int(block * SR)
    n = len(x) // b
    db = np.array([A.rms_db(x[i * b:(i + 1) * b]) for i in range(n)])
    best, bi = 1e9, 0
    w = int(length / b)
    for s in range(0, n - w, int(step / block)):
        v = db[s:s + w].std()
        if v < best:
            best, bi = v, s
    return bi * b


x = A.load_audio(os.path.join(args.src_ambient, 'wind.ogg'), 1)
L, XFw = 40 * SR, int(4 * SR)
s = stable_window(x, L + XFw)
seg = x[s:s + L + XFw]
loop = A.normalise_rms(A.loop_crossfade(seg, XFw), -20.0)
emit('ambience.wind.loop', 'ambience-wind-loop.ogg', loop, loop=True, title='Wind', author='felix.blume', lic=CC0,
     source=fs('felix.blume', 139337), via=via_amb('wind.ogg'),
     edits=f'most stable 44 s window ({s / SR:.1f}-{(s + L + XFw) / SR:.1f} s, stereo mixed to mono); last 4 s equal-power crossfaded into the head for a seamless 40 s loop, RMS-normalised to -20 dBFS')
x = A.load_audio(os.path.join(args.src_ambient, 'fireplace.ogg'), 1)
L, XFf = 30 * SR, int(2 * SR)
s = stable_window(x, L + XFf)
seg = x[s:s + L + XFf]
loop = A.normalise_rms(A.loop_crossfade(seg, XFf), -19.0)
loop = A.soft_limit(loop, 0.3)  # crackle peaks are ~20 dB above the RMS
emit('fire.loop', 'fire-loop.ogg', loop, loop=True, title='Fireplace', author='inchadney', lic=CC0,
     source=fs('inchadney', 132534), via=via_amb('fireplace.ogg'),
     edits=f'most stable 32 s window ({s / SR:.1f}-{(s + L + XFf) / SR:.1f} s, stereo mixed to mono); last 2 s equal-power crossfaded into the head for a seamless 30 s loop, RMS-normalised, tanh soft-limited above 0.3 full scale to tame crackle peaks (about -21 dBFS RMS)')

M.update_manifest(OUT, 'sfx/', records)
