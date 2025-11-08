// This script should be run after deploying the stack to test all API endpoints
async function testAPIs() {
  // You need to replace this with the actual API URL from your deployment
  // This will be available after running `cdk deploy`
  const API_URL = process.env.API_URL || 'https://9lum3zclq8.execute-api.us-east-1.amazonaws.com/prod/users';

  console.log('Testing User Profile APIs...');
  console.log('Using API URL:', API_URL);

  try {
    // Test 1: Create a user
    console.log('\n1. Testing CREATE user...');
    const createUserData = {
      userId: `test-user-${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      age: 30
    };
    const createUserResponse = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createUserData)
    });
    const createUserResult = await createUserResponse.json();
    console.log('✓ Create user response:', createUserResponse.status, createUserResult);

    const userId = createUserResult.user?.userId;
    console.log('Created user with ID:', userId);

    // Test 2: Get the created user
    console.log('\n2. Testing GET user...');
    const getUserResponse = await fetch(`${API_URL}/users/${userId}`);
    const getUserResult = await getUserResponse.json();
    console.log('✓ Get user response:', getUserResponse.status, getUserResult);

    // Test 3: Update the user
    console.log('\n3. Testing UPDATE user...');
    const updateUserData = {
      firstName: 'Updated',
      lastName: 'Name',
      age: 35
    };
    const updateUserResponse = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateUserData)
    });
    const updateUserResult = await updateUserResponse.json();
    console.log('✓ Update user response:', updateUserResponse.status, updateUserResult);

    // Test 4: Get the updated user
    console.log('\n4. Testing GET updated user...');
    const getUpdatedUserResponse = await fetch(`${API_URL}/users/${userId}`);
    const getUpdatedUserResult = await getUpdatedUserResponse.json();
    console.log('✓ Get updated user response:', getUpdatedUserResponse.status, getUpdatedUserResult);
    console.log('Updated user firstName:', getUpdatedUserResult.user?.firstName);

    // Test 5: List all users
    console.log('\n5. Testing LIST all users...');
    const listUsersResponse = await fetch(`${API_URL}/users`);
    const listUsersResult = await listUsersResponse.json();
    console.log('✓ List users response:', listUsersResponse.status, `Found ${listUsersResult.users?.length || 0} users`);

    // Test 6: Delete the user
    console.log('\n6. Testing DELETE user...');
    const deleteUserResponse = await fetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE'
    });
    const deleteUserResult = await deleteUserResponse.json();
    console.log('✓ Delete user response:', deleteUserResponse.status, deleteUserResult);

    // Test 7: Try to get the deleted user (should return 404)
    console.log('\n7. Testing GET deleted user (should return 404)...');
    const deletedUserResponse = await fetch(`${API_URL}/users/${userId}`);
    const deletedUserResult = await deletedUserResponse.json();
    if (deletedUserResponse.status === 404) {
      console.log('✓ Correctly received 404 for deleted user:', deletedUserResult);
    } else {
      console.log('✗ Expected 404 error but got:', deletedUserResponse.status, deletedUserResult);
    }

    console.log('\n✓ All API tests completed successfully!');
  } catch (error) {
    console.error('✗ API test failed:', error.message);
    throw error;
  }
}

// Run the tests
testAPIs().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
