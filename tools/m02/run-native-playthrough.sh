#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
run_root=$(mktemp -d /tmp/cod-guerra-m02.XXXXXX)
output_dir=${M02_PLAY_OUT:-$run_root/evidence}
mkdir -p "$output_dir" "$run_root/COD-guerra/tools/m02" "$run_root/COD-guerra/src/world" "$run_root/COD-guerra/src/game"
npm run build > "$output_dir/build.log" 2>&1
cp -a dist/. "$run_root/COD-guerra/"
cp tools/m02/mission-pilot.mjs "$run_root/COD-guerra/tools/m02/"
cp src/world/spatial.js src/world/m01-mg34-prone-geometry.json "$run_root/COD-guerra/src/world/"
cp src/config.js "$run_root/COD-guerra/src/"
cp src/game/m02-player-actions.js "$run_root/COD-guerra/src/game/"
python3 -m http.server 4291 --bind 127.0.0.1 --directory "$run_root" > "$output_dir/server.log" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for attempt in {1..50}; do
 if curl --fail --silent http://127.0.0.1:4291/COD-guerra/m02.html -o /dev/null; then break; fi
 sleep .2
done
M02_BUILD_SHA="$(git rev-parse HEAD)" M02_PLAY_OUT="$output_dir" M02_BASE_URL=http://127.0.0.1:4291/COD-guerra node tools/m02/browser-mission-playthrough.mjs
