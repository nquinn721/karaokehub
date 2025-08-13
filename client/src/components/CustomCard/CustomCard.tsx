import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  SxProps,
  Theme,
  useTheme,
} from '@mui/material';
import React from 'react';

export interface CustomCardProps {
  children: React.ReactNode;
  title?: string | React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  header?: React.ReactNode;
  sx?: SxProps<Theme>;
  elevation?: number;
  variant?: 'outlined' | 'elevation';
  hover?: boolean;
}

export const CustomCard: React.FC<CustomCardProps> = ({
  children,
  title,
  subtitle,
  actions,
  header,
  sx,
  elevation = 0,
  variant = 'outlined',
  hover = false,
}) => {
  const theme = useTheme();

  return (
    <Card
      elevation={elevation}
      variant={variant}
      sx={{
        transition: 'all 0.3s ease-in-out',
        ...(hover && {
          '&:hover': {
            borderColor: theme.palette.primary.main,
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 25px ${theme.palette.primary.main}20`,
          },
        }),
        ...sx,
      }}
    >
      {(title || subtitle || header) && (
        <CardHeader
          title={title}
          subheader={subtitle}
          sx={{
            '& .MuiCardHeader-title': {
              color: theme.palette.text.primary,
              fontWeight: 600,
            },
            '& .MuiCardHeader-subheader': {
              color: theme.palette.text.secondary,
            },
          }}
        />
      )}
      {header}
      <CardContent>{children}</CardContent>
      {actions && <CardActions>{actions}</CardActions>}
    </Card>
  );
};
