"use client";

import { Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscoBall } from "@/components/DiscoBall";
import { TRACKS } from "@/lib/ambientTracks";

const LAST_KEY = "ambient:last";
const PLAYING_KEY = "ambient:playing";

/** A random track index that isn't `avoid` (falls back to any if only one track). */
function pickTrack(avoid: number | null): number {
  if (TRACKS.length <= 1) return 0;
  let idx = avoid;
  while (idx === avoid || idx === null) idx = Math.floor(Math.random() * TRACKS.length);
  return idx;
}

/**
 * Module-level audio engine. Created once per full page load and reused across
 * client-side navigations (React may remount the component, but this Audio object
 * and its playback position survive) — so the song never restarts or changes when
 * moving between pages. A full reload re-creates it and rotates to a fresh track.
 */
type Engine = { audio: HTMLAudioElement; index: number };
let engine: Engine | null = null;

function getEngine(): Engine {
  if (engine) return engine;
  const audio = new Audio();
  audio.preload = "none";
  audio.volume = 0.4;
  const raw = Number(window.localStorage.getItem(LAST_KEY));
  const last = Number.isInteger(raw) ? raw : null;
  const index = pickTrack(last);
  window.localStorage.setItem(LAST_KEY, String(index));
  audio.src = TRACKS[index].src;
  engine = { audio, index };
  return engine;
}

function loadTrack(index: number, play: boolean) {
  const eng = getEngine();
  eng.index = index;
  eng.audio.src = TRACKS[index].src;
  window.localStorage.setItem(LAST_KEY, String(index));
  if (play) eng.audio.play().catch(() => {});
}

/** Floating disco-ball soundtrack — starts paused (autoplay-safe), tap to play. */
export function AmbientPlayer() {
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false); // touch / keyboard open
  const rootRef = useRef<HTMLDivElement>(null);
  const expanded = hovering || pinned;

  const skip = useCallback(() => {
    const eng = getEngine();
    const next = pickTrack(eng.index);
    loadTrack(next, true);
    setIndex(next);
  }, []);

  // Bind to the persistent engine on mount; reflect its live state.
  useEffect(() => {
    const eng = getEngine();
    const a = eng.audio;
    setIndex(eng.index);
    setPlaying(!a.paused);
    setMuted(a.muted);
    setProgress(a.duration ? a.currentTime / a.duration : 0);
    if (window.sessionStorage.getItem(PLAYING_KEY) === "1" && a.paused) {
      a.play().catch(() => {}); // resume after a reload if the browser allows it
    }

    const onPlay = () => {
      setPlaying(true);
      window.sessionStorage.setItem(PLAYING_KEY, "1");
    };
    const onPause = () => {
      setPlaying(false);
      window.sessionStorage.setItem(PLAYING_KEY, "0");
    };
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onEnded = () => skip();
    const onError = () => {
      if (!a.paused) skip();
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
  }, [skip]);

  // Close the pinned (touch) panel when tapping elsewhere.
  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPinned(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [pinned]);

  const togglePlay = () => {
    const a = getEngine().audio;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  const toggleMute = () => {
    const a = getEngine().audio;
    a.muted = !a.muted;
    setMuted(a.muted);
  };

  if (index === null) return null;
  const track = TRACKS[index];
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches;

  return (
    <div
      ref={rootRef}
      data-ambient-player
      className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 md:bottom-5"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className={`flex items-center rounded-full transition-colors ${
          expanded
            ? "gap-2 border border-borderc bg-bg-elevated/90 py-1.5 pl-1.5 pr-2 shadow-lg backdrop-blur-md"
            : "border border-transparent"
        }`}
      >
        {/* the disco ball — tap = play/pause (and opens the panel on touch) */}
        <button
          type="button"
          onClick={() => {
            togglePlay();
            if (coarse) setPinned(true);
          }}
          onFocus={() => setPinned(true)}
          aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
          aria-expanded={expanded}
          className="relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-glow-pink/70"
        >
          <span
            className={`block h-11 w-11 rounded-full ${playing ? "dball-halo-playing" : "dball-halo"}`}
          >
            <DiscoBall className="h-11 w-11" />
          </span>
          {/* show a play hint only while paused; a playing ball is left clean */}
          {!playing && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                <Play className="h-3.5 w-3.5 translate-x-[1px]" />
              </span>
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="overflow-hidden"
            >
              <div className="flex w-[13.5rem] items-center gap-1.5 pl-1 pr-0.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-tight text-ink">
                    {track.title}
                  </div>
                  <div className="text-[11px] leading-tight text-ink-muted">{track.artist}</div>
                  <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-glow-pink"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={playing ? "Pause" : "Play"}
                  className="shrink-0 rounded-full p-1.5 text-ink-secondary transition-colors hover:text-ink"
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={skip}
                  aria-label="Next song"
                  className="shrink-0 rounded-full p-1.5 text-ink-muted transition-colors hover:text-ink"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="shrink-0 rounded-full p-1.5 text-ink-muted transition-colors hover:text-ink"
                >
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
