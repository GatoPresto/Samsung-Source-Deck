// DOM helpers shared by every module.
export const byId = id => document.getElementById(id);
export const deck = byId("deck");

/** Show a message in the status line under the title. */
export function message(text) { byId("status").textContent = text; }
