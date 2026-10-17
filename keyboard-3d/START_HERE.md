# QUICK START

1. Double-click **start-viewer.bat** in this folder.
2. Keep the command window open.
3. The website opens automatically at **http://127.0.0.1:8080/viewer/index.html**.
4. To stop the website, return to the command window and press **Ctrl+C**.
5. To open it again later, double-click **start-viewer.bat** again.

This is a local preview on your PC. It does not need website hosting or a login.
Closing its server window stops the website; the model files remain safely saved.
Closing only the browser tab leaves the server running. In that case reopen the URL
instead of starting another server.

## One-time setup

This project uses **Node.js 20 or newer**, not Python, for its local server.
If the launcher reports Node.js or npm missing, install the LTS release from
https://nodejs.org/ and reopen your terminal. Then run these exact PowerShell commands:

```powershell
cd keyboard-3d
npm ci
.\start-viewer.ps1
```

`npm ci` installs the versions in the existing lockfile. It needs internet access
once. The viewer then loads models, textures, scripts and generated audio locally.
If PowerShell blocks direct script execution, double-click the `.bat` launcher;
it applies an execution-policy override to that one PowerShell process only.

## Typing and sound

Choose a layout, switch, and **keycap material / acoustic profile**. Colorway and
material are separate controls. Click **Start Typing Test**, then type with the
3D canvas focused. Escape stops the test. Clicking a form control also releases
held keys; click Start again to resume. Reserved browser/OS shortcuts keep working.

Sounds are original synthesized approximations, not actual keyboard recordings.
Your first click unlocks browser audio. Increase Sound volume and check Typing
sounds if you hear nothing; check Windows speaker volume too. The knob's wheel
changes volume and clicking the knob toggles mute. The slider and knob stay in sync.
The mini display shows volume, mute, switch and RGB mode.

## Why index.html does not work by itself

Double-clicking `viewer/index.html` opens a `file://` page. Browser security can then
block JavaScript modules, fetched GLBs, manifests and replacement audio samples.
The launcher serves the **whole project**, allowing `viewer/` to access `exports/`
and `node_modules/` through ordinary HTTP. There is no installation step for each visit.

## If the port is busy

This project uses **8080**, not 8000. A Python server already using port 8000 does
not conflict. If 8080 is busy, first check whether your earlier KlayKey command window
is still open. Use its existing URL or press Ctrl+C in that specific window.
Do not stop all Node or Python processes.

To choose another port:

```powershell
cd keyboard-3d
.\start-viewer.ps1 -Port 8081
```

The URL is then **http://127.0.0.1:8081/viewer/index.html**. The batch launcher also
accepts `start-viewer.bat -Port 8081`. Choose another unused port if necessary.
The launcher prints errors instead of silently using a wrong server.

## Common problems

- **“python is not recognized”:** Python is not needed to run this viewer. Use the
  provided batch file. Blender supplies its own Python for asset generation.
- **“node” or “npm is not recognized”:** install Node.js, reopen the terminal, run
  `npm ci` once in the project folder, then launch again.
- **Dependencies missing:** run `npm ci` in the folder containing `package.json`.
- **Browser did not open:** copy the printed URL into Edge, Chrome, or Firefox.
- **Page unavailable:** the server window must stay open. Read its error message.
- **Old geometry after regeneration:** press **Ctrl+F5** or **Ctrl+Shift+R**. The server
  sends `Cache-Control: no-store`. If needed, open browser developer tools (F12),
  Network, check Disable cache, and reload; or clear site data for `127.0.0.1` only.
  Ensure an older server window is not serving a different copy of the project.
- **Assets missing:** regenerate them below. Keep the folder structure together.

## Regenerate Blender sources, exports and previews

Install Blender 4.x if it is not already installed. On this PC:

```powershell
cd keyboard-3d
& 'C:\Program Files\Blender Foundation\Blender 4.5\blender.exe' --factory-startup --background --python-exit-code 1 --python scripts/generate_keyboards.py -- --layout all
```

Change `all` to `60`, `75`, or `100` for just one layout. Append `--no-render` to skip
PNG regeneration while iterating. Asset generation is separate from starting the server.
Blender files are in `blender/`, GLBs and metadata in `exports/`, PNGs in `previews/`.

## Run checks

```powershell
npm test
npm run validate
.\start-viewer.ps1 -NoBrowser -Smoke
```

`-Smoke` starts the same server, checks the viewer and all model URLs, and shuts down
only that test server. In the browser, click Start Typing Test once to unlock audio,
then Run asset checks. The report includes audio checks only when audio is unlocked.
