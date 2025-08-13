import { faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Button, Card, CardContent, Typography, useTheme } from '@mui/material';
import React from 'react';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

const dayLabels = {
  [DayOfWeek.MONDAY]: 'Mon',
  [DayOfWeek.TUESDAY]: 'Tue',
  [DayOfWeek.WEDNESDAY]: 'Wed',
  [DayOfWeek.THURSDAY]: 'Thu',
  [DayOfWeek.FRIDAY]: 'Fri',
  [DayOfWeek.SATURDAY]: 'Sat',
  [DayOfWeek.SUNDAY]: 'Sun',
};

const dayFullLabels = {
  [DayOfWeek.MONDAY]: 'Monday',
  [DayOfWeek.TUESDAY]: 'Tuesday',
  [DayOfWeek.WEDNESDAY]: 'Wednesday',
  [DayOfWeek.THURSDAY]: 'Thursday',
  [DayOfWeek.FRIDAY]: 'Friday',
  [DayOfWeek.SATURDAY]: 'Saturday',
  [DayOfWeek.SUNDAY]: 'Sunday',
};

interface DayPickerProps {
  selectedDay: DayOfWeek;
  onDayChange: (day: DayOfWeek) => void;
}

export type { DayPickerProps };

export const DayPicker: React.FC<DayPickerProps> = ({ selectedDay, onDayChange }) => {
  const theme = useTheme();
  const days = Object.values(DayOfWeek);

  return (
    <Card
      sx={{
        mb: 3,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <FontAwesomeIcon
            icon={faCalendarDay}
            style={{
              marginRight: '12px',
              color: theme.palette.primary.main,
              fontSize: '1.25rem',
            }}
          />
          <Typography
            variant="h6"
            component="h3"
            sx={{
              fontWeight: 600,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Select Day
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          {days.map((day) => {
            const isSelected = selectedDay === day;
            return (
              <Button
                key={day}
                onClick={() => onDayChange(day)}
                variant={isSelected ? 'contained' : 'outlined'}
                sx={{
                  minWidth: { xs: 48, sm: 72 },
                  height: { xs: 48, sm: 56 },
                  borderRadius: 3,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 600,
                  textTransform: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  ...(isSelected
                    ? {
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        boxShadow: `0 4px 20px ${theme.palette.primary.main}40`,
                        color: theme.palette.primary.contrastText,
                        border: 'none',
                        transform: 'translateY(-2px)',
                        '&:hover': {
                          background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                          boxShadow: `0 6px 24px ${theme.palette.primary.main}50`,
                          transform: 'translateY(-3px)',
                        },
                      }
                    : {
                        borderColor: theme.palette.divider,
                        color: theme.palette.text.primary,
                        backgroundColor: 'transparent',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          backgroundColor: theme.palette.primary.main + '08',
                          transform: 'translateY(-1px)',
                          boxShadow: `0 4px 16px ${theme.palette.primary.main}20`,
                        },
                      }),
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 3,
                    padding: '1px',
                    background: isSelected
                      ? `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.secondary.main})`
                      : 'transparent',
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'subtract',
                    WebkitMaskComposite: 'xor',
                    zIndex: -1,
                  },
                }}
              >
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      lineHeight: 1,
                      fontWeight: 'inherit',
                      color: isSelected ? '#FFFFFF' : 'inherit', // Force white text for selected state
                    }}
                  >
                    {dayLabels[day]}
                  </Typography>
                </Box>
              </Button>
            );
          })}
        </Box>

        <Box
          sx={{
            textAlign: 'center',
            p: 2,
            borderRadius: 2,
            backgroundColor: theme.palette.action.hover,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontWeight: 500,
              '& strong': {
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 600,
              },
            }}
          >
            Showing karaoke shows for <strong>{dayFullLabels[selectedDay]}</strong>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
