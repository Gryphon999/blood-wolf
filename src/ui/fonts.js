// Self-hosted, open-licence (OFL) fonts with full Cyrillic support. Bundled by Vite, no CDN calls.
import '@fontsource/cormorant-sc/latin-600.css';
import '@fontsource/cormorant-sc/cyrillic-600.css';
import '@fontsource/cormorant-sc/latin-700.css';
import '@fontsource/cormorant-sc/cyrillic-700.css';
import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/cyrillic-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya/cyrillic-400-italic.css';
import '@fontsource/alegreya/latin-700.css';
import '@fontsource/alegreya/cyrillic-700.css';

/** Display face for titles, buttons and card names (medieval small caps). */
export const FONT_TITLE = '"Cormorant SC", "Palatino Linotype", Georgia, serif';
/** Readable serif for rules text, numbers and general UI. */
export const FONT_BODY = 'Alegreya, "Palatino Linotype", Georgia, serif';

/**
 * Loads every face used by the game so the first frame never renders with a fallback font.
 * Never rejects: on any failure the fallback serif stack is used.
 */
export async function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  const sample = 'Абвгд Abcde 0123';
  const faces = [
    `600 20px "Cormorant SC"`, `700 20px "Cormorant SC"`,
    `400 16px Alegreya`, `italic 400 16px Alegreya`, `700 16px Alegreya`,
  ];
  try {
    await Promise.race([
      Promise.all(faces.map((f) => document.fonts.load(f, sample))),
      new Promise((resolve) => setTimeout(resolve, 4000)), // never block startup on a slow network
    ]);
  } catch {
    /* fall back to the system serif */
  }
}
