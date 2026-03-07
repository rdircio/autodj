# AutoDJ for Mixxx (customized)

Improved automatic DJing for Mixxx, based on [byronxu99/AutoDJ](https://github.com/byronxu99/AutoDJ) with extra options and fixes.

## Features

- **Automatic song selection** with an adjustable tempo difference (BPM %) tolerance; tracks outside the tolerance are skipped.
- **Automatic harmonic mixing and key transposition**: optionally matches the next track’s key to the current one during the mix, then restores the new track to its original key after the transition.
- **Avoid recently played**: The script keeps a **memory-only** private list of tracks it has played (as the outgoing track) in the last N minutes (default 60) and skips them when choosing the next track; configurable in the preferences dialog (Tempo and key). The cache is cleared when Mixxx exits. File persistence is not available in stock Mixxx (no file I/O in controller scripts); the code is ready if a build exposes it.
- **Entrance and exit cue points**: main cue or Intro Start for where the next track starts; hotcue (default 4) or Outro Start for where the current track ends the mix.
- **Double and half time**: e.g. 160 BPM to 80 BPM; the script supports Mixxx’s double/half time sync.
- **Bass EQ** for smoother transitions: incoming bass ramps in while outgoing bass stays solid; optional randomized EQ per transition.
- **Smart mix points**: Uses Intro Start, main cue, or first beat plus an exit hotcue/Outro Start to choose musical in/out points.
- **Randomized transitions (optional)**: Per‑transition random EQ on/off, EQ speed, and beats-before‑entrance.
- **Random effects during fade (optional)**: When enabled, one effect unit (FX1 or FX2) and one slot (1–3) are chosen at random per transition and applied only to the outgoing deck. Only one effect is on at a time; all others are turned off when a transition starts and all are turned off when it ends. Unit mix (dry/wet) and slot wet are randomized per transition (default range 50–100%).
- **Beatloop‑safe long fades**: When the outgoing track is in a beatloop, the script drives the crossfader so the transition still completes at your configured AutoDJ duration.
- **Preferences dialog (Mixxx 2.5+)**: When using the "AutoDJ (Script)" mapping, a settings panel in **Preferences → Controllers** lets you adjust cues, EQ, random transitions, effects, and tempo/key options without editing the script; changes apply on Apply/OK with no need to stop Auto DJ or restart Mixxx.
<img width="1380" height="918" alt="image" src="https://github.com/user-attachments/assets/8c10f6a1-b9b1-462f-9786-87a35d0c2bab" />


### Example

A transition from the song on the right (e.g. 160 BPM, Bb Major) to the song on the left (e.g. 90 BPM, D minor). Every two beats on the right can be matched to one on the left (double/half time). The exit cue on the current track is aligned with the entrance cue on the next. As the cues are approached, the tempo can change smoothly toward the new song while beats stay synchronized. At the same time, the EQ fades out the bass of the old song and fades in the bass of the new one.

## Install

```bash
./install-autodj.sh
```

Then restart Mixxx (or reload the controller in **Preferences → Controllers**). The install script also copies `AutoDJ.midi.xml` so you can use the **preferences dialog** (see below).

## Usage

1. **MIDI controller**: Use a MIDI loopback driver (e.g. [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) on Windows, or IAC Driver on macOS) so Mixxx can load the script. In **Options → Preferences → Controllers**, select the loopback device and choose the **"AutoDJ (Script)"** mapping (from `AutoDJ.midi.xml`). Ensure `AutoDJ.js` and `AutoDJ.midi.xml` are in the controllers folder, e.g. via `./install-autodj.sh`.
2. **Library**: Load songs, run BPM/key analysis, and attach the desired crates to Auto DJ.
3. **Cues**: Set the main cue (or Intro Start) for the entrance and hotcue 4 (or your **exitCue**) for the exit on each track. Check that the beat grid is aligned (see **Setup** below).
4. Enable **Auto DJ** in Mixxx; the script runs automatically when Auto DJ is on.

## Setup (recommended)

### Beat grid

Auto beat detection is often **off by half a beat**. To fix it:

1. Load the track and set the **main cue** (or **Intro Start**) on the **real first beat** of the bar (the downbeat you hear).
2. With **alignBeatgridAtEntrance** enabled (default), the script will align the beatgrid to that position when it prepares the track for Auto DJ. The grid is then correct for that track.

You can also align the grid manually: place the playhead on a downbeat, then use **Beats → Align beat grid to current position** (or the equivalent in your skin).

### Entrance point (where the next track starts)

The script picks the **best time to start mixing** the next song (e.g. when the beat starts), not necessarily from 0:00:

- **Intro Start** – If you set the "Intro Start" marker, the script uses it as the entrance. Enable **useIntroStart** (default: 1).
- **Main cue** – Set the main cue on the waveform where you want the next song to start (e.g. first beat of the intro). The script uses this as the mix-in point when Intro Start is not set.
- **No cue set** – With **fallbackToStart** and **snapToFirstBeat** (default: 1), the script starts at the **first beat of the first bar** using the beatgrid. Run BPM/beatgrid analysis on your library for this to work.

**Tracks not yet analyzed:** If a track is loaded before Mixxx has finished analyzing it (beatgrid appears after load), the script will still try to pick the best start: it sets position to 0 at first, then **retries** every 600 ms until the beatgrid is ready and snaps to the first beat. You can tune **deferredSnapWhenAnalyzing**, **deferredSnapInterval**, and **deferredSnapMaxRetries** in the script.

### Exit point (where the current track ends the mix)

- **Hotcue 4** (default) – Set **hotcue 4** on the waveform where the current track should end the mix. You can change the hotcue number with **exitCue** in the script (e.g. `midiAutoDJ.exitCue = 4`).
- **Outro Start** – Alternatively, set the “Outro Start” marker and set **useOutroForExit = 1** in the script.

## Recent-played cache (memory-only)

The recent-played list is kept **in memory only** in stock Mixxx: it is cleared when you exit Mixxx. Tracks are identified by duration + BPM + sample count (no file path; `track_location` is not available in all builds). Within a session, the script avoids replaying any track that was the outgoing track in the last N minutes (see **avoidRecentMinutes**).

Optional file persistence (so the list survives restarts) would require Mixxx to expose file I/O to controller scripts (`engine.getPath`, `engine.readFile`, `engine.writeFile`). Stock Mixxx does not; the script is written so that if a future or patched build exposes those APIs, setting **recentPlayedCachePath** (in the script) would enable it. The file format would be JSON: `{ "trackId": timestamp, ... }`.

## Key behaviour

- **By default** the script does **harmonic mixing**: it transposes the next track to match the previous one during the mix, then **restores** the new track to its **original key** after the transition (so the song doesn’t stay “off key”).
- **To keep every song in its original key** (no transposition at all): in `AutoDJ.js` set **`midiAutoDJ.transpose = 0`**. No key matching, no restore needed.
- If the next song still ends up off key, ensure **`restoreKeyAfterFade = 1`** (default). The script now snaps the key back when the fade ends (the deck that was “next” becomes “prev”), so the track should always return to its original key.

## Preferences dialog (Mixxx 2.5+)

If you load the script via the **"AutoDJ (Script)"** mapping (`AutoDJ.midi.xml`), Mixxx shows a **settings panel** for this controller in **Preferences → Controllers** (below the mapping dropdown). You can adjust cues and timing, EQ and crossfade, random transitions, random effects, and tempo/key options there without editing the script. **Settings are applied when you click Apply or OK**—the next transition (and all following ones) will use the new values. You do **not** need to stop Auto DJ or restart Mixxx.

If you use a different mapping that only loads `AutoDJ.js`, you can add a `<settings>` section to that mapping’s XML to get the same UI; the script reads any defined settings via Mixxx’s Settings API and overrides the script defaults.

## Options (script defaults)

You can still edit `AutoDJ.js` to change default behaviour. Main options at the top:

| Option | Default | Description |
|--------|---------|-------------|
| **exitCue** | 4 | Hotcue number for the exit point. |
| **preStart** | 8 | Beats before the current track’s exit point to start the transition. |
| **preStartNextBeats** | 1 | Beats before the next track’s first beat (or intro/cue) to position the next deck. Use 1 so the next song starts on the first beat; use 8 to hear more intro. |
| **useEQ** | 1 | Use EQ bass fade during the transition. |
| **randomTransitions** | 0 | Set to 1 to randomize each transition: sometimes EQ, sometimes pure crossfade; variable EQ speed; variable beats before first beat (1, 2, or 4). |
| **randomPreStartNextBeatsOptions** | [1,2,4] | When randomTransitions=1, pick randomly from these for beats before the first beat. |
| **randomEQChance** | 0.85 | When randomTransitions=1, probability (0–1) of using EQ this transition (e.g. 0.85 = 85% EQ, 15% pure crossfade). |
| **randomEQStepMin/Max** | 0.018, 0.032 | When randomTransitions=1, EQ fade step range (higher = faster bass swap). |
| **logRandomTransitions** | 0 | When randomTransitions=1, set to 1 to print each transition’s random choices to the Mixxx log. |
| **useIntroStart** | 1 | Use Intro Start as entrance when set. |
| **useOutroForExit** | 0 | Use Outro Start as exit when set. |
| **alignBeatgridAtEntrance** | 1 | Align beatgrid to entrance (main cue or Intro Start) to fix “off by half a beat”. |
| **snapToFirstBeat** | 1 | When no cue is set, snap to first beat of the bar. |
| **deferredSnapWhenAnalyzing** | 1 | When the track is not yet analyzed, retry snapping to the first beat until the beatgrid is ready. |
| **deferredSnapInterval** | 600 | Retry interval (ms) when waiting for analysis. |
| **deferredSnapMaxRetries** | 20 | Stop retrying after this many attempts (~12 s at 600 ms). |
| **maxBpmAdjustment** | 25 | Max BPM % difference allowed before skipping a track. Increase (e.g. 35) to skip fewer songs. |
| **logSkipReasons** | 1 | Print to Mixxx log why a track was skipped (Debug). Set 0 to disable. |
| **transpose** | 1 | Harmonic mixing (key matching). Set **0** to keep every song in its original key (no transposition). |
| **restoreKeyAfterFade** | 1 | After the mix, restore the new track to its original key. Set 0 to leave it transposed. |
| **avoidRecentMinutes** | 60 | Minutes to avoid re-playing a track after it was the outgoing track in a transition (0 = disabled). |
| **recentPlayedCachePath** | "" | Cache is **memory-only** in stock Mixxx (no file I/O). Optional: full path to a JSON file to persist across restarts if your build exposes `engine.getPath`, `engine.readFile`, `engine.writeFile`. Set in script only (no XML option). |

## Tips

- Edit `AutoDJ.js` to customize options (tempo tolerance, transpose, EQ, effects, etc.).
- In Mixxx **Auto DJ** settings, adjust the **transition duration**. The default (e.g. 10 s) is often long; many prefer **6–8 seconds**.
- More options are in **Options → Preferences → Auto DJ**. See [Mixxx Auto DJ spec](https://blueprints.launchpad.net/mixxx/+spec/auto-dj-crates).
- Try the crossfader in **additive** vs **constant power** mode; you may prefer one over the other.

## Files

- **AutoDJ.js** – Controller script (edit this, then run `./install-autodj.sh`).
- **install-autodj.sh** – Copies `AutoDJ.js` into Mixxx’s user controllers folder.

Mixxx expects the mapping **AutoDJ.midi.xml** and the script **AutoDJ.js** in its controllers folder; this repo only ships the script. Use the AutoDJ mapping you already added in **Preferences → Controllers** (e.g. for IAC Driver Bus 1).
