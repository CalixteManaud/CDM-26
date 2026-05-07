'use client';

import { createContext, useContext, ReactNode } from 'react';

/**
 * CDM 26 — broadcast-cyberpunk noir aesthetic.
 * Le thème est verrouillé en `dark` sur toute la plateforme : la palette
 * (mesh-cdm, gradients World Cup, accents néon) ne fonctionne qu'en sombre.
 *
 * Cette API est conservée pour ne pas casser les imports existants
 * (`useTheme`, `ThemeProvider`), mais `toggleTheme` / `setTheme` sont des
 * no-ops. Le `dark` class est appliquée au niveau `<Html>` dans _document.tsx
 * pour éviter tout flash au premier render.
 */

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const noop = () => {};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: noop,
  setTheme: noop,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: noop, setTheme: noop }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
