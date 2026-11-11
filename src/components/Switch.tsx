"use client";

/**
 * Toggle row. Uses role="switch" so assistive technology announces the state,
 * and keeps the accessible name on the control itself.
 */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      data-focusable
      onClick={() => onChange(!checked)}
    />
  );
}
