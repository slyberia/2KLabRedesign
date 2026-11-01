# Dribble Lab

Open `/dribble-lab` or use Game Details → How-To Guides → Open the Dribble Lab.

## Features

- Thirty source-linked NBA2KLab input definitions with opt-in demonstration playback, pause, 100 ms stepping, and restart.
- Original Xbox Series, DualSense, DualShock 4 and generic vector illustrations. Changing an illustration changes button labels and overlay positions, never physical input mappings.
- Live `navigator.getGamepads()` polling for browser-recognized standard controllers, with device selection, disconnect handling and actionable unavailable/blocked/unsupported-layout states.
- Mouse, touch and accessible direction-button input when a controller is unavailable.
- Practice recording (up to eight seconds), input-pattern feedback, replay, seeking, clear and return to live input.
- Separate target, raw input and simulated-response layers; bounded trails for both analog sticks and a larger stick-detail view.
- Independent optional radial dead zone, sensitivity, directional drift, and input-delay simulations. All start off. Movement trails start on.
- Adjustable direction tolerance and opt-in timing assessment. Settings changes clear the attempt so feedback cannot mix configurations.
- No input telemetry, account requirement, storage API, new dependency, external artwork, or embedded third-party script. Frames live only in component memory; leaving the page discards them.

## Model and limits

Raw buttons/axes use the browser's standard gamepad layout. Controller appearance is independent of the connected device. Unrecognized mappings are reported instead of guessed. The user must connect a controller to the device running the browser and interact with it on the active page; pairing it only with a console does not expose it to this page.

For the simulated layer, the pipeline is raw snapshot → directional drift → radial dead zone with remaining-range rescaling → sensitivity and clamping → optional time-buffer delay. Buttons are delayed as well as axes. The original raw snapshot is preserved. An enabled simulation makes practice assess the simulated response; the UI names the assessed stream. Simulated lag is not a measurement of actual device, console or network latency.

Practice checks flick direction, number/order of required flicks, return to neutral, required trigger holds/taps, or the illustrated rotation direction and extent. Default direction tolerance is ±25 degrees. Motion activation radii, rotation extent and demo durations are authored browser-training references, not measured NBA 2K acceptance windows. Timing assessment is disabled initially; when enabled, it compares against the displayed demo pace. Input-pattern success is never described as proof of a successful in-game move. Ball hand, character state and game control settings remain outside the browser's observation.

Playback never autostarts. Page blur/visibility changes pause playback and interrupt recording, clear live state and discard the simulation delay queue. Live sampling is bounded and the animation loop and listeners are removed on unmount. Up to eight seconds of recording stays available for replay; path display has a configurable one-to-six-second window and a maximum of 600 samples.

## Source and presentation

`../data/dribble-inputs-2k27.json` contains symbolic factual controls from the logged-out public [NBA2KLab dribble guide](https://www.nba2klab.com/nba2k-how-to-dribble), captured 1 November 2026. It excludes article bodies and media. Lesson text is generated from those fields. `repeat` on repeated flicks is retained; Signature Size-up practices one left/right cycle instead of treating a visual loop count as a game requirement. Public instructions and videos remain linked with source attribution. No game data beyond those controls was refreshed.

## Checks

Run the repository's existing TypeScript, Vitest, production-build and Playwright commands. The new engine suite covers immutable snapshots, simulation effects, delay boundaries, bounded trails and gesture rejection/success. Browser coverage exercises all modes, settings, pointer recording/replay, simulated standard-controller input, disconnected/blocked access, shareable move/artwork selections, CSP and 320 px layout. Synthetic gamepad tests verify application behavior; USB/Bluetooth controller compatibility still requires real-device checks before broader release.
