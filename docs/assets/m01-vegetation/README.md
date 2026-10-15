# Original M01 vegetation kit

The kit is original procedural artwork by COD-guerra contributors, dedicated under [CC0 1.0](../../../assets/models/provisional/m01/vegetation/LICENSE.md). No external textures, fonts or commercial game assets are used. Geometry is in metres, +Y up, X/Z ground, rooted at the origin.

[manifest.json](../../../assets/models/provisional/m01/vegetation/manifest.json) records the exact binary/atlas SHA-256, bytes, indexed triangles and accessor bounds of all 43 models. The production GLB contains eight distinct tree species × four tiers, six shrubs and five ground forms. LOD0 trees have at most 302 triangles, LOD2 at most 44; each crossed impostor has eight triangles. Impostor alpha is rasterized from that species' actual near triangles and foliage alpha, retaining the trunk and full crown silhouette. The eight identities are poplar, willow, oak, birch, lime, pine, pollard and snag. Shrubs are hazel, elder, bramble, broom, dry and dead. Ground forms are meadow, dry, tall, weed and reed.

The one shared embedded 512×512 RGBA8 alpha texture occupies 1,048,576 decoded bytes. Its complete mip chain adds 349,524 bytes. The separate PNG is a reproducibility artifact; production does not load a second copy. The runtime borrows the existing T09 bark input only for the exact physical trunk receiver owner. This borrowed texture is outside the authored alpha-atlas accounting.

Reproduce and independently check the kit:

```sh
node tools/assets/m01-vegetation/build.mjs
node tools/assets/m01-vegetation/build.mjs --check
node --test tests/m01-vegetation-glb.test.js
npx vite build --config tools/assets/m01-vegetation/viewer-config.mjs
CHROME_EXECUTABLE=/usr/bin/chromium npx playwright test --config tools/verification/m01-vegetation-v2-kit.config.mjs
```

The gallery captures the actual GLB with native alpha and indexed geometry, at a common useful viewing scale per family. Tree columns are LOD0, LOD1, LOD2 and crossed impostor, left to right. These are kit views; production rendering and resource histories are recorded separately.

| Family | Actual gallery |
| --- | --- |
| Poplar | [Four tiers](captures/poplar-actual-kit.png) |
| Willow | [Four tiers](captures/willow-actual-kit.png) |
| Oak | [Four tiers](captures/oak-actual-kit.png) |
| Birch | [Four tiers](captures/birch-actual-kit.png) |
| Lime | [Four tiers](captures/lime-actual-kit.png) |
| Pine | [Four tiers](captures/pine-actual-kit.png) |
| Pollard | [Four tiers](captures/pollard-actual-kit.png) |
| Snag | [Four tiers](captures/snag-actual-kit.png) |
| Shrubs | [Six forms](captures/shrubs-actual-kit.png) |
| Ground | [Grass and reeds](captures/ground-actual-kit.png) |

[Actual viewer counters](captures/actual-kit-counters.json) accompany the PNGs. Every card has an explicit `_WIND` attribute anchored to zero at its base; production wind follows the mission clock.
