"""Read/merge/write assets/audio/m01/manifest.json. Each build script owns the entries whose `file` starts with its prefix."""
import json
import os

TOP = {
    'author': 'Various recordists (see files[]); music composed for COD-guerra',
    'license': 'CC0-1.0 and CC-BY-4.0 per file (see files[] and ASSET_CREDITS.md)',
    'units': 'audio: 44100 Hz (see files[].sampleRate); loudness in dBFS/LUFS per file',
    'version': 1,
}
ORDER = ['cue', 'file', 'loop', 'gain', 'sampleRate', 'channels', 'durationSec', 'peakDbfs', 'rmsDbfs', 'lufs',
         'loudnessMethod', 'bytes', 'title', 'author', 'license', 'licenseUrl', 'source', 'via', 'sources', 'edits']


def update_manifest(out_dir, prefix, records):
    path = os.path.join(out_dir, 'manifest.json')
    data = {}
    if os.path.exists(path):
        with open(path, encoding='utf8') as f:
            data = json.load(f)
    files = [r for r in data.get('files', []) if not r['file'].startswith(prefix)]
    files += [{k: r[k] for k in ORDER if k in r} for r in records]
    files.sort(key=lambda r: (not r['file'].startswith('sfx/'), r['cue'], r['file']))
    data = dict(TOP)
    data['files'] = files
    with open(path, 'w', encoding='utf8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print('manifest updated:', path, len(files), 'entries')
