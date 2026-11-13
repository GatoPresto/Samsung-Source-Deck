// DOM helpers shared by every module.
export const byId = id => document.getElementById(id);
export const deck = byId("deck");

/** Keep a row of a list in view by scrolling ONLY that list. scrollIntoView also scrolls the overflow:hidden drawers around it, which pushed the whole panel off the screen. */
export function scrollListTo(list, row) {
  if (!row) return;
  const l = list.getBoundingClientRect(), r = row.getBoundingClientRect();
  if (r.top < l.top) list.scrollTop -= l.top - r.top;
  else if (r.bottom + 10 > l.bottom) list.scrollTop += r.bottom + 10 - l.bottom;   // 10 = the row's bottom margin
}

/** Show a message in the status line under the title. */
export function message(text) { byId("status").textContent = text; }
