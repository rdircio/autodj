# AutoDJ for Mixxx (customized)

Improved automatic DJing for Mixxx, based on [byronxu99/AutoDJ](https://github.com/byronxu99/AutoDJ) with extra options and fixes.

## Features

- **Smart mix points**: Uses Intro Start, main cue, or first beat plus an exit hotcue/Outro Start to choose musical in/out points.
- **Harmonic mixing**: Optionally matches key during the mix, then restores the new track to its original key.
- **Bass‑swap EQ fade**: Incoming bass ramps in while outgoing bass stays solid, with safety to keep normal bass at the crossfader ends.
- **Randomized transitions (optional)**: Per‑transition random EQ on/off, EQ speed, and beats-before‑entrance; optional one‑slot FX on the outgoing deck only.
- **Beatloop‑safe long fades**: Handles outgoing tracks in beatloops by driving the crossfader so transitions still finish at your configured AutoDJ duration.

## Install

```bash
./install-autodj.sh
```

Then restart Mixxx (or reload the controller in **Preferences → Controllers**).

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

## Key behaviour

- **By default** the script does **harmonic mixing**: it transposes the next track to match the previous one during the mix, then **restores** the new track to its **original key** after the transition (so the song doesn’t stay “off key”).
- **To keep every song in its original key** (no transposition at all): in `AutoDJ.js` set **`midiAutoDJ.transpose = 0`**. No key matching, no restore needed.
- If the next song still ends up off key, ensure **`restoreKeyAfterFade = 1`** (default). The script now snaps the key back when the fade ends (the deck that was “next” becomes “prev”), so the track should always return to its original key.

## Options

Edit `AutoDJ.js` to change behaviour. Main options at the top:

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

## Files

- **AutoDJ.js** – Controller script (edit this, then run `./install-autodj.sh`).
- **install-autodj.sh** – Copies `AutoDJ.js` into Mixxx’s user controllers folder.

Mixxx expects the mapping **AutoDJ.midi.xml** and the script **AutoDJ.js** in its controllers folder; this repo only ships the script. Use the AutoDJ mapping you already added in **Preferences → Controllers** (e.g. for IAC Driver Bus 1).
