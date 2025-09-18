import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DayOfWeek } from '../types';

interface DayPickerProps {
  selectedDay: DayOfWeek;
  onDayChange: (day: DayOfWeek) => void;
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

export const DayPicker: React.FC<DayPickerProps> = observer(({ selectedDay, onDayChange }) => {
  const days = Object.values(DayOfWeek);

  // Split into two rows: Mon-Thu, Fri-Sun
  const firstRow = days.slice(0, 4);
  const secondRow = days.slice(4);

  const renderDayButton = (day: DayOfWeek) => {
    const isSelected = selectedDay === day;
    return (
      <TouchableOpacity
        key={day}
        style={[
          styles.dayButton,
          isSelected ? styles.dayButtonSelected : styles.dayButtonUnselected,
        ]}
        onPress={() => onDayChange(day)}
      >
        <Text
          style={[styles.dayText, isSelected ? styles.dayTextSelected : styles.dayTextUnselected]}
        >
          {dayLabels[day]}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* First row: Mon-Thu */}
      <View style={styles.row}>{firstRow.map(renderDayButton)}</View>

      {/* Second row: Fri-Sun */}
      <View style={styles.row}>{secondRow.map(renderDayButton)}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayButtonUnselected: {
    backgroundColor: '#2C2C2E',
    borderColor: '#555555',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayTextUnselected: {
    color: '#FFFFFF',
  },
});
