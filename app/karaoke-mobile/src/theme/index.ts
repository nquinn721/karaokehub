export const colors = {
  dark: {
    primary: '#FF6B35',
    secondary: '#FFA726',
    accent: '#29B6F6',
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2C2C2C',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textMuted: '#757575',
    border: '#333333',
    divider: '#2C2C2C',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
    disabled: '#424242',
    placeholder: '#757575',

    // Music specific colors
    playButton: '#1DB954',
    favoriteActive: '#E91E63',
    favoriteInactive: '#757575',
    waveform: '#29B6F6',

    // Gradient colors
    gradientStart: '#FF6B35',
    gradientEnd: '#FFA726',

    // Navigation
    tabBarActive: '#FF6B35',
    tabBarInactive: '#757575',
    tabBarBackground: '#1E1E1E',

    // Status bar
    statusBar: '#000000',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export const theme = {
  colors: colors.dark,
  spacing,
  typography,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;
