// A slider's number while it is dragged (lenzi, 2026-11-21: a video of the scene maker, "guarda se ... il
// comportamento degli slider é corretto": the thumb moved, its number and the scene waited for the thumb to be let
// go). Material's `valueChange` comes with the native `change`, on letting go; the native `input` comes at every step
// of the drag, from the thumb's own <input type="range">. A slider takes both: the value follows the thumb, and the
// last one is the thumb's own (Material corrects a click on the track after it). A plain module (no schematic makes one).

/** The number a slider's thumb is at, from its native `input` event. */
export function slid(event: Event): number {
  return (event.target as HTMLInputElement).valueAsNumber;
}
