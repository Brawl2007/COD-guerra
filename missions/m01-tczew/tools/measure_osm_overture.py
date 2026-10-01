#!/usr/bin/env python3
"""Mede a geometria ATUAL das pontes de Tczew, pilares, rio, estação e dique a partir da Overture Maps
(dados derivados do OpenStreetMap, licença ODbL) e, opcionalmente, alturas do Copernicus DEM GLO-30.

Não é mapa de 1939: serve para fixar orientação, alinhamento e distâncias de estruturas que existem desde
1857/1891/1912. O que mudou depois da guerra fica marcado em measurements.json.

Uso:
    pip install pyarrow shapely          # obrigatório
    pip install rasterio                 # opcional, para o perfil de alturas (--dem)
    python3 missions/m01-tczew/tools/measure_osm_overture.py [--dem]

Lê só os row groups Parquet que cobrem Tczew (pedidos HTTP com Range), com cache em tools/.cache/.
Respeita HTTPS_PROXY; em ambientes com proxy TLS, defina SSL_CERT_FILE para o bundle de CA.
"""
import io, json, math, os, re, ssl, sys, time, urllib.parse, urllib.request
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import shapely
from shapely.geometry import LineString, box
from shapely.ops import substring

RELEASE = '2026-09-23.1'
BUCKET = 'https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com'
BBOX = (18.76, 54.075, 18.84, 54.11)  # lon/lat: pontes, estação, Lisewo
HERE = Path(__file__).resolve().parent
CACHE = HERE / '.cache'
OUT = HERE.parent / 'measurements.json'
THEMES = {
    'segment': ('transportation', 'segment', ['id', 'names', 'subtype', 'class', 'road_flags', 'rail_flags', 'geometry', 'bbox']),
    'infrastructure': ('base', 'infrastructure', ['id', 'names', 'subtype', 'class', 'geometry', 'bbox']),
    'water': ('base', 'water', ['id', 'names', 'subtype', 'class', 'geometry', 'bbox']),
}

ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE'))
opener = urllib.request.build_opener(urllib.request.ProxyHandler(), urllib.request.HTTPSHandler(context=ctx))


def get(url, rng=None, tries=6):
    for attempt in range(tries):
        try:
            headers = {'Range': f'bytes={rng[0]}-{rng[1]}'} if rng else {}
            with opener.open(urllib.request.Request(url, headers=headers), timeout=120) as r:
                data = r.read()
            if rng and len(data) != rng[1] - rng[0] + 1:
                raise IOError('leitura incompleta')
            return data
        except Exception:
            if attempt == tries - 1:
                raise
            time.sleep(1.5 * 2 ** attempt)


def list_keys(prefix):
    keys, token = [], None
    while True:
        url = f'{BUCKET}/?list-type=2&prefix={prefix}' + (f'&continuation-token={urllib.parse.quote(token)}' if token else '')
        body = get(url).decode()
        keys += [(k, int(s)) for k, s in re.findall(r'<Key>([^<]+)</Key>.*?<Size>(\d+)</Size>', body, re.S)]
        m = re.search(r'<NextContinuationToken>([^<]+)</NextContinuationToken>', body)
        if not m:
            return keys
        token = m.group(1)


class RangeFile(io.RawIOBase):
    """Arquivo remoto só-leitura; cada read() vira um pedido HTTP Range."""
    def __init__(self, key, size):
        self.url, self.size, self.pos = f'{BUCKET}/{key}', size, 0
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos
    def read(self, n=-1):
        n = self.size - self.pos if n < 0 else n
        if n == 0 or self.pos >= self.size:
            return b''
        data = get(self.url, (self.pos, min(self.size, self.pos + n) - 1))
        self.pos += len(data)
        return data
    def readinto(self, b):
        d = self.read(len(b)); b[:len(d)] = d; return len(d)


def intersects(bb):
    return bb['xmin'] <= BBOX[2] and bb['xmax'] >= BBOX[0] and bb['ymin'] <= BBOX[3] and bb['ymax'] >= BBOX[1]


def load_theme(name):
    theme, kind, cols = THEMES[name]
    cached = CACHE / f'{RELEASE}-{name}.parquet'
    if cached.exists():
        return pq.read_table(cached).to_pylist()
    from concurrent.futures import ThreadPoolExecutor
    def scan(key_size):
        key, size = key_size
        pf = pq.ParquetFile(RangeFile(key, size))
        md = pf.metadata
        paths = [md.schema.column(i).path for i in range(md.num_columns)]
        idx = {c: paths.index(f'bbox.{c}') for c in ('xmin', 'xmax', 'ymin', 'ymax')}
        hits = []
        for rg in range(md.num_row_groups):
            st = {c: md.row_group(rg).column(i).statistics for c, i in idx.items()}
            if all(s is not None and s.has_min_max for s in st.values()) and intersects(
                    {'xmin': st['xmin'].min, 'xmax': st['xmax'].max, 'ymin': st['ymin'].min, 'ymax': st['ymax'].max}):
                hits.append(rg)
        if not hits:
            return None
        t = pf.read_row_groups(hits, columns=cols)
        keep = [i for i, bb in enumerate(t.column('bbox').to_pylist()) if intersects(bb)]
        return t.take(pa.array(keep, type=pa.int64()))
    keys = list_keys(f'release/{RELEASE}/theme={theme}/type={kind}/')
    with ThreadPoolExecutor(12) as ex:
        tables = [t for t in ex.map(scan, keys) if t is not None and t.num_rows]
    table = pa.concat_tables(tables, promote_options='default')
    CACHE.mkdir(exist_ok=True)
    pq.write_table(table, cached)
    return table.to_pylist()


def flags(row, key):
    return [(f['values'] or [], f['between'] or [0, 1]) for f in (row.get(key) or [])]


def main():
    segments, infra, water = (load_theme(n) for n in ('segment', 'infrastructure', 'water'))

    # 1) Tabuleiros atuais marcados como ponte, cruzando o Vístula em Tczew.
    decks = {'rail': [], 'road': []}
    for r in segments:
        g = shapely.from_wkb(r['geometry'])
        for key in ('rail_flags', 'road_flags'):
            for values, (a, b) in flags(r, key):
                if 'is_bridge' not in values:
                    continue
                sub = substring(g, a, b, normalized=True)
                if sub.geom_type != 'LineString' or not (18.79 < sub.bounds[0] < 18.81 and sub.bounds[2] > 18.815):
                    continue
                decks[r['subtype']].append(sub)
    rail_w = min(min(c[0] for c in d.coords) for d in decks['rail'])
    lat0 = sum(sum(c[1] for c in d.coords) / len(d.coords) for d in decks['rail']) / len(decks['rail'])

    # 2) Pilares (bridge_support) de cada ponte; origem = pilar/encontro mais a oeste da ferroviária.
    road_lat = sum(sum(c[1] for c in d.coords) / len(d.coords) for d in decks['road']) / len(decks['road'])
    supports = {'rail': [], 'road': []}
    for r in infra:
        if r['class'] != 'bridge_support':
            continue
        c = shapely.from_wkb(r['geometry']).centroid
        if not 18.80 < c.x < 18.83:
            continue
        which = 'rail' if abs(c.y - lat0) < abs(c.y - road_lat) else 'road'
        if min(abs(c.y - lat0), abs(c.y - road_lat)) * 111230 < 20:
            supports[which].append((c.x, c.y))
    lon0 = min(s[0] for s in supports['rail'])
    KX, KZ = 111320 * math.cos(math.radians(lat0)), 111230.0

    # Azimute do eixo ferroviário (média das vias), para alinhar +X ao eixo das pontes.
    ends = [sorted(d.coords) for d in decks['rail']]
    w = (sum(e[0][0] for e in ends) / len(ends), sum(e[0][1] for e in ends) / len(ends))
    e = (sum(e[-1][0] for e in ends) / len(ends), sum(e[-1][1] for e in ends) / len(ends))
    dx, dz = (e[0] - w[0]) * KX, -(e[1] - w[1]) * KZ
    azimuth = (math.degrees(math.atan2(dx, -dz)) + 360) % 360
    rot = math.radians(azimuth - 90)  # gira para o eixo das pontes ficar em +X

    def game(lon, lat):
        x, z = (lon - lon0) * KX, -(lat - lat0) * KZ
        return round(x * math.cos(rot) - z * math.sin(rot), 1), round(x * math.sin(rot) + z * math.cos(rot), 1)

    road_azimuths = []
    for d in decks['road']:
        (a_lon, a_lat), (b_lon, b_lat) = sorted(d.coords)[0], sorted(d.coords)[-1]
        road_azimuths.append((math.degrees(math.atan2((b_lon - a_lon) * KX, (b_lat - a_lat) * KZ)) + 360) % 360)

    support_x = {k: sorted(game(*s)[0] for s in v) for k, v in supports.items()}
    sep = round(game(e[0], road_lat)[1] - game(e[0], lat0)[1], 1)

    # 3) Rio ao longo dos dois eixos.
    river = {}
    for label, lat in (('rail', lat0), ('road', road_lat)):
        axis = LineString([(18.79, lat), (18.84, lat)])
        xs = []
        for r in water:
            g = shapely.from_wkb(r['geometry'])
            if r['subtype'] == 'river' and g.geom_type in ('Polygon', 'MultiPolygon') and g.intersects(axis):
                inter = g.intersection(axis)
                for part in getattr(inter, 'geoms', [inter]):
                    xs.append(sorted(game(*c)[0] for c in part.coords))
        river[label] = [[p[0], p[-1]] for p in xs]

    # 4) Estação atual, parada de Lisewo, rua 1 Maja (local da estação de 1939) e estradas N–S na margem leste.
    points = {}
    for r in infra:
        n = (r['names'] or {}).get('primary')
        if r['class'] in ('railway_station', 'railway_halt') and n in ('Tczew', 'Lisewo'):
            p = shapely.from_wkb(r['geometry'])
            points[n] = game(p.x, p.y)
    maja, east_ns = [], []
    for r in segments:
        if r['subtype'] != 'road':
            continue
        g = shapely.from_wkb(r['geometry'])
        n = (r['names'] or {}).get('primary') or ''
        pts = [game(*c) for c in g.coords]
        if n == '1 Maja':
            maja += pts
        xs, zs = [p[0] for p in pts], [p[1] for p in pts]
        if min(xs) > 1000 and max(xs) < 1150 and max(zs) - min(zs) > 250 and max(xs) - min(xs) < 60:
            east_ns.append([min(xs), max(xs)])

    out = {
        'schemaVersion': 1,
        'generatedBy': 'missions/m01-tczew/tools/measure_osm_overture.py',
        'source': {
            'dataset': f'Overture Maps Foundation, release {RELEASE} (themes transportation/segment, base/infrastructure, base/water)',
            'attribution': '© OpenStreetMap contributors (ODbL) via Overture Maps Foundation',
            'note': 'Geometria ATUAL (2026). Pilares e eixos das pontes existem desde 1857/1891/1912; mudanças pós-guerra marcadas em map-layout.json.',
        },
        'frame': {
            'originLonLat': [round(lon0, 6), round(lat0, 6)],
            'origin': 'pilar/encontro mais a oeste da ponte ferroviária',
            'x': 'ao longo do eixo da ponte ferroviária, + para leste', 'z': '+ para sul (perpendicular)',
            'approximation': 'projeção local equiretangular; erro < 0,3 % no raio de 2 km',
        },
        'railBridge': {'azimuthDeg': round(azimuth, 2), 'deckEndsX': sorted({round(game(*sorted(d.coords)[0])[0], 1) for d in decks['rail']} | {round(game(*sorted(d.coords)[-1])[0], 1) for d in decks['rail']}), 'supportsX': support_x['rail']},
        'roadBridge': {'azimuthDeg': [round(a, 2) for a in road_azimuths], 'supportsX': support_x['road'], 'axisOffsetZ': sep},
        'river': river,
        'stationModern': points.get('Tczew'),
        'lisewoHalt': points.get('Lisewo'),
        'street1MajaExtent': {'minX': min(p[0] for p in maja), 'maxX': max(p[0] for p in maja), 'minZ': min(p[1] for p in maja), 'maxZ': max(p[1] for p in maja)} if maja else None,
        'eastBankNorthSouthRoadsX': sorted(east_ns),
    }
    if '--dem' in sys.argv:
        out['demProfile'] = dem_profile(lon0, lat0, KX, rot)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(out, ensure_ascii=False, indent=2))


def dem_profile(lon0, lat0, KX, rot):
    import rasterio
    from rasterio.windows import from_bounds
    url = '/vsicurl/https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N54_00_E018_00_DEM/Copernicus_DSM_COG_10_N54_00_E018_00_DEM.tif'
    with rasterio.open(url) as ds:
        win = from_bounds(18.78, 54.080, 18.84, 54.105, ds.transform)
        a, t = ds.read(1, window=win), ds.window_transform(win)
    def h(lon, lat):
        r, c = rasterio.transform.rowcol(t, lon, lat)
        return round(float(a[r, c]), 1)
    rows = []
    for x in range(-600, 1301, 100):
        lon = lon0 + x / KX
        rows.append({'x': x, 'railAxis': h(lon, lat0), 'south100m': h(lon, lat0 - 100 / 111230)})
    return {'dataset': 'Copernicus DEM GLO-30 (DSM, 30 m; inclui estruturas e vegetação)', 'heightsM': 'acima do geoide EGM2008', 'rows': rows}


if __name__ == '__main__':
    main()
