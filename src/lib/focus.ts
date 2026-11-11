"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Spatial (D-pad) keyboard navigation.
 *
 * The app this port mirrors is an Android TV app, so the primary input is a
 * remote control: arrow keys move a focus ring between tiles, Enter opens.
 * Browsers move focus linearly with Tab, which is the wrong mental model on a
 * ten foot interface, so arrow keys are mapped to nearest-neighbour movement
 * using element geometry.
 */

const FOCUSABLE = "[data-focusable]";

interface Point {
  x: number;
  y: number;
}

function centerOf(element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

type Direction = "up" | "down" | "left" | "right";

function pickNeighbor(elements: HTMLElement[], from: HTMLElement, direction: Direction): HTMLElement | null {
  const origin = centerOf(from);
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "up" ? -1 : 1;

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const element of elements) {
    if (element === from) continue;
    const candidate = centerOf(element);
    const dx = candidate.x - origin.x;
    const dy = candidate.y - origin.y;

    const primary = horizontal ? dx : dy;
    const secondary = horizontal ? dy : dx;

    // The candidate must sit in the requested direction.
    if (primary * sign <= 1) continue;

    // Reject candidates that sit mostly on the wrong axis.
    if (Math.abs(secondary) > Math.abs(primary) * 1.6) continue;

    // Prefer candidates whose secondary offset is small, then the closest one.
    const score = Math.abs(primary) + Math.abs(secondary) * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = element;
    }
  }

  return best;
}

export function useSpatialNavigation<T extends HTMLElement>(enabled = true) {
  const rootRef = useRef<T | null>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      const root = rootRef.current;
      if (!root) return;

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const direction: Direction | null =
        event.key === "ArrowUp"
          ? "up"
          : event.key === "ArrowDown"
            ? "down"
            : event.key === "ArrowLeft"
              ? "left"
              : event.key === "ArrowRight"
                ? "right"
                : null;

      if (!direction) return;

      const elements = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (elements.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const current = active && elements.includes(active) ? active : elements[0];

      const next = pickNeighbor(elements, current, direction);
      if (!next) return;

      event.preventDefault();
      next.focus();
    },
    [enabled],
  );

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    node.addEventListener("keydown", onKeyDown);
    return () => node.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return rootRef;
}
