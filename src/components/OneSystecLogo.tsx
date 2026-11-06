interface OneSystecLogoProps {
  /** Height (and any spacing) of the logo; the width follows its proportions. */
  className?: string;
  /** Always put the logo on a white tile (for a coloured or gradient background). */
  tile?: boolean;
  alt?: string;
}

/**
 * OneSystec's logo (a transparent PNG). The artwork has dark navy letters and its own soft shadow, so on a dark
 * surface it sits on a white pill, as the clients' logos do; `tile` does the same on any background.
 */
export function OneSystecLogo({ className = "h-8", tile = false, alt = "OneSystec" }: OneSystecLogoProps) {
  return (
    <img
      src="/logo-onesystec.png"
      alt={alt}
      className={`w-auto shrink-0 object-contain ${
        tile ? "rounded-xl bg-white p-1.5 shadow-lg" : "dark:rounded-lg dark:bg-white dark:px-1.5 dark:py-0.5"
      } ${className}`}
    />
  );
}
