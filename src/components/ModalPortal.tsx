import { createPortal } from "react-dom";
import type { ReactNode } from "react";

/** Renders a dialog straight into <body>: inside a card or table row, a `fixed` box is trapped by that
 * ancestor's transform/overflow and ends up squeezed into it instead of covering the screen. */
export function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
