/**
 * Prevents Angular Zone.js from spamming the console with "Violation: 'requestAnimationFrame' handler took <N>ms"
 * and "Added non-passive event listener to a scroll-blocking 'wheel' event".
 */
(window as any).__Zone_disable_requestAnimationFrame = true; // Disable patching requestAnimationFrame
(window as any).__zone_symbol__PASSIVE_EVENTS = [
  "scroll",
  "touchstart",
  "touchmove",
];
(window as any).__zone_symbol__UNPATCHED_EVENTS = ["wheel"];
(window as any).__zone_symbol__IGNORE_WANT_REQUEST_ANIMATION_FRAME = true;
