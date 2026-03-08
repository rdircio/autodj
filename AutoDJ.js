function midiAutoDJ() {}

/*
 AutoDJ for Mixxx
 Byron Xu, 2018
 Licensed under the GNU GPL v3 or later

 Based on midiAutoDJ by Sophia Herzog, copyright (c) 2016-2017 and licenced under the GPL
 Available at https://www.mixxx.org/forums/viewtopic.php?f=7&t=8318

 Please see the README for more information and usage instructions

 SETUP (recommended):
 - Beat grid: Auto detection is often off by half a beat. Set the main cue (or Intro Start)
   on the real first beat of the bar; the script can then align the beatgrid to that point
   (see alignBeatgridAtEntrance below).
 - Entrance: Main cue = where the next track should start (mix-in point). Or set Intro Start
   on the waveform for a better musical start.
 - Exit: Hotcue 4 (or the number in exitCue) = where the current track should end the mix.
   Or set Outro Start and use useOutroForExit.
*/


// BASIC OPTIONS

midiAutoDJ.version = "1.0.0"; // Keep in sync with VERSION file in the repo

midiAutoDJ.exitCue = 4;
// Hotcue number to mark the exit point (where the current track ends the mix).
// Set this hotcue on the waveform for each track. Unit: Integer; Default: 4

midiAutoDJ.preStart = 8;
// Duration before the mix point to begin transition
// The exit point of the current song and the entrance point of
// the next song are overlapped.
// The transition begins some number of beats before this point.
// Unit: Beats; Allowed values: 1 2 4 8 16 32 64; Default: 8

midiAutoDJ.preStartNextBeats = 0;
// Beat offset from the next track's mix-in point (first beat / intro / cue).
// 0     = start exactly on the mix-in point (never before the song starts).
// Negative = beats AFTER the mix-in point (e.g. -4 = skip 4 beats of intro).
// Positive = beats BEFORE (lead-in) — avoid if you never want to start before the first beat.
// Unit: Beats; Allowed values: 0, or ±1 ±2 ±4 ±8 ±16 ±32 ±64; Default: 0

midiAutoDJ.useEQ = 0;
// Whether to use EQ when transitioning
// Unit: Boolean (0 or 1); Default: 1 (yes)

midiAutoDJ.normalBassLevel = 1.0;
// Target bass EQ (parameter1) level for normal playback after transitions.
// Increase slightly above 1.0 if you want a bit more bass by default.

midiAutoDJ.normalTrebleLevel = 1.3;
// Target treble EQ (parameter3) level for normal playback after transitions.
// Default: 1.3 to give a slightly brighter sound.

midiAutoDJ.bassRestoreStepDuringFade = 0.12;
// Step per timer tick when ramping the target track's bass from 0 to normalBassLevel during the transition.

midiAutoDJ.fadeSourceHoldTicks = 4;
// Number of timer ticks to hold the crossfader at "all source" at the start of the fade (source stays full). ~1 tick/sec, so 4 ≈ first 4 s.

midiAutoDJ.fadeDriveWhenLoop = 1;
// When the outgoing deck has an active beatloop, Mixxx may pace the fade by track progress so the transition never completes. Set to 1 to drive the crossfader at a fixed rate so the transition always finishes.

midiAutoDJ.fadeDriveDurationWhenLoop = 20;
// Desired transition duration in seconds when driving (outgoing deck in loop). Set to match your AutoDJ transition duration in the Mixxx UI (e.g. 35). Script computes step from this and sleepDuration so the fade takes this many seconds. Set to 0 to use fadeDriveStepWhenLoop instead.

midiAutoDJ.fadeDriveStepWhenLoop = 0.028;
// Normalized crossfader step per tick when driving (outgoing deck in loop). Only used when fadeDriveDurationWhenLoop is 0. With sleepDuration=1000, 0.028 ≈ 35 s to complete (1/0.028 ≈ 36 ticks).

midiAutoDJ.randomTransitions = 1;
// Set to 1 to randomize transition style each time (EQ on/off, EQ speed, beats before first beat).
// Unit: Boolean (0 or 1); Default: 0

midiAutoDJ.randomPreStartNextBeatsOptions = [0, -2, -4, -8, -10, -12];
// When randomTransitions=1, pick randomly from these for the beat offset from the mix-in point.
// 0     = start exactly on the first beat (no lead-in, never before the song).
// Negative = beats AFTER (e.g. -4 = skip 4 beats of intro into the song).
// Positive = beats BEFORE — omit these to never start before the first beat.
// Values must be valid beatjump sizes or 0: 0 1 2 4 8 16 32 64 (sign sets direction).

midiAutoDJ.randomEQChance = 0.85;
// When randomTransitions=1, probability (0–1) of using EQ bass fade this transition. 0.85 = 85% use EQ, 15% pure crossfade.

midiAutoDJ.randomEQStepMin = 0.035;
midiAutoDJ.randomEQStepMax = 0.065;
// When randomTransitions=1, EQ fade step per tick (min–max). Higher = faster bass swap, lower = smoother.

midiAutoDJ.logRandomTransitions = 1;
// When randomTransitions=1, set to 1 to print each transition's random choices to the Mixxx log (Debug).

midiAutoDJ.randomEffectDuringFade = 0;
// Set to 1 to randomly apply an effect (FX1 or FX2) during the crossfade. Requires effect units loaded in Mixxx.
// Unit: Boolean (0 or 1); Default: 1

midiAutoDJ.randomEffectChance = 1.0;
// When randomEffectDuringFade=1, probability (0–1) of applying an effect this transition. 1.0 = always.

midiAutoDJ.randomEffectUnits = [1, 2];
// When randomEffectDuringFade=1, which effect units can be chosen. [1, 2] = FX1 and FX2.

midiAutoDJ.effectMixMin = 0.5;
midiAutoDJ.effectMixMax = 1.0;
// Unit mix (dry/wet) per transition is randomized in this range; both > 0.5 so effect is always > 50%.

midiAutoDJ.effectSlotWetMin = 0.5;
midiAutoDJ.effectSlotWetMax = 1.0;
// Effect slot parameter1 (wet/depth) per transition is randomized in this range; both > 0.5 so slot wet is always > 50%.

midiAutoDJ.effectSlots = [1, 2, 3];
// When randomEffectDuringFade=1, which effect slots (1–3) can be chosen. Only one random slot is enabled per transition.

midiAutoDJ.logEffectActivation = 1;
// Set to 1 to print when an effect unit is activated/deactivated (Mixxx log). Use 0 to reduce log noise.

midiAutoDJ.maxBpmAdjustment = 12;
// Maximum percentage adjustment of BPM allowed in order to sync beats
// Note that Mixxx can do double/half time mixing, e.g. sync 80bpm to 160bpm
// Unit: Percentage (not absolute BPM), Integer; Default: 25 (was 12; increase if all tracks get skipped)

midiAutoDJ.transpose = 0;
// Toggles whether to transpose the next track to match the previous (harmonic mixing).
// Set to 0 to keep every song in its original key (no key matching; next track never transposed).
// Unit: Boolean (0 or 1); Default: 0 (disabled). Set to 1 to enable harmonic mixing.

midiAutoDJ.transposeMax = 1;
// Maximum acceptable transposition in semitones
// Transposing by more than 1 tends to sound bad. However,
// if this script is unable to find a suitable song, it will ignore this limit.
// Unit: Integer (number of semitones); Default: 2

midiAutoDJ.restoreKeyAfterFade = 1;
// After the transition, restore the new track to its original (file) key (gradual during fade, then snap when fade ends).
// So: harmonic mix during the transition, then the track ends in its original key. Set to 0 to leave it in the synced key.
// Unit: Boolean (0 or 1); Default: 1

midiAutoDJ.keyRestoreRate = 0.08;
// How fast to restore key: fraction of the remaining difference applied per timer tick (e.g. 0.08 = ~8% per tick). Lower = slower, smoother.
// Unit: Float; Range: 0.01 to 1.0; Default: 0.08

// --- Best start/exit point (auto-pick) ---
midiAutoDJ.useIntroStart = 1;
// When the next track has Intro Start set (waveform marker), use it as the mix-in point instead of main cue.
// Gives a better musical start (e.g. first beat of the intro). Set to 0 to always use main cue.
// Unit: Boolean (0 or 1); Default: 1

midiAutoDJ.useOutroForExit = 0;
// When the current track has Outro Start set, use it as the exit point instead of hotcue exitCue.
// Set to 1 to prefer outro start when set. Unit: Boolean (0 or 1); Default: 0

midiAutoDJ.fallbackToStart = 1;
// When neither intro nor main cue is set, start from track start (0) so the transition still works.
// Unit: Boolean (0 or 1); Default: 1

midiAutoDJ.snapToFirstBeat = 1;
// When using fallback (no intro/main cue), snap to the first beat of the first bar using the beatgrid.
// Ensures the track starts on a downbeat. Set to 0 to start at position 0 without snapping.
// Unit: Boolean (0 or 1); Default: 1

midiAutoDJ.deferredSnapWhenAnalyzing = 1;
// When the track is not yet analyzed (beatgrid appears after load), retry snapping to the first beat
// every deferredSnapInterval ms until the beatgrid is ready or deferredSnapMaxRetries is reached.
// Unit: Boolean (0 or 1); Default: 1

midiAutoDJ.deferredSnapInterval = 600;
// How often to retry snapping when analysis is not ready. Unit: Milliseconds; Default: 600

midiAutoDJ.deferredSnapMaxRetries = 20;
// Stop retrying after this many attempts (~12 s at 600 ms). Unit: Integer; Default: 20

midiAutoDJ.logSkipReasons = 1;
// When the script skips a track, print the reason to the Mixxx log (Debug). Set to 1 to enable (can add load when many skips).
// Unit: Boolean (0 or 1); Default: 1

midiAutoDJ.avoidRecentMinutes = 60;
// Path for persistent recent-played cache (JSON). Empty = use engine.getPath("settings") + "/autodj_recent_played.json" if available. Persistence requires Mixxx to expose file I/O (e.g. engine.getPath, engine.readFile, engine.writeFile); otherwise cache is in-memory only.
midiAutoDJ.recentPlayedCachePath = "";
// Skip tracks that were played in the last N minutes (script keeps its own cache; Mixxx also updates "last played" in the library).
// Set to 0 to disable. Unit: Integer (minutes); Default: 60 (1 hour).

midiAutoDJ.alignBeatgridAtEntrance = 1;
// When you seek to Intro Start or main cue (entrance), align the beatgrid so the closest beat
// is at that position. Use this when auto beat detection is "off by half a beat": set your
// main cue (or Intro Start) on the real downbeat, then the script fixes the grid for that track.
// Only runs when entrance is intro or main cue (not when using fallback to start).
// Unit: Boolean (0 or 1); Default: 1

// Another option worth adjusting is the AutoDJ transition duration found in the GUI
// The default (10 seconds) is a bit long. 6-8 seconds may work better.

// More options can be found in the Options > Preferences menu
// Details here: https://blueprints.launchpad.net/mixxx/+spec/auto-dj-crates





// ADVANCED OPTIONS
// (these typically should not be adjusted unless you are making significant edits to the script)

midiAutoDJ.bpmSync = 1; // Toggles if BPM and beat phase are to be synced (1) or not (0).
// Unit: Binary

midiAutoDJ.bpmSyncFade = 1; // Toggles if BPM is to be synchronised slowly (1) during approximately the
// first two thirds of crossfading, or if it is to be adjusted abruptly (0)
// at the first beat found.
// Requires bpmSync to be enabled (1).
// Unit: Binary

midiAutoDJ.transposeSkipsMax = 6; // Number of times to skip a track before resorting to
// transposing more than the maximum amount
// Unit: Integer; Range: 1 to MaxInt; Default: 6 (higher = less likely to empty queue)

midiAutoDJ.fadeQuickEffect = 0; // Toggles if Quick Effect filter should be faded (1).
// or if it should stay untouched (0).
// Unit: Binary

midiAutoDJ.reverseQuickEffect = 0; // Toggles direction of Quick Effect fade.
// 0: Fade out to left, fade in from right.
// 1: Fade out to right, fade in from left.
// Unit: Binary

midiAutoDJ.fadeRange = 0.5; // Decide how far the Quick Effects knob should turn
// 0.0: No fade at all
// 0.5: Fade out to 25%, fade in from 75%
// 1.0: Fade out to 0%, fade in from 100%
// Unit: Float; Range: 0.0 to 1.0; Default: 0.5

// Advanced Options
midiAutoDJ.refineDuration = 1000; // Duration of sleeping between two track skips.
// If Mixxx appears to hang or be overwhelmed when searching
// for the next track, increase this value.
// Note: Must NOT be smaller than midiAutoDJ.sleepDuration
// Unit: Milliseconds; Default: 1000
midiAutoDJ.sleepDuration = 2000; // Duration of sleeping between actions (ms). Higher = less CPU/log load, slightly slower reaction.
// Higher values reduce CPU load and can prevent hangs/beachballs; lower gives snappier response.
// Unit: Milliseconds; Default: 1000 (use 500–750 if no hangs; 1000+ if Mixxx beachballs)

// Note to developers: Indent with tabs, align with spaces.
// JSHint configuration block:
/* jshint curly: true, eqeqeq: true, forin: true, freeze: true, futurehostile: true, latedef: true, nocomma: true, nonew: true, shadow: outer, singleGroups: true, strict: implied, undef: true, unused: true */
/* globals engine: false */

// Global Variables
midiAutoDJ.sleepTimer = 0; // 0 signifies a beginTimer error
midiAutoDJ.connected = 0; // 0 signifies disconnected state
midiAutoDJ.syncing = 0; // 1 signifies Mixxx should be trying to sync both decks
midiAutoDJ.skips = 0; // Counts skips
midiAutoDJ.transposeSkips = 0; // Counts skips due to undesirable transpositions
midiAutoDJ.refineWait = 0; // Counts timer cycles since last track skip
midiAutoDJ.songLoaded = 0; // If the next song has been loaded
midiAutoDJ.originalKeyNext = undefined; // Original (file) key of the next track, for gradual restore after fade
midiAutoDJ.deferredSnapDeck = -1; // Deck index waiting for beatgrid to snap to first beat, or -1
midiAutoDJ.deferredSnapTimerId = 0;
midiAutoDJ.deferredSnapRetries = 0;
midiAutoDJ.thisTransitionPreStartNextBeats = 0; // Random value when randomTransitions; 0 = use option
midiAutoDJ.thisTransitionUseEQ = 1;
midiAutoDJ.thisTransitionEQStep = 0.025;
midiAutoDJ.lastTransitionUseEQ = 1; // Used for EQ restore after fade (set during fade)
midiAutoDJ.thisTransitionEffectUnit = 0; // 0 = none, 1 = FX1, 2 = FX2
midiAutoDJ.thisTransitionEffectSlot = 1; // 1, 2, or 3 (one random per transition)
midiAutoDJ.thisTransitionEffectMix = 0.8; // random unit mix for this transition (0.5..1)
midiAutoDJ.thisTransitionEffectSlotWet = 0.8; // random slot parameter1 (wet) for this transition (0.5..1)
midiAutoDJ.lastTransitionEffectUnit = 0;
midiAutoDJ.lastTransitionEffectSlot = 1;
midiAutoDJ.loggedThisTransitionEffect = false;
// Cached control strings for effect rack (reused each tick to avoid per-transition string allocations and GC pressure).
midiAutoDJ._effectGroupCache = {};
midiAutoDJ._effectSlotCache = {};
midiAutoDJ._effectGroupKey = function(unit) {
    if (midiAutoDJ._effectGroupCache[unit] === undefined) { midiAutoDJ._effectGroupCache[unit] = "[EffectRack1_EffectUnit" + unit + "]"; }
    return midiAutoDJ._effectGroupCache[unit];
};
midiAutoDJ._effectSlotKey = function(unit, slot) {
    var k = unit + "_" + slot;
    if (midiAutoDJ._effectSlotCache[k] === undefined) { midiAutoDJ._effectSlotCache[k] = "[EffectRack1_EffectUnit" + unit + "_Effect" + slot + "]"; }
    return midiAutoDJ._effectSlotCache[k];
};
midiAutoDJ.transitionTargetDeck = 0; // Deck that is coming in (1 or 2), set when we prepare; used for bass so direction is correct for both 1->2 and 2->1
midiAutoDJ.fadeSourceHoldTicksLeft = 0; // Countdown for holding crossfader at source full (set when we prepare; decremented in fade block).
midiAutoDJ.drivenCrossfaderWhenLoop = -1; // When driving crossfader (source in loop), our position 0..1; -1 = not driving (so we don't rely on engine value which Mixxx overwrites).
midiAutoDJ.autoDJConnection = null; // engine.makeConnection object for [AutoDJ] enabled; used in init/shutdown.
midiAutoDJ.recentPlayed = {}; // { trackId: timestamp } for avoidRecentMinutes; pruned each tick.
midiAutoDJ.recentPlayedMaxSize = 500; // Safety cap: if cache exceeds this, clear it (prevents unbounded growth).
midiAutoDJ.lastMarkedPrevTrackId = null; // So we only mark the outgoing track once per transition.
midiAutoDJ.RECENT_PLAYED_CACHE_FILENAME = "autodj_recent_played.json";

// Resolve full path for the recent-played cache file. Returns a string path or "" if unavailable.
midiAutoDJ.getRecentPlayedCachePath = function() {
 if (midiAutoDJ.recentPlayedCachePath && typeof midiAutoDJ.recentPlayedCachePath === "string") {
  return midiAutoDJ.recentPlayedCachePath;
 }
 if (typeof engine.getPath === "function") {
  var base = engine.getPath("settings") || engine.getPath("user") || engine.getPath("");
  if (base && typeof base === "string") {
   return base + "/" + midiAutoDJ.RECENT_PLAYED_CACHE_FILENAME;
  }
 }
 return "";
};

// Load recent-played cache from file into midiAutoDJ.recentPlayed. Merges with existing; does not clear. Prunes entries older than avoidRecentMinutes after load. No-op if file I/O unavailable.
midiAutoDJ.loadRecentPlayedCache = function() {
 var path = midiAutoDJ.getRecentPlayedCachePath();
 if (!path) { return; }
 try {
  if (typeof engine.readFile !== "function") { return; }
  var raw = engine.readFile(path);
  if (typeof raw !== "string" || !raw.length) { return; }
  var data = JSON.parse(raw);
  if (data && typeof data === "object") {
   for (var k in data) { if (data.hasOwnProperty(k) && typeof data[k] === "number") { midiAutoDJ.recentPlayed[k] = data[k]; } }
  }
  var cutoff = Date.now() - midiAutoDJ.avoidRecentMinutes * 60 * 1000;
  for (var r in midiAutoDJ.recentPlayed) { if (midiAutoDJ.recentPlayed[r] < cutoff) { delete midiAutoDJ.recentPlayed[r]; } }
 } catch (e) { /* ignore parse or read errors */ }
};

// Save midiAutoDJ.recentPlayed to file. No-op if path or file I/O unavailable.
midiAutoDJ.saveRecentPlayedCache = function() {
 var path = midiAutoDJ.getRecentPlayedCachePath();
 if (!path) { return; }
 try {
  if (typeof engine.writeFile !== "function") { return; }
  engine.writeFile(path, JSON.stringify(midiAutoDJ.recentPlayed));
 } catch (e) { /* ignore */ }
};

// Return a stable id for the track loaded on deck (for avoidRecentMinutes). Uses duration+file_bpm+track_samples (track_location not used; it is not available in all Mixxx builds and causes "Unknown control" warnings).
midiAutoDJ.getTrackId = function(deck) {
 var dur = engine.getValue("[Channel"+deck+"]", "duration");
 var bpm = engine.getValue("[Channel"+deck+"]", "file_bpm");
 var samples = engine.getValue("[Channel"+deck+"]", "track_samples");
 return (dur || 0) + "," + (bpm || 0) + "," + (samples || 0);
};

// Apply controller settings from the mapping XML (Preferences > Controllers > [device] settings).
// When the script is loaded via AutoDJ.midi.xml (or any mapping that defines these settings),
// values from the UI override the script defaults above. If getSetting is unavailable or returns
// undefined for a setting, the script default is kept.
midiAutoDJ.applySettings = function() {
 if (typeof engine.getSetting !== "function") {
  return;
 }
 var v;
 function num(x) {
  if (typeof x === "number" && !isNaN(x)) return x;
  if (typeof x === "string") { var n = parseFloat(x, 10); return !isNaN(n) ? n : undefined; }
  return undefined;
 }
 function bool(x) { if (typeof x === "boolean") return x ? 1 : 0; if (typeof x === "number") return x ? 1 : 0; if (typeof x === "string") return (x === "true" || x === "1") ? 1 : 0; return undefined; }
 if ((v = engine.getSetting("exitCue")) !== undefined) { midiAutoDJ.exitCue = num(v) !== undefined ? Math.round(num(v)) : midiAutoDJ.exitCue; }
 if ((v = engine.getSetting("preStart")) !== undefined) { midiAutoDJ.preStart = num(v) !== undefined ? Math.round(num(v)) : midiAutoDJ.preStart; }
 if ((v = engine.getSetting("preStartNextBeats")) !== undefined) { midiAutoDJ.preStartNextBeats = num(v) !== undefined ? Math.round(num(v)) : midiAutoDJ.preStartNextBeats; }
 if ((v = bool(engine.getSetting("useIntroStart"))) !== undefined) { midiAutoDJ.useIntroStart = v; }
 if ((v = bool(engine.getSetting("useOutroForExit"))) !== undefined) { midiAutoDJ.useOutroForExit = v; }
 if ((v = bool(engine.getSetting("fallbackToStart"))) !== undefined) { midiAutoDJ.fallbackToStart = v; }
 if ((v = bool(engine.getSetting("snapToFirstBeat"))) !== undefined) { midiAutoDJ.snapToFirstBeat = v; }
 if ((v = bool(engine.getSetting("alignBeatgridAtEntrance"))) !== undefined) { midiAutoDJ.alignBeatgridAtEntrance = v; }
 if ((v = bool(engine.getSetting("useEQ"))) !== undefined) { midiAutoDJ.useEQ = v; }
 if ((v = engine.getSetting("normalBassLevel")) !== undefined && num(v) !== undefined) { midiAutoDJ.normalBassLevel = num(v); }
 if ((v = engine.getSetting("normalTrebleLevel")) !== undefined && num(v) !== undefined) { midiAutoDJ.normalTrebleLevel = num(v); }
 if ((v = engine.getSetting("bassRestoreStepDuringFade")) !== undefined && num(v) !== undefined) { midiAutoDJ.bassRestoreStepDuringFade = num(v); }
 if ((v = engine.getSetting("fadeSourceHoldTicks")) !== undefined) { midiAutoDJ.fadeSourceHoldTicks = num(v) !== undefined ? Math.round(num(v)) : midiAutoDJ.fadeSourceHoldTicks; }
 if ((v = bool(engine.getSetting("fadeDriveWhenLoop"))) !== undefined) { midiAutoDJ.fadeDriveWhenLoop = v; }
 if ((v = engine.getSetting("fadeDriveDurationWhenLoop")) !== undefined) { midiAutoDJ.fadeDriveDurationWhenLoop = num(v) !== undefined ? Math.round(num(v)) : midiAutoDJ.fadeDriveDurationWhenLoop; }
 if ((v = bool(engine.getSetting("randomTransitions"))) !== undefined) { midiAutoDJ.randomTransitions = v; }
 if ((v = engine.getSetting("randomEQChance")) !== undefined && num(v) !== undefined) { midiAutoDJ.randomEQChance = num(v); }
 if ((v = engine.getSetting("randomEQStepMin")) !== undefined && num(v) !== undefined) { midiAutoDJ.randomEQStepMin = num(v); }
 if ((v = engine.getSetting("randomEQStepMax")) !== undefined && num(v) !== undefined) { midiAutoDJ.randomEQStepMax = num(v); }
 if ((v = bool(engine.getSetting("logRandomTransitions"))) !== undefined) { midiAutoDJ.logRandomTransitions = v; }
 if ((v = bool(engine.getSetting("randomEffectDuringFade"))) !== undefined) { midiAutoDJ.randomEffectDuringFade = v; }
 if ((v = engine.getSetting("randomEffectChance")) !== undefined && num(v) !== undefined) { midiAutoDJ.randomEffectChance = num(v); }
 if ((v = engine.getSetting("effectMixMin")) !== undefined && num(v) !== undefined) { midiAutoDJ.effectMixMin = num(v); }
 if ((v = engine.getSetting("effectMixMax")) !== undefined && num(v) !== undefined) { midiAutoDJ.effectMixMax = num(v); }
 if ((v = engine.getSetting("effectSlotWetMin")) !== undefined && num(v) !== undefined) { midiAutoDJ.effectSlotWetMin = num(v); }
 if ((v = engine.getSetting("effectSlotWetMax")) !== undefined && num(v) !== undefined) { midiAutoDJ.effectSlotWetMax = num(v); }
 if ((v = bool(engine.getSetting("logEffectActivation"))) !== undefined) { midiAutoDJ.logEffectActivation = v; }
 if ((v = engine.getSetting("maxBpmAdjustment")) !== undefined) { midiAutoDJ.maxBpmAdjustment = num(v) !== undefined ? Math.round(num(v)) : midiAutoDJ.maxBpmAdjustment; }
 if ((v = bool(engine.getSetting("transpose"))) !== undefined) { midiAutoDJ.transpose = v; }
 if ((v = engine.getSetting("transposeMax")) !== undefined) { midiAutoDJ.transposeMax = num(v) !== undefined ? Math.round(num(v)) : midiAutoDJ.transposeMax; }
 if ((v = bool(engine.getSetting("restoreKeyAfterFade"))) !== undefined) { midiAutoDJ.restoreKeyAfterFade = v; }
 if ((v = engine.getSetting("avoidRecentMinutes")) !== undefined) { midiAutoDJ.avoidRecentMinutes = num(v) !== undefined ? Math.max(0, Math.round(num(v))) : midiAutoDJ.avoidRecentMinutes; }
// recentPlayedCachePath not in XML (string type unsupported); set in script if needed
};

// Functions
midiAutoDJ.init = function(id) { // Called by Mixxx
 id = 0; // Satisfy JSHint, but keep Mixxx function signature
 try {
 midiAutoDJ.applySettings();
 } catch (e) { /* ignore so timer still starts */ }
 engine.setValue("[Channel1]", "quantize", 1.0);
 engine.setValue("[Channel2]", "quantize", 1.0);
 engine.setValue("[Channel1]", "keylock", 1.0);
 engine.setValue("[Channel2]", "keylock", 1.0);
 engine.setValue("[Channel1]", "keylockMode", 0.0);
 engine.setValue("[Channel2]", "keylockMode", 0.0);
 engine.setValue("[Master]", "crossfader", -1.0); // Assumes empty decks on Channel1 and Channel2; see Notes section above

 try {
 // Prefer makeConnection (Mixxx 2.5+); connectControl is deprecated and may not invoke the callback.
 if (typeof engine.makeConnection === "function") {
 midiAutoDJ.autoDJConnection = engine.makeConnection("[AutoDJ]", "enabled", midiAutoDJ.toggle);
 if (midiAutoDJ.autoDJConnection) {
 midiAutoDJ.connected = 1;
 midiAutoDJ.autoDJConnection.trigger();
 }
 }
 if (!midiAutoDJ.connected && typeof engine.connectControl === "function") {
 if (engine.connectControl("[AutoDJ]", "enabled", "midiAutoDJ.toggle")) {
 midiAutoDJ.connected = 1;
 engine.trigger("[AutoDJ]", "enabled");
 }
 }
 } catch (e) { /* ignore so timer still starts */ }
// Load persistent recent-played cache if path and file I/O available
midiAutoDJ.loadRecentPlayedCache();
if (midiAutoDJ.getRecentPlayedCachePath() && (typeof engine.readFile !== "function" || typeof engine.writeFile !== "function") && !midiAutoDJ._loggedRecentPlayedNoFileIO) {
 midiAutoDJ._loggedRecentPlayedNoFileIO = true;
 console.log("AutoDJ: Recent-played persistence disabled (no file I/O in this Mixxx build). Cache is in-memory only.");
}
// Always start the timer last so main() runs every tick. main() returns when [AutoDJ] enabled is 0.
// Do not stop this timer in toggle(0), or it may never restart (trigger() can run async and stop it).
if (!midiAutoDJ.sleepTimer) {
midiAutoDJ.sleepTimer = engine.beginTimer(midiAutoDJ.sleepDuration, midiAutoDJ.main);
}
};

midiAutoDJ.shutdown = function(id) { // Called by Mixxx
 id = 0; // Satisfy JSHint, but keep Mixxx function signature
 midiAutoDJ.saveRecentPlayedCache();
 if (midiAutoDJ.autoDJConnection && typeof midiAutoDJ.autoDJConnection.disconnect === "function") {
 midiAutoDJ.autoDJConnection.disconnect();
 midiAutoDJ.autoDJConnection = null;
 }
 if (midiAutoDJ.connected && typeof engine.connectControl === "function") {
 engine.connectControl("[AutoDJ]", "enabled", "midiAutoDJ.toggle", true);
 }
 midiAutoDJ.connected = 0;
 if (midiAutoDJ.sleepTimer) {
 engine.stopTimer(midiAutoDJ.sleepTimer);
 }
 if (midiAutoDJ.deferredSnapTimerId) {
 engine.stopTimer(midiAutoDJ.deferredSnapTimerId);
 midiAutoDJ.deferredSnapTimerId = 0;
 midiAutoDJ.deferredSnapDeck = -1;
 }
};

midiAutoDJ.tryDeferredSnap = function() {
 if (midiAutoDJ.deferredSnapDeck < 0) {
 return;
 }
 var crossfader = engine.getValue("[Master]", "crossfader");
 var next = (crossfader < 0) ? 2 : 1;
 if (next !== midiAutoDJ.deferredSnapDeck) {
 midiAutoDJ.deferredSnapDeck = -1;
 midiAutoDJ.deferredSnapRetries = 0;
 if (midiAutoDJ.deferredSnapTimerId) {
 engine.stopTimer(midiAutoDJ.deferredSnapTimerId);
 midiAutoDJ.deferredSnapTimerId = 0;
 }
 return;
 }
 midiAutoDJ.deferredSnapRetries++;
 var d = midiAutoDJ.deferredSnapDeck;
 if (engine.getValue("[Channel"+d+"]", "play_indicator")) {
 midiAutoDJ.deferredSnapDeck = -1;
 midiAutoDJ.deferredSnapRetries = 0;
 if (midiAutoDJ.deferredSnapTimerId) {
 engine.stopTimer(midiAutoDJ.deferredSnapTimerId);
 midiAutoDJ.deferredSnapTimerId = 0;
 }
 return;
 }
 var bpm = engine.getValue("[Channel"+d+"]", "file_bpm");
 var beatClosest = engine.getValue("[Channel"+d+"]", "beat_closest");
 var dur = engine.getValue("[Channel"+d+"]", "duration");
 var sr = engine.getValue("[Channel"+d+"]", "track_samplerate");
 if (bpm > 0 && beatClosest >= 0 && dur > 0 && sr > 0) {
 var firstBeatNorm = beatClosest / (dur * sr);
 if (firstBeatNorm >= 0 && firstBeatNorm <= 1) {
 engine.setValue("[Channel"+d+"]", "playposition", firstBeatNorm);
 var pnb = midiAutoDJ.thisTransitionPreStartNextBeats || midiAutoDJ.preStartNextBeats;
 if (pnb > 0) {
 engine.setValue("[Channel"+d+"]", "beatjump_"+pnb+"_backward", 1.0);
 engine.setValue("[Channel"+d+"]", "beatjump_"+pnb+"_backward", 0.0);
 } else if (pnb < 0) {
 engine.setValue("[Channel"+d+"]", "beatjump_"+(-pnb)+"_forward", 1.0);
 engine.setValue("[Channel"+d+"]", "beatjump_"+(-pnb)+"_forward", 0.0);
 }
 }
 midiAutoDJ.deferredSnapDeck = -1;
 midiAutoDJ.deferredSnapRetries = 0;
 if (midiAutoDJ.deferredSnapTimerId) {
 engine.stopTimer(midiAutoDJ.deferredSnapTimerId);
 midiAutoDJ.deferredSnapTimerId = 0;
 }
 return;
 }
 if (midiAutoDJ.deferredSnapRetries >= midiAutoDJ.deferredSnapMaxRetries) {
 midiAutoDJ.deferredSnapDeck = -1;
 midiAutoDJ.deferredSnapRetries = 0;
 if (midiAutoDJ.deferredSnapTimerId) {
 engine.stopTimer(midiAutoDJ.deferredSnapTimerId);
 midiAutoDJ.deferredSnapTimerId = 0;
 }
 }
};

midiAutoDJ.toggle = function(value, group, control) { // Called by signal connection
 group = 0; // Satisfy JSHint, but keep Mixxx function signature
 control = 0; // Satisfy JSHint, but keep Mixxx function signature
 if (value) {
 midiAutoDJ.songLoaded = 0;
 if (midiAutoDJ.sleepTimer) {
 engine.stopTimer(midiAutoDJ.sleepTimer);
 midiAutoDJ.sleepTimer = 0;
 }
 midiAutoDJ.sleepTimer = engine.beginTimer(midiAutoDJ.sleepDuration, midiAutoDJ.main);
 } else {
 // Do NOT stop the timer here. The timer is started in init() and main() returns when [AutoDJ] enabled is 0.
 // If we stopped the timer, it would never restart when the user enables Auto DJ (callback may not fire in some Mixxx builds).
 }
 if (midiAutoDJ.deferredSnapTimerId) {
 engine.stopTimer(midiAutoDJ.deferredSnapTimerId);
 midiAutoDJ.deferredSnapTimerId = 0;
 midiAutoDJ.deferredSnapDeck = -1;
 midiAutoDJ.deferredSnapRetries = 0;
 }
};

// Note: Technically, it would be cleaner to use signal connections instead of a timer.
// However, I prefer keeping this simple; it's just a MIDI script, after all.
midiAutoDJ.main = function() { // Called by timer
 if (!engine.getValue("[AutoDJ]", "enabled")) {
 return;
 }
 var skip = 0;
 var deck1Playing = engine.getValue("[Channel1]", "play_indicator");
 var deck2Playing = engine.getValue("[Channel2]", "play_indicator");
 var prev = 1;
 var next = 2;
 var prevPos = engine.getValue("[Channel"+prev+"]", "playposition");
 var nextPos = engine.getValue("[Channel"+next+"]", "playposition");
 if ( prevPos === -1 || nextPos === -1 ) {
 return;
 }

 if (deck1Playing && ! deck2Playing) {
 prev = 1; // actually this is already assigned 1 and we don't need to do it again
 next = 2;
 } else if (deck2Playing && ! deck1Playing) {
 prev = 2; // swap prev and next
 next = 1;
 var tmp = nextPos;
 nextPos = prevPos;
 prevPos = tmp;
 } else { // the one with the smaller position is designated as next
 if (prevPos < nextPos) {
 var tmp = nextPos;
 nextPos = prevPos;
 prevPos = tmp;
 next = 1;
 prev = 2;
 }
 }

 var nextPlaying = engine.getValue("[Channel"+next+"]", "play_indicator");

 // Reset "was in fade" when not both playing, so we don't clear transition state on the next "else" run before fade starts (nextPos <= -0.15).
 if (!(deck1Playing && deck2Playing)) { midiAutoDJ._wasInFade = false; }

 var prevBpm = engine.getValue("[Channel"+prev+"]", "file_bpm");
 var nextBpm = engine.getValue("[Channel"+next+"]", "file_bpm");

 // Skip BPM checks if either track has no/invalid BPM (avoids skipping every track when not analyzed)
 if (!prevBpm || !nextBpm || prevBpm <= 0 || nextBpm <= 0) {
 prevBpm = prevBpm || 120;
 nextBpm = nextBpm || 120;
 }

 // Calcuate the BPM percentage difference that the next track will
 // have to be adjusted by in order to match the previous
 var diffBpm = 100 * Math.abs(nextBpm - prevBpm) / nextBpm;
 var diffBpmDouble = 0; // diffBpm, with bpm of ONE track doubled
 // Note: Where appropriate, Mixxx will automatically match two beats of one.
 if (nextBpm < prevBpm) {
 diffBpmDouble = 100 * Math.abs(nextBpm - prevBpm*0.5) / nextBpm;
 } else {
 diffBpmDouble = 100 * Math.abs(nextBpm - prevBpm*2) / nextBpm;
 }

// Normalised crossfader variable to be used at several points below:
var crossfader = engine.getValue("[Master]", "crossfader"); // Oscillates between -1.0 and 1.0
crossfader = (crossfader+1.0)/2.0; // Oscillates between 0.0 and 1.0
if ( next === 1 ) {
crossfader = 1.0-crossfader; // Fades from 0.0 to 1.0
}

// Treble stays at ideal value for both decks at all times (never moved during transitions).
engine.setValue("[EqualizerRack1_[Channel1]_Effect1]", "parameter3", midiAutoDJ.normalTrebleLevel);
engine.setValue("[EqualizerRack1_[Channel2]_Effect1]", "parameter3", midiAutoDJ.normalTrebleLevel);

// Safety: when both decks are playing and crossfader is at an extreme, set that deck's bass to normal. When only one deck is playing we don't touch bass so the user can adjust it.
if (deck1Playing && deck2Playing) {
    if (midiAutoDJ.transitionTargetDeck >= 1 && midiAutoDJ.transitionTargetDeck <= 2) {
        var targetD = midiAutoDJ.transitionTargetDeck;
        var sourceD = 3 - targetD;
        if (crossfader >= 0.99) {
            engine.setValue("[EqualizerRack1_[Channel"+targetD+"]_Effect1]", "parameter1", midiAutoDJ.normalBassLevel);
        } else if (crossfader <= 0.01) {
            engine.setValue("[EqualizerRack1_[Channel"+sourceD+"]_Effect1]", "parameter1", midiAutoDJ.normalBassLevel);
        }
    } else {
        if (crossfader >= 0.99) {
            engine.setValue("[EqualizerRack1_[Channel"+next+"]_Effect1]", "parameter1", midiAutoDJ.normalBassLevel);
        } else if (crossfader <= 0.01) {
            engine.setValue("[EqualizerRack1_[Channel"+prev+"]_Effect1]", "parameter1", midiAutoDJ.normalBassLevel);
        }
    }
}

   // Next track is playing --> Fade in progress
    if (nextPlaying && nextPos > -0.15) {
 midiAutoDJ._wasInFade = true; // so we only clear transition state when we leave the fade, not when "else" runs before fade starts (nextPos <= -0.15)
 skip = 0;
 midiAutoDJ.songLoaded = 0;
 midiAutoDJ.lastTransitionUseEQ = midiAutoDJ.thisTransitionUseEQ;

        // Mark the outgoing (prev) track as played for avoidRecentMinutes
        if (midiAutoDJ.avoidRecentMinutes > 0) {
            var prevId = midiAutoDJ.getTrackId(prev);
            if (prevId && prevId !== midiAutoDJ.lastMarkedPrevTrackId) {
                var rpCount = 0;
                for (var _rp in midiAutoDJ.recentPlayed) { rpCount++; }
                if (rpCount >= midiAutoDJ.recentPlayedMaxSize) {
                    midiAutoDJ.recentPlayed = {};
                    if (!midiAutoDJ._recentPlayedCapLogged) { midiAutoDJ._recentPlayedCapLogged = true; console.log("AutoDJ: recent-played cache cleared (size cap " + midiAutoDJ.recentPlayedMaxSize + " reached)."); }
                }
                var playedAt = Date.now();
                midiAutoDJ.recentPlayed[prevId] = playedAt;
                midiAutoDJ.lastMarkedPrevTrackId = prevId;
                midiAutoDJ.saveRecentPlayedCache();
                var displayId = prevId.indexOf("/") >= 0 ? prevId.substring(prevId.lastIndexOf("/") + 1) : prevId;
                if (displayId.length > 60) { displayId = displayId.substring(0, 57) + "..."; }
                var songName = "";
                try {
                    if (typeof engine.getPlayer === "function") {
                        var pl = engine.getPlayer("[Channel"+prev+"]") || engine.getPlayer("Channel"+prev);
                        if (pl) {
                            var a = (typeof pl.artist === "string" ? pl.artist : "") || "";
                            var t = (typeof pl.title === "string" ? pl.title : "") || "";
                            if (a || t) { songName = (a ? a + " - " : "") + t; }
                        }
                    }
                } catch (e) { /* getPlayer or metadata not available in this context */ }
                if (songName.length > 80) { songName = songName.substring(0, 77) + "..."; }
                console.log("AutoDJ: Added to recent-played cache: " + (songName || displayId) + (songName ? " (" + displayId + ") " : " ") + "at " + new Date(playedAt).toLocaleString());
            }
        }

        // When outgoing deck has a loop, we take full control of the crossfader (skip hold, drive from our own position so Mixxx can't pull it back).
        var sourceLoopActive = engine.getValue("[Channel"+prev+"]", "loop_enabled");
        if (sourceLoopActive && midiAutoDJ.fadeDriveWhenLoop) {
            midiAutoDJ.fadeSourceHoldTicksLeft = 0; // skip hold phase so we drive from the start
        }

        // Fade using EQ (when this transition uses EQ): simple bass behavior.
        // Use stored transitionTargetDeck so 1->2 and 2->1 both work (prev/next from position can be wrong).
        if (midiAutoDJ.thisTransitionUseEQ && midiAutoDJ.transitionTargetDeck >= 1 && midiAutoDJ.transitionTargetDeck <= 2) {
            var targetDeck = midiAutoDJ.transitionTargetDeck;
            var sourceDeck = 3 - targetDeck; // 1->2 or 2->1
            // First half of transition: keep source at full by holding crossfader at "all source" for N ticks (then let it move). Skipped when source is in loop (we drive instead).
            if (midiAutoDJ.fadeSourceHoldTicksLeft > 0) {
                engine.setValue("[Master]", "crossfader", sourceDeck === 1 ? -1.0 : 1.0);
                midiAutoDJ.fadeSourceHoldTicksLeft--;
            }
            // Source track: bass stays at normalBassLevel for the whole transition (fader does the fade-out).
            engine.setValue("[EqualizerRack1_[Channel"+sourceDeck+"]_Effect1]", "parameter1", midiAutoDJ.normalBassLevel);
            // Target track: bass starts at 0, ramps to normalBassLevel only from halfway through the transition (crossfader > 0.5).
            if (crossfader > 0.5) {
                var targetBassVal = engine.getValue("[EqualizerRack1_[Channel"+targetDeck+"]_Effect1]", "parameter1");
                var targetBass = midiAutoDJ.normalBassLevel;
                if (targetBassVal < targetBass) {
                    targetBassVal = Math.min(targetBassVal + midiAutoDJ.bassRestoreStepDuringFade, targetBass);
                    engine.setValue("[EqualizerRack1_[Channel"+targetDeck+"]_Effect1]", "parameter1", targetBassVal);
                } else if (targetBassVal > targetBass) {
                    engine.setValue("[EqualizerRack1_[Channel"+targetDeck+"]_Effect1]", "parameter1", targetBass);
                }
            }
        }

        // When outgoing deck has an active loop, drive the crossfader from our own stored position so Mixxx automation can't overwrite and stall the fade.
        // Once we reach the end, keep writing "all target" every tick until the fade ends (Mixxx can overwrite otherwise and the fade never completes).
        if (sourceLoopActive && midiAutoDJ.fadeDriveWhenLoop && (crossfader < 0.99 || midiAutoDJ.drivenCrossfaderWhenLoop >= 0.99)) {
            if (midiAutoDJ.drivenCrossfaderWhenLoop >= 0.99) {
                // Already at end: keep forcing crossfader to "all target" so Mixxx doesn't pull it back
                var physicalEnd = (next === 1) ? -1.0 : 1.0; // all target
                engine.setValue("[Master]", "crossfader", physicalEnd);
                crossfader = 1.0;
            } else {
                if (midiAutoDJ.drivenCrossfaderWhenLoop < 0) {
                    midiAutoDJ.drivenCrossfaderWhenLoop = crossfader < 0 ? 0 : crossfader; // start from 0 or current if already moved
                }
                var step = midiAutoDJ.fadeDriveDurationWhenLoop > 0
                    ? (midiAutoDJ.sleepDuration / 1000) / midiAutoDJ.fadeDriveDurationWhenLoop
                    : midiAutoDJ.fadeDriveStepWhenLoop;
                var newCrossfader = Math.min(1.0, midiAutoDJ.drivenCrossfaderWhenLoop + step);
                var physical = (next === 1) ? (1 - 2*newCrossfader) : (2*newCrossfader - 1);
                engine.setValue("[Master]", "crossfader", physical);
                midiAutoDJ.drivenCrossfaderWhenLoop = newCrossfader;
                crossfader = newCrossfader;
            }
        }

        // At the end of the fade, force the target deck's bass to normal.
        if (crossfader >= 0.99 && midiAutoDJ.transitionTargetDeck >= 1 && midiAutoDJ.transitionTargetDeck <= 2) {
            engine.setValue("[EqualizerRack1_[Channel"+midiAutoDJ.transitionTargetDeck+"]_Effect1]", "parameter1", midiAutoDJ.normalBassLevel);
        }

        // Random effect during fade: only one effect at a time. At start we turn all managed units off, then enable only the chosen one. At end we turn all off.
        if (midiAutoDJ.randomEffectDuringFade && midiAutoDJ.thisTransitionEffectUnit > 0 && midiAutoDJ.thisTransitionEffectSlot >= 1 && midiAutoDJ.thisTransitionEffectSlot <= 3) {
            var eu = midiAutoDJ.thisTransitionEffectUnit;
            var slot = midiAutoDJ.thisTransitionEffectSlot;
            var group = midiAutoDJ._effectGroupKey(eu);
            // First tick of this transition: ensure only one effect is on by turning all managed units off, then enable our one.
            if (!midiAutoDJ.loggedThisTransitionEffect) {
                var units = midiAutoDJ.randomEffectUnits;
                if (units && units.length > 0) {
                    for (var u = 0; u < units.length; u++) {
                        var un = units[u];
                        var g = midiAutoDJ._effectGroupKey(un);
                        engine.setValue(g, "enabled", 0.0);
                        engine.setValue(g, "mix", 0.0);
                        engine.setValue(g, "group_[Channel1]_enable", 0.0);
                        engine.setValue(g, "group_[Channel2]_enable", 0.0);
                        engine.setValue(midiAutoDJ._effectSlotKey(un, 1), "enabled", 0.0);
                        engine.setValue(midiAutoDJ._effectSlotKey(un, 2), "enabled", 0.0);
                        engine.setValue(midiAutoDJ._effectSlotKey(un, 3), "enabled", 0.0);
                    }
                }
                engine.setValue(midiAutoDJ._effectSlotKey(eu, slot), "parameter1", midiAutoDJ.thisTransitionEffectSlotWet);
                if (midiAutoDJ.logEffectActivation) {
                    print("[AutoDJ script] Effect FX"+eu+" slot "+slot+" on outgoing deck (Channel"+prev+"), mix ramping");
                }
                midiAutoDJ.loggedThisTransitionEffect = true;
            }
            engine.setValue(group, "group_[Channel"+prev+"]_enable", 1.0);
            engine.setValue(group, "group_[Channel"+next+"]_enable", 0.0);
            engine.setValue(group, "enabled", 1.0);
            engine.setValue(midiAutoDJ._effectSlotKey(eu, slot), "enabled", 1.0);
            var mix = (midiAutoDJ.thisTransitionEffectMix != null ? midiAutoDJ.thisTransitionEffectMix : 0.8) * 4 * crossfader * (1.0 - crossfader);
            engine.setValue(group, "mix", mix);
            if (crossfader >= 0.99) {
                // End of fade: turn off all managed effect units and slots; clear transition state so GC can reclaim.
                var unitsEnd = midiAutoDJ.randomEffectUnits;
                if (unitsEnd && unitsEnd.length > 0) {
                    for (var ue = 0; ue < unitsEnd.length; ue++) {
                        var un = unitsEnd[ue];
                        var ge = midiAutoDJ._effectGroupKey(un);
                        engine.setValue(ge, "enabled", 0.0);
                        engine.setValue(ge, "mix", 0.0);
                        engine.setValue(ge, "group_[Channel1]_enable", 0.0);
                        engine.setValue(ge, "group_[Channel2]_enable", 0.0);
                        engine.setValue(midiAutoDJ._effectSlotKey(un, 1), "enabled", 0.0);
                        engine.setValue(midiAutoDJ._effectSlotKey(un, 2), "enabled", 0.0);
                        engine.setValue(midiAutoDJ._effectSlotKey(un, 3), "enabled", 0.0);
                    }
                }
                if (midiAutoDJ.logEffectActivation) {
                    print("[AutoDJ script] Effect unit "+eu+" slot "+slot+" deactivated (end of fade); all effects off");
                }
                midiAutoDJ.lastTransitionEffectUnit = eu;
                midiAutoDJ.lastTransitionEffectSlot = slot;
                midiAutoDJ.thisTransitionEffectUnit = 0;
                midiAutoDJ.thisTransitionEffectSlot = 0;
                midiAutoDJ.thisTransitionEffectMix = null;
                midiAutoDJ.thisTransitionEffectSlotWet = null;
            }
        }

 if (midiAutoDJ.restoreKeyAfterFade && midiAutoDJ.originalKeyNext !== undefined && crossfader > 0.85) {
 var curKey = engine.getValue("[Channel"+next+"]", "key");
 var diff = midiAutoDJ.originalKeyNext - curKey;
 if (Math.abs(diff) > 0.005) {
 var step = diff * midiAutoDJ.keyRestoreRate;
 engine.setValue("[Channel"+next+"]", "key", curKey + step);
 } else {
 engine.setValue("[Channel"+next+"]", "key", midiAutoDJ.originalKeyNext);
 midiAutoDJ.originalKeyNext = undefined;
 }
 }

 if ( midiAutoDJ.bpmSync ) {
 // Note: In order to get BPM to sync, but not key, and to get beats aligned nicely,
 // I tried lots of variants with sync_enabled, sync_master, beatsync, beatsync_phase, beat_active, ...
 // Nothing really worked well, except for the following abomination, which,
 // at least, does the job somewhat okay-ish...
 // Note: Sometimes, Mixxx does not sync close enough for === operator
 if ( crossfader > 0.75 && midiAutoDJ.syncing ) { // 0.75 should leave at more than one midiAutoDJ.sleepDuration of time
 // Beat phases should be synchronised by now, so disable sync and clear modes
 midiAutoDJ.syncing = 0;
 engine.setValue("[Channel"+next+"]", "sync_enabled", 0.0);
 engine.setValue("[Channel"+prev+"]", "sync_enabled", 0.0);
 engine.setValue("[Channel"+prev+"]", "sync_mode", 0.0);
 engine.setValue("[Channel"+next+"]", "sync_mode", 0.0);
 } else if (crossfader < 0.75 && ! midiAutoDJ.syncing ) { // Synchronize BPM and beat phase
 // Sync Modes: 0=None, 1=Follower, 2=Master. Next deck = follower, prev = master.
 // Keep sync_enabled ON (1.0) so the next deck stays in sync during the fade (was toggling 1/0 which turned sync off).
 midiAutoDJ.syncing = 1;
 engine.setValue("[Channel"+next+"]", "sync_mode", 1.0);
 engine.setValue("[Channel"+prev+"]", "sync_mode", 2.0);
 engine.setValue("[Channel"+next+"]", "sync_enabled", 1.0);
 } else if (crossfader < 0.75 && midiAutoDJ.syncing ) {
 engine.setValue("[Channel"+next+"]", "sync_enabled", 1.0);
 }
 if ( midiAutoDJ.bpmSyncFade && midiAutoDJ.syncing ) {
 // This is not linear; incremental adjustments start and end slowly
 // Note: Must finish before crossfader = 0.75 because of the above code block
 var prevBpmCurrent=engine.getValue("[Channel"+prev+"]", "bpm");
 var adjustedBpm=prevBpmCurrent+0.25*crossfader*(nextBpm-prevBpmCurrent);
 if ( diffBpmDouble < diffBpm ) {
 if ( nextBpm < prevBpm ) {
 adjustedBpm=prevBpmCurrent+0.25*crossfader*(nextBpm*2-prevBpmCurrent);
 } else {
 adjustedBpm=prevBpmCurrent+0.25*crossfader*(nextBpm/2-prevBpmCurrent);
 }
 }
 engine.setValue("[Channel"+prev+"]", "bpm", adjustedBpm);
 }
 }

 } else { // Next track is stopped (or not started yet: nextPos <= -0.15) --> Disable sync and refine track selection
 midiAutoDJ.drivenCrossfaderWhenLoop = -1; // clear so next transition doesn't reuse
 // Only clear transition state when we have just left the fade (_wasInFade was set in fade block). Otherwise we're in "else" because next track hasn't started yet (nextPos <= -0.15) and we must not wipe transitionTargetDeck/thisTransitionUseEQ/effect state or bass and randomEffectDuringFade would break.
 if (midiAutoDJ._wasInFade) {
     midiAutoDJ._wasInFade = false;
     midiAutoDJ.transitionTargetDeck = 0;
     midiAutoDJ.fadeSourceHoldTicksLeft = 0;
     midiAutoDJ.thisTransitionPreStartNextBeats = 0;
     midiAutoDJ.thisTransitionUseEQ = 0;
     midiAutoDJ.thisTransitionEQStep = 0;
     midiAutoDJ.loggedThisTransitionEffect = false;
     // Turn off all managed effect units and clear effect state only when transition has actually ended (not when "else" runs before fade starts).
     if (midiAutoDJ.randomEffectDuringFade) {
         var unitsClean = midiAutoDJ.randomEffectUnits;
         if (unitsClean && unitsClean.length > 0) {
             for (var uc = 0; uc < unitsClean.length; uc++) {
                 var un = unitsClean[uc];
                 var g = midiAutoDJ._effectGroupKey(un);
                 engine.setValue(g, "enabled", 0.0);
                 engine.setValue(g, "mix", 0.0);
                 engine.setValue(g, "group_[Channel1]_enable", 0.0);
                 engine.setValue(g, "group_[Channel2]_enable", 0.0);
                 engine.setValue(midiAutoDJ._effectSlotKey(un, 1), "enabled", 0.0);
                 engine.setValue(midiAutoDJ._effectSlotKey(un, 2), "enabled", 0.0);
                 engine.setValue(midiAutoDJ._effectSlotKey(un, 3), "enabled", 0.0);
             }
         }
         midiAutoDJ.lastTransitionEffectUnit = 0;
         midiAutoDJ.lastTransitionEffectSlot = 0;
         midiAutoDJ.thisTransitionEffectUnit = 0;
         midiAutoDJ.thisTransitionEffectSlot = 0;
         midiAutoDJ.thisTransitionEffectMix = null;
         midiAutoDJ.thisTransitionEffectSlotWet = null;
     }
 }
 // After an EQ transition, set bass to normal once so the user can then adjust it (we don't keep writing so the user keeps control).
    if (midiAutoDJ.lastTransitionUseEQ) {
        engine.setValue("[EqualizerRack1_[Channel"+prev+"]_Effect1]", "parameter1", midiAutoDJ.normalBassLevel);
        midiAutoDJ.lastTransitionUseEQ = 0; // one-time restore, then user has control
    }

 if (midiAutoDJ.bpmSyncFade) {
 // Avoid timestreching indefinitely due to ever so slight residual offset in BPM float
 engine.setValue("[Channel"+prev+"]", "bpm", prevBpm);
 }

 // Clean up in case previous transition did not finish nicely
 if ( midiAutoDJ.syncing ) {
 midiAutoDJ.syncing = 0;
 engine.setValue("[Channel"+prev+"]", "sync_mode", 0.0); // Disable sync, else loading new track...
 engine.setValue("[Channel"+next+"]", "sync_mode", 0.0); // ...or skipping tracks would break things.
 //engine.setValue("[Channel"+prev+"]", "sync_enabled", 0.0);
 //engine.setValue("[Channel"+next+"]", "sync_enabled", 0.0);
 }

 if ( midiAutoDJ.fadeQuickEffect ) {
 // To prepare for next fade
 engine.setValue("[QuickEffectRack1_[Channel"+next+"]]", "super1", 0.5+midiAutoDJ.fadeRange/2.0);
 // In case the transition ended to quickly
 engine.setValue("[QuickEffectRack1_[Channel"+prev+"]]", "super1", 0.5);
 }

 // Check if we are at the exit point of the current song
 // Begin the transition to the next song if this is the case
 var exitCueSamples = -1;
 if (midiAutoDJ.useOutroForExit && engine.getValue("[Channel"+prev+"]", "outro_start_enabled")) {
 exitCueSamples = engine.getValue("[Channel"+prev+"]", "outro_start_position");
 }
 if (exitCueSamples === -1) {
 exitCueSamples = engine.getValue("[Channel"+prev+"]", "hotcue_"+midiAutoDJ.exitCue+"_position");
 }
 if (exitCueSamples != -1) {
 var currentPos = engine.getValue("[Channel"+prev+"]", "playposition");
 var sampleRate = engine.getValue("[Channel"+prev+"]", "track_samplerate");
 var trackDuration = engine.getValue("[Channel"+prev+"]", "duration");
 var exitCuePos = exitCueSamples / sampleRate / trackDuration / 2; // need to divide by 2 for whatever reason

 var prevBpmCurrent = engine.getValue("[Channel"+prev+"]", "bpm");
 var nextBpmCurrent = engine.getValue("[Channel"+next+"]", "bpm");
 var exitCueOffset = midiAutoDJ.preStart * 60.0 / prevBpmCurrent / trackDuration;

 // Adjust for double/half time
 // Next song is twice the tempo (+1 for floating point rounding)
 if (nextBpmCurrent > prevBpmCurrent + 1) {
 exitCueOffset = exitCueOffset * 0.5;
 }
 // Next song if half the tempo
 if (nextBpmCurrent + 1 < prevBpmCurrent) {
 exitCueOffset = exitCueOffset * 2;
 }

 if (currentPos >= exitCuePos - exitCueOffset - 0.0008) {
 engine.setValue("[AutoDJ]", "fade_now", 1.0);
 engine.setValue("[AutoDJ]", "fade_now", 0.0);
 }
 }


 // Second, refine track selection
 // Key advantage of trial and error:
 // * keeps code simple, Mixxx scripting is not made for this task
 // * does not mess with Auto-DJ track source settings or queue ordering

 var skipReason = "";
 if (midiAutoDJ.avoidRecentMinutes > 0) {
  var now = Date.now();
  var cutoff = now - midiAutoDJ.avoidRecentMinutes * 60 * 1000;
  for (var rid in midiAutoDJ.recentPlayed) { if (midiAutoDJ.recentPlayed[rid] < cutoff) { delete midiAutoDJ.recentPlayed[rid]; } }
  var nextId = midiAutoDJ.getTrackId(next);
  if (nextId && midiAutoDJ.recentPlayed[nextId] !== undefined) {
   skip = 1;
   var cacheCount = 0;
   for (var _ in midiAutoDJ.recentPlayed) { cacheCount++; }
   skipReason = "played in the last " + midiAutoDJ.avoidRecentMinutes + " minutes (" + cacheCount + " tracks in cache)";
   console.log("AutoDJ: Skipped (recent-played cache hit) track id: " + nextId);
  }
 }
 // Is the BPM difference too much? (only when both direct and double/half exceed tolerance)
 if ( !skip && isFinite(diffBpm) && isFinite(diffBpmDouble) && diffBpm > midiAutoDJ.maxBpmAdjustment && diffBpmDouble > midiAutoDJ.maxBpmAdjustment ) {
 skip = 1;
 skipReason = "BPM difference too large (prev " + prevBpm.toFixed(1) + " next " + nextBpm.toFixed(1) + " diff " + diffBpm.toFixed(1) + "% direct, " + diffBpmDouble.toFixed(1) + "% double/half, max " + midiAutoDJ.maxBpmAdjustment + "%)";
 }

// Mix harmonically by transposing (same as original: sync_key to match prev, skip if transposition too large).
// Store the next track's key only the first time we run for this track (so we restore to file key after fade).
// After the first tick, key is already transposed so we must not overwrite originalKeyNext.
if (midiAutoDJ.transpose && !skip) {
    var oldKey = engine.getValue("[Channel"+next+"]", "key");
    if (midiAutoDJ.originalKeyNext === undefined) {
        midiAutoDJ.originalKeyNext = oldKey; // store once per track (cleared when fade ends or we skip)
    }

    // Sync key (next track is transposed to match prev for harmonic mix).
    engine.setValue("[Channel"+next+"]", "sync_key", 1.0);
    engine.setValue("[Channel"+next+"]", "sync_key", 0.0);
    var newKey = engine.getValue("[Channel"+next+"]", "key");

    // Check if we should skip because transposition would be too large (compare to stored original).
    var baseKey = midiAutoDJ.originalKeyNext;
    if (Math.abs(newKey - baseKey) > midiAutoDJ.transposeMax + 0.001) {
        if (midiAutoDJ.transposeSkips < midiAutoDJ.transposeSkipsMax) {
            skip = 1;
            skipReason = "transposition too large (need " + (newKey - baseKey).toFixed(1) + " semitones, max " + midiAutoDJ.transposeMax + ")";
            midiAutoDJ.transposeSkips++;
        } else {
            // Can't skip, so reset the key back to the original (file) key.
            engine.setValue("[Channel"+next+"]", "key", baseKey);
        }
    }
}

 // Skip the next song
 if (skip) {
 if (midiAutoDJ.logSkipReasons && skipReason) {
 print("[AutoDJ script] Skipping next track: " + skipReason);
 }
 skip = 0;
 midiAutoDJ.songLoaded = 0;
 midiAutoDJ.originalKeyNext = undefined;
 midiAutoDJ.lastMarkedPrevTrackId = null;
 // Clear transition-only state so nothing is retained (no transition completed).
 midiAutoDJ.transitionTargetDeck = 0;
 midiAutoDJ.fadeSourceHoldTicksLeft = 0;
 midiAutoDJ.thisTransitionPreStartNextBeats = 0;
 midiAutoDJ.thisTransitionUseEQ = 0;
 midiAutoDJ.thisTransitionEQStep = 0;
 midiAutoDJ.thisTransitionEffectUnit = 0;
 midiAutoDJ.thisTransitionEffectSlot = 0;
 midiAutoDJ.thisTransitionEffectMix = null;
 midiAutoDJ.thisTransitionEffectSlotWet = null;
 midiAutoDJ.loggedThisTransitionEffect = false;
 if (midiAutoDJ.deferredSnapTimerId) {
 engine.stopTimer(midiAutoDJ.deferredSnapTimerId);
 midiAutoDJ.deferredSnapTimerId = 0;
 midiAutoDJ.deferredSnapDeck = -1;
 midiAutoDJ.deferredSnapRetries = 0;
 }

 engine.setValue("[AutoDJ]", "skip_next", 1.0);
 engine.setValue("[AutoDJ]", "skip_next", 0.0); // Have to reset manually
 midiAutoDJ.skips++;

 } else { // Song selected
 // reset counter
 skip = 0;
 midiAutoDJ.transposeSkips = 0;

 // Prepare the next track for the transition
 // Place the play position at the desired offset from the best mix-in point (intro start, main cue, or track start)
 // Only run when we haven't prepared yet AND the next deck has a track loaded (duration > 0)
 if (! midiAutoDJ.songLoaded) {
 var nextDur = engine.getValue("[Channel"+next+"]", "duration");
 if (nextDur > 0) {
 if (midiAutoDJ.randomTransitions) {
 var opts = midiAutoDJ.randomPreStartNextBeatsOptions;
 midiAutoDJ.thisTransitionPreStartNextBeats = opts[Math.floor(Math.random() * opts.length)];
 midiAutoDJ.thisTransitionUseEQ = (Math.random() < midiAutoDJ.randomEQChance) ? 1 : 0;
                midiAutoDJ.thisTransitionEQStep = midiAutoDJ.randomEQStepMin + Math.random() * (midiAutoDJ.randomEQStepMax - midiAutoDJ.randomEQStepMin);
 if (midiAutoDJ.logRandomTransitions) {
 var pnbLog = midiAutoDJ.thisTransitionPreStartNextBeats;
 var pnbDesc = (pnbLog > 0) ? (pnbLog+" beats before") : (pnbLog < 0 ? (-pnbLog)+" beats into" : "exactly on beat");
 var efLog = midiAutoDJ.randomEffectDuringFade ? (" effectUnit=" + (midiAutoDJ.thisTransitionEffectUnit || "none") + " slot=" + (midiAutoDJ.thisTransitionEffectSlot || "-")) : "";
 print("[AutoDJ script] Random transition: EQ=" + midiAutoDJ.thisTransitionUseEQ + " offset=" + pnbDesc + " eqStep=" + midiAutoDJ.thisTransitionEQStep.toFixed(3) + efLog);
 }
} else {
            midiAutoDJ.thisTransitionPreStartNextBeats = 0;
            midiAutoDJ.thisTransitionUseEQ = midiAutoDJ.useEQ;
            midiAutoDJ.thisTransitionEQStep = 0.05;
}
if (midiAutoDJ.randomEffectDuringFade) {
    if (Math.random() < midiAutoDJ.randomEffectChance) {
        midiAutoDJ.thisTransitionEffectUnit = midiAutoDJ.randomEffectUnits[Math.floor(Math.random() * midiAutoDJ.randomEffectUnits.length)];
        var slots = midiAutoDJ.effectSlots;
        var slot = (slots && slots.length > 0) ? slots[Math.floor(Math.random() * slots.length)] : 1;
        midiAutoDJ.thisTransitionEffectSlot = (slot >= 1 && slot <= 3) ? slot : 1;
        var mixMin = midiAutoDJ.effectMixMin != null ? midiAutoDJ.effectMixMin : 0.5;
        var mixMax = midiAutoDJ.effectMixMax != null ? midiAutoDJ.effectMixMax : 1.0;
        midiAutoDJ.thisTransitionEffectMix = mixMin + Math.random() * (Math.max(mixMin, mixMax) - mixMin);
        var wetMin = midiAutoDJ.effectSlotWetMin != null ? midiAutoDJ.effectSlotWetMin : 0.5;
        var wetMax = midiAutoDJ.effectSlotWetMax != null ? midiAutoDJ.effectSlotWetMax : 1.0;
        midiAutoDJ.thisTransitionEffectSlotWet = wetMin + Math.random() * (Math.max(wetMin, wetMax) - wetMin);
    } else {
        midiAutoDJ.thisTransitionEffectUnit = 0;
        midiAutoDJ.thisTransitionEffectSlot = 0;
    }
} else {
    midiAutoDJ.thisTransitionEffectUnit = 0;
    midiAutoDJ.thisTransitionEffectSlot = 0;
}
midiAutoDJ.loggedThisTransitionEffect = false;
var useIntro = midiAutoDJ.useIntroStart && engine.getValue("[Channel"+next+"]", "intro_start_enabled");
 var mainCueSet = engine.getValue("[Channel"+next+"]", "cue_point") >= 0;
 if (useIntro) {
 engine.setValue("[Channel"+next+"]", "intro_start_activate", 1.0);
 engine.setValue("[Channel"+next+"]", "intro_start_activate", 0.0);
 if (midiAutoDJ.alignBeatgridAtEntrance) {
 engine.setValue("[Channel"+next+"]", "beats_translate_curpos", 1.0);
 engine.setValue("[Channel"+next+"]", "beats_translate_curpos", 0.0);
 }
 } else if (mainCueSet) {
 engine.setValue("[Channel"+next+"]", "cue_gotoandstop", 1.0);
 engine.setValue("[Channel"+next+"]", "cue_gotoandstop", 0.0);
 if (midiAutoDJ.alignBeatgridAtEntrance) {
 engine.setValue("[Channel"+next+"]", "beats_translate_curpos", 1.0);
 engine.setValue("[Channel"+next+"]", "beats_translate_curpos", 0.0);
 }
 } else if (midiAutoDJ.fallbackToStart) {
 // Start at the best mix-in point: first beat of the first bar when beatgrid exists, else track start
 var snapped = false;
 if (midiAutoDJ.snapToFirstBeat && nextBpm > 0) {
 var beatClosest = engine.getValue("[Channel"+next+"]", "beat_closest");
 var dur = engine.getValue("[Channel"+next+"]", "duration");
 var sr = engine.getValue("[Channel"+next+"]", "track_samplerate");
 if (beatClosest >= 0 && dur > 0 && sr > 0) {
 var firstBeatNorm = beatClosest / (dur * sr);
 if (firstBeatNorm >= 0 && firstBeatNorm <= 1) {
 engine.setValue("[Channel"+next+"]", "playposition", firstBeatNorm);
 snapped = true;
 } else {
 engine.setValue("[Channel"+next+"]", "playposition", 0.0);
 }
 } else {
 engine.setValue("[Channel"+next+"]", "playposition", 0.0);
 }
 } else {
 engine.setValue("[Channel"+next+"]", "playposition", 0.0);
 }
 if (!snapped && midiAutoDJ.snapToFirstBeat && midiAutoDJ.deferredSnapWhenAnalyzing && !midiAutoDJ.deferredSnapTimerId) {
 midiAutoDJ.deferredSnapDeck = next;
 midiAutoDJ.deferredSnapRetries = 0;
 midiAutoDJ.deferredSnapTimerId = engine.beginTimer(midiAutoDJ.deferredSnapInterval, midiAutoDJ.tryDeferredSnap);
 }
 }
 var pnb = midiAutoDJ.thisTransitionPreStartNextBeats || midiAutoDJ.preStartNextBeats;
 if (pnb > 0) {
 engine.setValue("[Channel"+next+"]", "beatjump_"+pnb+"_backward", 1.0);
 engine.setValue("[Channel"+next+"]", "beatjump_"+pnb+"_backward", 0.0);
 } else if (pnb < 0) {
 engine.setValue("[Channel"+next+"]", "beatjump_"+(-pnb)+"_forward", 1.0);
 engine.setValue("[Channel"+next+"]", "beatjump_"+(-pnb)+"_forward", 0.0);
 }
 midiAutoDJ.songLoaded = 1;
 midiAutoDJ.transitionTargetDeck = next; // remember which deck is coming in (for bass logic during fade)
 if (midiAutoDJ.thisTransitionUseEQ) {
 midiAutoDJ.fadeSourceHoldTicksLeft = midiAutoDJ.fadeSourceHoldTicks; // hold source full for first N ticks of fade
 }
 }
 }

 // Target track bass starts at 0; it will ramp to normalBassLevel during the transition.
 if (midiAutoDJ.thisTransitionUseEQ) {
 engine.setValue("[EqualizerRack1_[Channel"+next+"]_Effect1]", "parameter1", 0);
 }

 var nextBpmAdjusted = nextBpm;
 if (midiAutoDJ.bpmSyncFade) {
 nextBpmAdjusted = prevBpm;
 if ( diffBpmDouble < diffBpm ) {
 if ( nextBpm < prevBpm ) {
 nextBpmAdjusted = prevBpm/2;
 } else {
 nextBpmAdjusted = prevBpm*2;
 }
 }
 }
 engine.setValue("[Channel"+next+"]", "bpm", nextBpmAdjusted);

 if (midiAutoDJ.bpmSync) {
 midiAutoDJ.syncing = 1;
 engine.setValue("[Channel"+next+"]", "sync_mode", 1.0);
 engine.setValue("[Channel"+prev+"]", "sync_mode", 2.0);
 engine.setValue("[Channel"+next+"]", "sync_enabled", 1.0);
 }
 }
 }
};
