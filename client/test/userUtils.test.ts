import { getUserDisplayName, getUserSecondaryName } from '../src/utils/userUtils';

// Test cases for the user utility functions
describe('User Utils', () => {
  describe('getUserDisplayName', () => {
    it('should return stage name when provided', () => {
      const user = { name: 'John Doe', stageName: 'DJ Johnny' };
      expect(getUserDisplayName(user)).toBe('DJ Johnny');
    });

    it('should return first name when no stage name and full name has multiple words', () => {
      const user = { name: 'John Doe' };
      expect(getUserDisplayName(user)).toBe('John');
    });

    it('should return full name when no stage name and only one word', () => {
      const user = { name: 'Madonna' };
      expect(getUserDisplayName(user)).toBe('Madonna');
    });

    it('should handle empty stage name', () => {
      const user = { name: 'John Doe', stageName: '' };
      expect(getUserDisplayName(user)).toBe('John');
    });

    it('should handle whitespace-only stage name', () => {
      const user = { name: 'John Doe', stageName: '   ' };
      expect(getUserDisplayName(user)).toBe('John');
    });

    it('should handle extra whitespace in names', () => {
      const user = { name: '  John  Doe  ' };
      expect(getUserDisplayName(user)).toBe('John');
    });

    it('should handle names with multiple spaces', () => {
      const user = { name: 'John   Michael   Doe' };
      expect(getUserDisplayName(user)).toBe('John');
    });
  });

  describe('getUserSecondaryName', () => {
    it('should return real name when stage name is provided', () => {
      const user = { name: 'John Doe', stageName: 'DJ Johnny' };
      expect(getUserSecondaryName(user)).toBe('John Doe');
    });

    it('should return null when no stage name', () => {
      const user = { name: 'John Doe' };
      expect(getUserSecondaryName(user)).toBe(null);
    });

    it('should return null when stage name is empty', () => {
      const user = { name: 'John Doe', stageName: '' };
      expect(getUserSecondaryName(user)).toBe(null);
    });

    it('should return null when stage name is whitespace-only', () => {
      const user = { name: 'John Doe', stageName: '   ' };
      expect(getUserSecondaryName(user)).toBe(null);
    });
  });
});

// Run some basic tests manually if needed
console.log('Testing user display name logic:');

const testCases = [
  { name: 'John Doe', stageName: 'DJ Johnny' },
  { name: 'John Doe' },
  { name: 'Madonna' },
  { name: 'John Michael Doe' },
  { name: 'Mary Jane Watson' },
  { name: 'Cher', stageName: 'The Goddess' },
];

testCases.forEach((user) => {
  console.log(`User: ${JSON.stringify(user)}`);
  console.log(`  Display Name: "${getUserDisplayName(user)}"`);
  console.log(`  Secondary Name: ${getUserSecondaryName(user) || 'null'}`);
  console.log('');
});
