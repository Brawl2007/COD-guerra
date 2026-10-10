"""Shared helpers for the offline audio pipeline (numpy + ffmpeg only, deterministic).

Used by build-m01-sfx.py and render-m01-music.py. Nothing here is random.
Run with `python3 -I` so the working directory cannot shadow imports.
"""
import json
import re
import subprocess
import tempfile
import os
import numpy as np

SR = 44100


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True)


def load_audio(path, channels=None, sr=SR, start=None, duration=None):
    """Decode any ffmpeg-readable file to float32 array shaped (n,) for mono or (n, ch)."""
    cmd = ['ffmpeg', '-v', 'error']
    if start is not None:
        cmd += ['-ss', str(start)]
    if duration is not None:
        cmd += ['-t', str(duration)]
    cmd += ['-i', path]
    if channels:
        cmd += ['-ac', str(channels)]
    cmd += ['-ar', str(sr), '-f', 'f32le', '-']
    raw = run(cmd).stdout
    x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    if channels is None:
        ch = int(run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
                      'stream=channels', '-of', 'csv=p=0', path]).stdout.decode().strip())
    else:
        ch = channels
    return x if ch == 1 else x.reshape(-1, ch)


def write_ogg(path, x, sr=SR, quality=5):
    """Encode float array (n,) or (n, ch) to OGG Vorbis through a temporary f32le pipe."""
    x = np.asarray(x, dtype=np.float64)
    ch = 1 if x.ndim == 1 else x.shape[1]
    x = np.clip(x, -1.0, 1.0)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', str(ch), '-i', '-',
           '-c:a', 'libvorbis', '-q:a', str(quality), '-ar', str(sr), '-map_metadata', '-1',
           '-fflags', '+bitexact', '-flags:a', '+bitexact', path]
    subprocess.run(cmd, input=x.astype('<f4').tobytes(), check=True, capture_output=True)


def peak_db(x):
    return 20 * np.log10(max(np.abs(x).max(), 1e-12))


def rms_db(x):
    return 10 * np.log10(max((np.asarray(x) ** 2).mean(), 1e-14))


def normalise_peak(x, target_db=-1.0):
    return x * (10 ** (target_db / 20) / max(np.abs(x).max(), 1e-12))


def normalise_rms(x, target_db=-20.0):
    return x * (10 ** (target_db / 20) / np.sqrt(max((x ** 2).mean(), 1e-14)))


def fade(x, fade_in=0.0, fade_out=0.0, sr=SR, curve='cos'):
    x = x.copy()
    n = len(x)
    ni, no = min(int(fade_in * sr), n), min(int(fade_out * sr), n)
    if ni > 1:
        r = np.linspace(0, 1, ni)
        g = np.sin(r * np.pi / 2) if curve == 'cos' else r
        x[:ni] *= g[:, None] if x.ndim == 2 else g
    if no > 1:
        r = np.linspace(1, 0, no)
        g = np.sin(r * np.pi / 2) if curve == 'cos' else r
        x[n - no:] *= g[:, None] if x.ndim == 2 else g
    return x


def trim_silence(x, threshold_db=-50.0, sr=SR, keep_head=0.002, keep_tail=0.0):
    """Trim leading/trailing samples below threshold_db relative to the peak (envelope on 5 ms blocks)."""
    m = np.abs(x) if x.ndim == 1 else np.abs(x).max(axis=1)
    thr = m.max() * 10 ** (threshold_db / 20)
    idx = np.nonzero(m > thr)[0]
    a = max(int(idx[0] - keep_head * sr), 0)
    b = min(int(idx[-1] + 1 + keep_tail * sr), len(x))
    return x[a:b]


def loop_crossfade(seg, xfade_samples):
    """Make a seamless loop from seg: output length = len(seg) - xfade. The continuation of the end
    (last xfade samples of seg) is blended into the head with an equal-power crossfade, so output[-1] -> output[0]
    continues the source waveform. Works for (n,) and (n, ch)."""
    n = len(seg)
    L = n - xfade_samples
    out = seg[:L].copy()
    t = np.linspace(0, np.pi / 2, xfade_samples)
    fin, fout = np.sin(t), np.cos(t)
    if seg.ndim == 2:
        fin, fout = fin[:, None], fout[:, None]
    out[:xfade_samples] = seg[:xfade_samples] * fin + seg[L:] * fout
    return out


def fold_tail(x, length):
    """x is longer than `length`: fold the overflow back onto the head with an equal-power-free overlap-add
    (for already-decayed tails a plain add is the physically right thing: reverb tails wrap around)."""
    out = x[:length].copy()
    over = x[length:]
    out[:len(over)] += over
    return out


def seam_report(x, sr=SR, win=0.02):
    """Compare the jump at the wrap point to the typical sample-to-sample difference and the RMS either side."""
    m = x if x.ndim == 1 else x.mean(axis=1)
    jump = abs(m[0] - m[-1])
    typical = np.median(np.abs(np.diff(m))) + 1e-12
    p95 = np.percentile(np.abs(np.diff(m)), 99)
    w = int(win * sr)
    return {'jump': float(jump), 'typicalDiff': float(typical), 'p99Diff': float(p95),
            'rmsTailDb': float(rms_db(m[-w:])), 'rmsHeadDb': float(rms_db(m[:w]))}


def biquad_lowpass(x, fc, q=0.7071, sr=SR):
    """RBJ biquad low-pass (direct form I) in plain numpy loops; x 1-D."""
    w0 = 2 * np.pi * fc / sr
    alpha = np.sin(w0) / (2 * q)
    cw = np.cos(w0)
    b0, b1, b2 = (1 - cw) / 2, 1 - cw, (1 - cw) / 2
    a0, a1, a2 = 1 + alpha, -2 * cw, 1 - alpha
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.zeros(len(x))
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        xi = x[i]
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        y[i] = yi
        x2, x1 = x1, xi
        y2, y1 = y1, yi
    return y


def one_pole_lowpass(x, fc, sr=SR):
    a = np.exp(-2 * np.pi * fc / sr)
    y = np.zeros(len(x))
    s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s
        y[i] = s
    return y


def resample_ratio(x, ratio):
    """Play x back `ratio` times faster (pitch up by ratio) using Catmull-Rom cubic interpolation. 1-D or (n, ch)."""
    n = len(x)
    m = int((n - 3) / ratio)
    pos = np.arange(m) * ratio + 1.0
    i = pos.astype(int)
    f = pos - i
    if x.ndim == 2:
        f = f[:, None]
    p0, p1, p2, p3 = x[i - 1], x[i], x[i + 1], x[i + 2]
    return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)))


def semitone_ratio(st):
    return 2 ** (st / 12.0)


def loudness(path_or_x, x=None, sr=SR):
    """Integrated loudness estimate. Uses ffmpeg's ebur128 (BS.1770, gated) when the clip is >= 1 s,
    otherwise a plain mean-square estimate (-0.691 + 10 log10 ms, unweighted). Returns (lufs, method)."""
    if x is None:
        raise ValueError('x required')
    if len(x) / sr >= 1.0:
        ch = 1 if x.ndim == 1 else x.shape[1]
        cmd = ['ffmpeg', '-nostats', '-hide_banner', '-f', 'f32le', '-ar', str(sr), '-ac', str(ch), '-i', '-',
               '-af', 'ebur128=peak=none', '-f', 'null', '-']
        r = subprocess.run(cmd, input=np.clip(x, -1, 1).astype('<f4').tobytes(), capture_output=True)
        txt = r.stderr.decode(errors='replace')
        m = re.findall(r'Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS', txt)
        if m:
            return float(m[-1]), 'ffmpeg ebur128 integrated (ITU-R BS.1770, gated)'
    ms = (np.asarray(x) ** 2).mean()
    return float(-0.691 + 10 * np.log10(max(ms, 1e-14))), 'unweighted mean-square estimate (-0.691 + 10 log10 ms), clip < 1 s'


def describe(x, sr=SR):
    ch = 1 if x.ndim == 1 else x.shape[1]
    lufs, method = loudness(None, x, sr)
    return {
        'sampleRate': sr, 'channels': ch, 'durationSec': round(len(x) / sr, 3),
        'peakDbfs': round(float(peak_db(x)), 2), 'rmsDbfs': round(float(rms_db(x)), 2),
        'lufs': round(lufs, 1), 'loudnessMethod': method,
    }


def soft_limit(x, knee=0.3):
    """Smooth tanh limiter: identity below `knee`, asymptote at 1.0 above it."""
    a = np.abs(x)
    over = a > knee
    y = x.copy()
    y[over] = np.sign(x[over]) * (knee + (1 - knee) * np.tanh((a[over] - knee) / (1 - knee)))
    return y
