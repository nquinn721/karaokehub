// Simple test file for user utility functions using CommonJS

function getUserDisplayName(user) {
  // If stage name is provided and not empty, use it
  if (user.stageName && user.stageName.trim()) {
    return user.stageName.trim();
  }

  // If no stage name, use first name logic
  const fullName = user.name.trim();
  const nameParts = fullName.split(/\s+/); // Split on any whitespace

  // If full name has multiple words, use the first word (first name)
  if (nameParts.length > 1) {
    return nameParts[0];
  }

  // If full name is only one word, use that word
  return fullName;
}

function getUserSecondaryName(user) {
  // Only show real name as secondary if we're displaying stage name as primary
  if (user.stageName && user.stageName.trim()) {
    return user.name.trim();
  }

  return null;
}

console.log('Testing user display name logic:');
console.log('');

const testCases = [
  { name: 'John Doe', stageName: 'DJ Johnny' },
  { name: 'John Doe' },
  { name: 'Madonna' },
  { name: 'John Michael Doe' },
  { name: 'Mary Jane Watson' },
  { name: 'Cher', stageName: 'The Goddess' },
  { name: 'John Doe', stageName: '' },
  { name: 'John Doe', stageName: '   ' },
];

testCases.forEach((user, index) => {
  console.log(`Test ${index + 1}: ${JSON.stringify(user)}`);
  console.log(`  Display Name: "${getUserDisplayName(user)}"`);
  console.log(`  Secondary Name: ${getUserSecondaryName(user) || 'null'}`);
  console.log('');
});
