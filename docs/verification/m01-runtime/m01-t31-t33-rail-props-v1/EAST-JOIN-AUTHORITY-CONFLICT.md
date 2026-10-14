**RESOLVED** on accepted source6878d01; the following records the historical authority investigation and its final renderer-only resolution.

# East join authority conflict — targeted fix attempt 1

The original endpoint assumptions and fake support fixture were incorrect. The immutable LOD0 bridge GLB root contains ten `m01.supportsX` entries:

`[0,140.9,270.2,401.1,531.7,662.3,793.8,878.9,961.7,1049.2]`.

The actual last support is `rail_support_09`, global x=1049.2. Existing bridge approach presentation ends at local x=9, hence global x=1058.2, with rail top +0.012 m, centres ±2 m and half head-centre spacing 0.7175 m. Its existing stone floor ends at local x=18, hence global x=1067.2, with top approximately -0.35 m. The actual west ramp ends at 140.9−129−1.5=10.4 m, rather than the previously assumed 24.5 m. The focused test fixture now parses the real GLB metadata; the exact production-terrain raycast uses this corrected west profile and passes.

A proposed east grade from x=1067.2 to x=1117.2 conflicts with protected train authority:

- `src/render/m01-locomotive.js` declares `LOCOMOTIVE_PLACEMENT.position=[1075,0,-2.5]`, rotation Y=π/2, with loaded art offset y=-0.82 m.
- `src/render/m01-train-wagons.js` declares 65 wagons starting at x=1090, at 9.1 m intervals. The first wagon is **1090, not 1130**.
- The actual accepted locomotive LOD0 GLB's low wheel-rim vertices (material `worn_steel_rods_rims`, local y<0.05 m) span local z=-6.770350933..7.600350857. With the protected anchor and rotation these lie at world x=1068.229649067..1082.600350857.

Keeping the rail above the existing floor until x=1067.2, then matching the protected first locomotive wheel height -0.82 m by x≈1068.23, requires a drop of 0.832 m in approximately 1.03 m: roughly **80.8% grade**. A credible grade near 2% cannot satisfy the existing floor, fixed train art and continuous wheel contact simultaneously. A 50 m ramp also intersects the first several fixed wagons.

No production grade based on the incorrect 1130 m wagon assumption has been implemented. The root task must resolve this concrete authority conflict: authorise a bounded renderer-only floor contact reveal, repair the existing train placement/art through explicitly expanded scope, or document an explicitly accepted contact limitation. Bridge class, models, world heights, train art and gameplay remain unchanged while this decision is pending. The pending working-tree west contact fix and camera corrections do not constitute completion of the east join.

Root agent availability was checked after the conflict reports: its tool session was in an error state caused by an upstream 503 download response. No approval or design decision is inferred from that interruption.

Root resolved the conflict by explicitly authorising bounded renderer-only source-floor contact reveal and last-support procedural track replacement. The accepted renderer reconstruction now supplies flat span-end connector 1044.7→1049.2, then the short approximately 6.5% grade to fixed train top -0.82 at1062. It keeps all train, bridge asset, bridge class and world bytes unchanged. The previous 50 m/1130 m proposal was rejected using actual protected train authority. Fresh actual browser evidence and independent verification remain necessary.
