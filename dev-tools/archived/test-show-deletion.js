// Test script to verify the delete show functionality
const testShowDeletion = async () => {
  console.log('Testing show deletion...');

  // First, let's get a list of shows to find one to delete
  try {
    const response = await fetch('http://localhost:8000/api/admin/shows?page=1&limit=1', {
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Shows response:', data);

    if (data.items && data.items.length > 0) {
      const showId = data.items[0].id;
      console.log('Found show to test with ID:', showId);

      // Test the DELETE endpoint
      const deleteResponse = await fetch(`http://localhost:8000/api/admin/shows/${showId}`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });

      console.log('Delete response status:', deleteResponse.status);
      console.log('Delete response headers:', [...deleteResponse.headers.entries()]);

      if (deleteResponse.ok) {
        const deleteData = await deleteResponse.text();
        console.log('Delete successful:', deleteData);
      } else {
        const errorData = await deleteResponse.text();
        console.log('Delete failed:', errorData);
      }
    } else {
      console.log('No shows found to test with');
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testShowDeletion();
