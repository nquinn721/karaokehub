export const colors = {
  // Primary Colors
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3', // Main primary
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },

  // Dark Theme Colors
  dark: {
    background: '#0a0a0a',
    surface: '#1a1a1a',
    surface2: '#252525',
    surface3: '#2f2f2f',
    primary: '#bb86fc',
    primaryDark: '#3700b3',
    secondary: '#03dac6',
    accent: '#cf6679',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    textMuted: '#666666',
    border: '#333333',
    divider: '#2a2a2a',
    error: '#cf6679',
    warning: '#ff9800',
    success: '#4caf50',
    info: '#2196f3',
  },

  // Gradient Colors
  gradients: {
    primary: ['#bb86fc', '#6200ea'],
    secondary: ['#03dac6', '#018786'],
    dark: ['#1a1a1a', '#0a0a0a'],
    music: ['#e91e63', '#9c27b0'],
    shows: ['#ff9800', '#f57c00'],
  },

  // Semantic Colors
  status: {
    online: '#4caf50',
    offline: '#757575',
    busy: '#ff5722',
    away: '#ff9800',
  },

  // Ad-Free/Premium Colors
  premium: {
    gold: '#ffd700',
    silver: '#c0c0c0',
    bronze: '#cd7f32',
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

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  title: 32,
  hero: 36,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  shadows,
};
