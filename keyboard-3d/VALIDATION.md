# Validation — 13 October 2026

Final source and asset checks:

- Blender 4.5.3 LTS generated all three layouts, saved their .blend files and reopened them successfully.
- Geometry checks passed: exact 61/81/104 key counts, unique physical codes, layout rectangles, case containment, control bay clearance, expected hierarchy/materials and identity scale. Analytical bottom-of-travel plate clearance is 2.2 mm.
- npm test: 9/9 passing, including compatibility combinations, module support, fallback behavior, layout preservation and nine distinct finite synthesized profiles with bounded peaks and continuous endpoints.
- npm run validate: all three GLBs have zero errors and zero warnings. Informational unused UV/tangent notices remain on untextured primitives; these are not errors. Complete reports are in exports/gltf_validation_*.json.
- Browser: 273/273 checks passed, audioUnlocked=true, audioChecks=executed, runtimeErrors empty. The downloaded final report is preserved at exports/viewer_validation.json. This environment prevented server-side report writing; the browser download fallback worked.

## Browser coverage

The actual exported models were loaded into Three.js r186. Tests exercise colors, finishes, themes, switches, RGB modes/intensity/color, underglow, cables, all three control modules and all layout transitions. Key tests include A, Space, Enter, Backspace, both Shift keys, independent numpad movement, chords, repeat suppression, rapid presses, exact return, blur release, Escape exit and browser shortcut preservation.

Audio checks ran after a trusted Start Typing Test click and exercised all nine combinations, wide-key variants, bounded 24-voice polyphony, mute and sound-off behavior. Signal tests establish distinct generated waveforms. Physical speaker output and subjective timbre were not independently auditioned.

Additional live pointer verification: wheel over the knob changed volume 45% to 49%; click set mute and a second click restored it without changing volume. Mini display visibly showed the updated volume and switch/RGB status. The 49% setting survived layout/module changes. Desktop and 390 × 844 responsive layout were inspected; the mobile document had no horizontal overflow. All three Cycles previews were visually inspected. Browser console errors remained empty.

## Performance

| Layout | Stored triangles | GLB MiB | Materials | Default rendered triangles | Default calls |
| --- | ---: | ---: | ---: | ---: | ---: |
| 60% | 178,385 | 8.528 | 18 | 175,727 | 32 |
| 75% | 225,663 | 10.735 | 18 | 223,005 | 32 |
| 100% | 288,407 | 13.632 | 18 | 285,749 | 32 |

The wired polycarbonate/knob configurations inspected on 75% and 100% used 70 draw calls; the wired polycarbonate/display 75% used 68. Transmission renders additional passes, so renderer triangle submissions can exceed stored triangle counts (575,930 on the tested full-size transmission frame). The 350k geometry target refers to stored geometry. The 80-call budget is met by the supplied viewer with animated batching; raw exported key primitives require 215/275/344 submissions when all stored options are drawn separately.

Embedded texture sizes are 256 × 256 each; the live display is 512 × 180. All files stay below 30 MB and texture dimensions below 2048. No FPS guarantee is made across other GPUs/browsers.

## Windows launcher

start-viewer.bat -NoBrowser -Smoke exited 0 and served the viewer, its module, Three.js, manifest and all three GLBs. Ctrl+C stopped the running server; the normal start-viewer.bat command restarted it on 127.0.0.1:8080 with automatic browser launch requested. Browser navigation confirmed the live viewer. The server binds only to loopback and uses no-store responses. The launcher handles missing Node/dependencies/assets and occupied ports with actionable messages. See START_HERE.md.

## Remaining limits

Models are configurable visual assets, not fabrication CAD. Synthesis approximates switch/material characteristics; no measured physical acoustic model or recordings are claimed. Fn and OS/browser-reserved keys may not reach a webpage. Escape exits the test. The 60% has a wider right-side bay to provide equal module support. Only primary legends are modeled, the RGB multicolor mode is static, the mini display is populated at runtime, and no separate LOD is included. Generic GLB viewers need to hide mutually exclusive options and implement key batching themselves.

Evidence images: previews/viewer_verified.png and previews/viewer_mobile.png. Per-layout geometry reports, validator output and the final browser report remain in exports/.
