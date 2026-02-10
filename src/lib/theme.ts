export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_PREFERENCE_KEY = 'theme-preference';

export const getStoredThemePreference = (): ThemePreference => {
  const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
};

export const applyThemePreference = (preference: ThemePreference): void => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = preference === 'dark' || (preference === 'system' && mediaQuery.matches);
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

export const setThemePreference = (preference: ThemePreference): void => {
  localStorage.setItem(THEME_PREFERENCE_KEY, preference);
  applyThemePreference(preference);
};

export const initializeThemePreference = (): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const applyCurrent = () => applyThemePreference(getStoredThemePreference());

  applyCurrent();
  mediaQuery.addEventListener('change', applyCurrent);

  return () => mediaQuery.removeEventListener('change', applyCurrent);
};
