import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { themeStore } from '../stores';
import { darkTheme } from './darkTheme';
import { lightTheme } from './lightTheme';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = observer(({ children }) => {
  const currentTheme = themeStore.isDark ? darkTheme : lightTheme;

  return <MuiThemeProvider theme={currentTheme}>{children}</MuiThemeProvider>;
});
