# Original M01 field structure kit

Generate with `node tools/assets/m01-field-structures/build.mjs`; verify disk bytes with `--check`. No downloaded meshes, textures or npm generator dependencies. The original project's mesh and GLB writer helpers are reused read-only from `m01-props/src/`. Tiny NORMAL values below 1e-12 are canonicalized to zero only for this kit, before export; positions, indices and colours remain strict.

Run `npm run dev -- --port 5183`, then open `/COD-guerra/tools/assets/m01-field-structures/viewer.html`. The gallery is an isolated well-lit inspection of the actual GLBs; it does not alter runtime lighting. `FIELD_GALLERY_URL=http://127.0.0.1:5183/COD-guerra/tools/assets/m01-field-structures/viewer.html CHROME_EXECUTABLE=/usr/bin/chromium node tools/assets/m01-field-structures/capture.mjs` captures all 15 variants after a drawn frame. `FIELD_GALLERY_OUT` selects the output directory.

Dimensions, collider mapping, budgets and runtime limits: [asset report](../../../docs/assets/m01-field-structures/README.md). The browser/gallery CI config uses a source server and the shared `ci.yml` verifies the production build separately. Local final production verification uses `npx playwright test tests/browser/m01-field-structures.spec.js` after the build.
