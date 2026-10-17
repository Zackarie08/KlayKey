# KlayKey modular keyboard asset lab — v2

The existing Blender generator, configuration files, named materials, manifest and Three.js viewer have been extended in place. One generator produces ANSI 60%, 75% and 100% models with 61, 81 and 104 independently addressable keys. Every layout supports Standard / none, Physical volume knob, and Mini display.

## Open the viewer

Double-click **start-viewer.bat**. Keep its command window open. It opens http://127.0.0.1:8080/viewer/index.html automatically. Ctrl+C in that window stops the server; double-click the launcher to reopen it later. See [START_HERE.md](START_HERE.md) for installation, occupied ports, paths with spaces, missing models, caching and troubleshooting.

Node.js 20+ serves the viewer. Blender is only required to regenerate assets. Dependencies are pinned in package-lock.json; run npm ci once if node_modules is missing. The viewer is local and uses no CDN. Do not double-click viewer/index.html: ES modules and fetched models require HTTP.

## Regenerate and validate

Run in PowerShell from this folder:

~~~powershell
& 'C:\Program Files\Blender Foundation\Blender 4.5\blender.exe' --factory-startup --background --python-exit-code 1 --python scripts/generate_keyboards.py -- --layout all
npm test
npm run validate
.\start-viewer.bat
~~~

Tested with Blender 4.5.3 LTS and Three.js r186. Blender supplies Python; no add-ons, paid assets, external fonts or Python packages are needed. --layout accepts 60, 75, 100 or all. --no-render leaves existing PNG previews untouched. --output can redirect generated assets to another folder. Regeneration replaces corresponding project outputs.

Click **Start Typing Test**, then **Run asset checks** to include WebAudio checks. Running ?test without a trusted gesture checks geometry/configuration but explicitly marks audio as skipped. Save report downloads JSON; the local server also attempts to save exports/viewer_validation.json and offers the download fallback if the directory is read-only.

## Preserved architecture and files

- scripts/generate_keyboards.py remains the single entry point.
- scripts/keyboard_generator/layouts.py defines structured key positions and physical codes; geometry.py provides mesh primitives, keycap shells, UVs and coordinate baking; materials.py creates shared PBR materials and embedded microtextures.
- components.py assembles each board; new mechanical.py supplies perforated plates, switch parts, stabilizers and shared control modules. export.py saves/reopens Blender sources, exports GLB and writes the manifest; validation.py enforces geometry and output contracts.
- config/keyboard_options.json and compatibility.json retain existing finishes, themes, switches, connection/RGB settings and legacy accessory aliases. sound_profiles.json adds acoustic parameters and optional recording overrides.
- viewer/configuration.js normalizes selections. app.js retains the rendering/configuration orchestration; key-animation.js, typing-audio.js, sound-synthesis.js, control-module.js and interaction-checks.js isolate the new behavior.
- blender/keyboard_{60,75,100}.blend are editable sources; exports/keyboard_{60,75,100}.glb are embedded assets; previews/keyboard_{60,75,100}.png are 1400 × 1000 Cycles renders.
- exports/keyboard_manifest.json, layout_*.json, validation_*.json, gltf_validation_*.json and viewer_validation.json provide integration data and measured evidence. baseline_inventory.json records the original asset inspection.

## Geometry and realism

Models use 19.05 mm key pitch, a 6-degree typing slope, controlled case bevels, separate upper/lower panels, a fine seam and a recessed plate with switch cutouts. The PCB and perimeter gasket sit beneath it. Switches have separate upper/lower housings, clips and moving cross stems. Wide/tall keys have stabilizer housings, sliders and wire. Keycaps have tapered shells, inner walls, recessed inner roofs, row heights and cylindrical dishes; the spacebar is slightly convex. Projected primary legends are geometry.

USB-C has a real wall opening, tongue and contacts. The cable has a connector and strain relief. Underside screw recesses, slots and rubber feet are separate components. Small embedded normal/roughness textures provide surface grain without disguising the geometry.

The 60% keeps its original key arrangement and adds a right-side control bay; its 350 mm case is consequently wider than the compact 325 mm 75%. The full-size case is about 463 mm. These are visual product assets, not manufacturing CAD or mechanically certified designs.

Geometry is authored in millimetres and baked to metres. Blender is Z-up; glTF is Y-up. Mesh scales are identity. Key and knob parents intentionally retain useful local pivot rotations. Do not rescale or rotate the complete loaded GLB again.

## Node and material contract

Legacy GROUP_CASE, GROUP_PLATE, GROUP_SWITCHES, GROUP_KEYCAPS, GROUP_RGB, OPTION_CABLE, OPTION_KNOB and OPTION_DISPLAY remain available. New bindings include:

~~~text
CONTROL_MODULE
  OPTION_KNOB / OPTION_VOLUME_KNOB / VOLUME_KNOB_ROOT
  OPTION_DISPLAY / OPTION_MINI_DISPLAY / MINI_DISPLAY_ROOT
    MINI_DISPLAY_SCREEN
GROUP_KEYCAPS
  KEYCAPS_ALPHA / KEYCAPS_MODIFIER / KEYCAPS_ACCENT
    KEY_KeyA, KEY_Space, KEY_ShiftLeft, KEY_ShiftRight, ...
~~~

Every KEY_<KeyboardEvent.code> is a transform parent for its cap, legend and moving stem. Duplicate legends have distinct physical codes, including Numpad0 and NumpadEnter. Read manifest bindings instead of assuming all named nodes are meshes: glTF can split material primitives into descendants.

The viewer batches visible key geometry by material and applies per-key translation uniforms, retaining the source key nodes for integration. This is why individual key control does not require hundreds of draw calls. Another consumer can animate the original parents directly, but must implement equivalent batching to meet the viewer draw-call budget.

MAT_CASE_ACTIVE supports case finish/color changes; alpha/modifier/accent key materials support colorways independently of physical material. Thick PBT, thin ABS and polycarbonate change roughness, micro-normal strength and transmission as well as sound. RGB has off/static/three-zone/white modes plus separate seam underglow. Three-zone is a fixed palette, not an animated rainbow. Wireless and tri-mode hide the cable.

Standard glTF does not store option visibility. All mutually exclusive modules are included in each GLB: apply configuration immediately after loading. Generic viewers may initially show both modules. Blender previews save knob-only visibility.

## Typing and audio

Click Start Typing Test and type while the 3D canvas has focus. Keys move 3.4 mm down in 45 ms and return in 95 ms using one central animation loop. Repeats do not create repeated presses or sounds; chords and both Shift keys are independent. Blur, hidden tabs, stop and layout changes clear held states. Space/arrows suppress scrolling only during the focused test. Escape exits. Text fields and browser shortcuts remain usable; Ctrl/Alt/Meta combinations and F5/F11/F12 are reserved. Fn is mapped in the asset but most keyboards do not expose it to the browser.

Audio starts only after the trusted Start gesture. Nine original synthesized approximations combine red linear / brown tactile / blue clicky switches with thick PBT / thin ABS / polycarbonate. Three variations per combination, small pitch/gain changes and deeper wide-key responses avoid one identical click. A 24-voice pool, compressor, bounded waveshaper and master gain handle fast typing. Mute retains volume; sound enable is independent. No proprietary recordings or placeholder audio files are used.

sound_profiles.json documents body pitch, noise, click transient, decay, brightness and resonance. Optional sampleOverrides can supply three original/licensed sample URLs per combination; decoding failure falls back to synthesis. See typing-audio.js for the override key format. Objective signal differences and browser playback were tested; subjective timbre and the user's physical speakers were not independently auditioned.

## Knob and display

Wheel over the 3D knob to adjust volume by 4%; click it to mute/unmute. Its angle follows the volume slider. Pointer handling temporarily suspends orbit during a knob click and releases it afterwards. Volume/mute survive layout and module changes. There is no drag-to-turn gesture.

The mini display shows volume or MUTED, selected switch and RGB mode/color. Its 512 × 180 canvas texture updates only when those values change. Knob and display are mutually exclusive on all three layouts.

~~~js
await window.keyboardLab.configure({
  layout: '60', controlModule: 'mini-display',
  caseColor: 'green', caseFinish: 'satin', keycapTheme: 'forest',
  keycapMaterial: 'thick-pbt', switch: 'switch-brown',
  volume: 0.6, muted: false, soundEnabled: true,
  rgbMode: 'static', rgbColor: '#88ccff', rgbIntensity: 1.5,
  underglow: true, connection: 'wireless'
});
const selections = window.keyboardLab.getState();
~~~

Legacy accessory values none/knob/display are still accepted and mirrored. The canonical controlModule values are none/volume-knob/mini-display. Compatible configuration survives layout changes. Price adjustments remain unpriced placeholders.

## Measured performance

| Layout | Keys | Stored triangles | GLB MiB | Materials | Default viewer calls | Raw stored primitives |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 60% | 61 | 178,385 | 8.528 | 18 | 32 | 215 |
| 75% | 81 | 225,663 | 10.735 | 18 | 32 | 275 |
| 100% | 104 | 288,407 | 13.632 | 18 | 32 | 344 |

Stored counts include all options. Default rendered counts are 175,727 / 223,005 / 285,749 triangles. All stored assets meet 150–350k triangles and <30 MB. Two embedded images are 256 × 256; the dynamic display is 512 × 180, below the 2048 limit. Raw primitive counts exceed 80 because independently exported keys remain editable; the supplied viewer's batching delivers 32 calls by default. Transmission can add renderer passes. See VALIDATION.md for the verified scope.

The final automated run passed 9 Node tests and 273 browser checks, including audio. All three Khronos reports have zero errors and zero warnings. Blender sources were saved and reopened successfully. The exporter supplies an orthogonal unit tangent at UV-singular bevel corners where Blender emits a zero tangent; ordinary tangent frames are unchanged.

No separate LOD is included. Concealed switch parts, inner cap surfaces and geometric legends are sensible future LOD candidates. Colors differ somewhat between Blender studio lighting and the browser room environment. Polycarbonate is a real-time material approximation. Only primary legends are modeled, and the display's live readout is supplied by the viewer rather than baked into the GLB.

## Extending the system

Add colors/themes/switch metadata in keyboard_options.json and update coverage/mount compatibility. Add acoustic switch/material parameters in sound_profiles.json separately from keycap colorways. Add layouts in layouts.py with unique physical codes, bounds and a nonoverlapping bay; extend CLI choices and compatibility lists. Regenerate to refresh the manifest and outputs. Keep optional modules separate and preserve named bindings.

References: [Blender Python API](https://docs.blender.org/api/4.5/), [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).
