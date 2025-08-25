export const colors = {
  dark: {
    // Primary colors - iOS blue
    primary: '#007AFF',
    primaryDark: '#0056B3',
    secondary: '#5856D6',
    accent: '#007AFF',

    // Dark backgrounds
    background: '#000000',
    surface: '#1C1C1E',
    card: '#2C2C2E',
    surfaceElevated: '#3A3A3C',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#98989D',
    textMuted: '#636366',

    // Border and divider colors
    border: '#38383A',
    divider: '#48484A',

    // Status colors
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
    disabled: '#48484A',
    placeholder: '#98989D',

    // Music specific colors
    playButton: '#34C759',
    favoriteActive: '#FF3B30',
    favoriteInactive: '#98989D',
    waveform: '#007AFF',

    // Gradient colors
    gradientStart: '#007AFF',
    gradientEnd: '#5856D6',

    // Navigation
    tabBarActive: '#007AFF',
    tabBarInactive: '#98989D',
    tabBarBackground: '#1C1C1E',
    tabBarBorder: '#38383A',

    // Status bar
    statusBar: '#000000',

    // Button colors
    buttonPrimary: '#007AFF',
    buttonPrimaryText: '#FFFFFF',
    buttonSecondary: '#2C2C2E',
    buttonSecondaryText: '#007AFF',
    buttonDanger: '#FF3B30',
    buttonDangerText: '#FFFFFF',

    // Social button colors
    googleButton: '#DB4437',
    facebookButton: '#1877F2',

    // Input colors
    inputBackground: '#2C2C2E',
    inputBorder: '#48484A',
    inputText: '#FFFFFF',
    inputPlaceholder: '#98989D',

    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
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
