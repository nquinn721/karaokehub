import {
    Button,
    ButtonProps,
    CircularProgress,
    SxProps,
    Theme,
    useTheme,
} from '@mui/material';
import React from 'react';

export interface LoadingButtonProps extends Omit<ButtonProps, 'sx'> {
  loading?: boolean;
  loadingText?: string;
  sx?: SxProps<Theme>;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  children,
  disabled,
  sx,
  ...props
}) => {
  const theme = useTheme();

  return (
    <Button
      {...props}
      disabled={disabled || loading}
      sx={{
        position: 'relative',
        ...sx,
      }}
    >
      {loading && (
        <CircularProgress
          size={20}
          sx={{
            color: theme.palette.primary.main,
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: '-10px',
            marginLeft: '-10px',
          }}
        />
      )}
      <span style={{ opacity: loading ? 0 : 1 }}>
        {loading && loadingText ? loadingText : children}
      </span>
    </Button>
  );
};
