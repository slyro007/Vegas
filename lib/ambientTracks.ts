/**
 * Ambient soundtrack — Backstreet Boys, fitting the trip's Sphere night.
 * Streamed directly from the Internet Archive item `02PermanentStain`
 * (hotlinked, nothing stored in the repo). Each `file` is the exact archive
 * filename; the src is URL-encoded at build time.
 */
const ARCHIVE_ITEM = "https://archive.org/download/02PermanentStain";

type RawTrack = { title: string; file: string };

const RAW: RawTrack[] = [
  { title: "I Want It That Way", file: "qlteacher.com - I want it that way BackStreet boys Millenium.mp3" },
  { title: "Larger Than Life", file: "arsenieva.ru - Larger Than Life Backstreet Boys The Hits Chapter One.mp3" },
  { title: "As Long As You Love Me", file: "Backstreet boys - As Long As You Love Me.mp3" },
  { title: "Everybody (Backstreet's Back)", file: "Backstreet Boys - Everybody Rock Your Body.mp3" },
  { title: "Shape of My Heart", file: "Backstreet  Boys - Shape  Of  My  Heart.mp3" },
  { title: "Show Me the Meaning of Being Lonely", file: "Backstreet  Boys - Show  Me  The  Meaning  Of  Being  Lonely.mp3" },
  { title: "Incomplete", file: "Backstreet Boys - Incomplete.mp3" },
  { title: "All I Have to Give", file: "Backstreet Boys - All I Have To Give.mp3" },
  { title: "More Than That", file: "More Than That-Backstreet Boys.mp3" },
  { title: "We've Got It Goin' On", file: "Backstreet boys - We've got in goin'on + lyrics.mp3" },
  { title: "Quit Playing Games (With My Heart)", file: "Quit playing games with my heart.mp3.mp3" },
  { title: "In a World Like This", file: "Backstreet Boys - In a World Like This.mp3" },
  { title: "Show 'Em What You're Made Of", file: "Show 'Em (What You're Made Of) - Backstreet Boys (Lyric Video).mp3" },
];

export type Track = { title: string; artist: string; src: string };

export const TRACKS: Track[] = RAW.map((t) => ({
  title: t.title,
  artist: "Backstreet Boys",
  src: `${ARCHIVE_ITEM}/${encodeURIComponent(t.file)}`,
}));
