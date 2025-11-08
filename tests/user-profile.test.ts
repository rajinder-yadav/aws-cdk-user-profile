// Import handler after setting environment
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

// Set environment variable before importing handler
process.env.USER_TABLE_NAME = 'UserProfile';
import { handler } from '../lambda/index';

// Create a mock for DynamoDB Document Client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('User Profile Lambda Function', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('POST /users - Create User', () => {
    it('should create a new user successfully', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/users',
        body: JSON.stringify({
          userId: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          age: 30
        })
      };

      ddbMock.on(GetCommand).resolves({ Item: undefined }); // User doesn't exist
      ddbMock.on(PutCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('User created successfully');
      expect(responseBody.user.userId).toBe('user123');
      expect(responseBody.user.email).toBe('test@example.com');
    });

    it('should return 400 for invalid input', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/users',
        body: JSON.stringify({
          email: 'invalid-email', // Missing required fields and invalid email
          age: 'not-a-number' // Wrong type
        })
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('Validation failed');
    });

    it('should return 409 if user already exists', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/users',
        body: JSON.stringify({
          userId: 'existing-user',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          age: 30
        })
      };

      ddbMock.on(GetCommand).resolves({ Item: { userId: 'existing-user' } }); // User exists

      const result = await handler(event);

      expect(result.statusCode).toBe(409);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('User already exists');
    });
  });

  describe('GET /users - List All Users', () => {
    it('should return all users', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/users'
      };

      ddbMock.on(ScanCommand).resolves({
        Items: [
          { userId: 'user1', email: 'user1@example.com', firstName: 'John', lastName: 'Doe' },
          { userId: 'user2', email: 'user2@example.com', firstName: 'Jane', lastName: 'Smith' }
        ]
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.users).toHaveLength(2);
      expect(responseBody.users[0].userId).toBe('user1');
      expect(responseBody.users[1].userId).toBe('user2');
    });

    it('should return empty array if no users exist', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/users'
      };

      ddbMock.on(ScanCommand).resolves({ Items: [] });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.users).toHaveLength(0);
    });
  });

  describe('GET /users/{id} - Get User', () => {
    it('should return a specific user', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/users/user123',
        pathParameters: { id: 'user123' }
      };

      ddbMock.on(GetCommand).resolves({
        Item: { userId: 'user123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.user.userId).toBe('user123');
      expect(responseBody.user.email).toBe('test@example.com');
    });

    it('should return 404 if user not found', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/users/nonexistent',
        pathParameters: { id: 'nonexistent' }
      };

      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('User not found');
    });

    it('should return all users when user ID is empty (list all)', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/users',
        pathParameters: { id: '' } // Empty ID
      };

      ddbMock.on(ScanCommand).resolves({ Items: [] });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.users).toHaveLength(0);
    });
  });

  describe('PUT /users/{id} - Update User', () => {
    it('should update a user successfully', async () => {
      const event = {
        httpMethod: 'PUT',
        path: '/users/user123',
        pathParameters: { id: 'user123' },
        body: JSON.stringify({
          firstName: 'Updated',
          age: 35
        })
      };

      // First call to check if user exists, second call for the update
      ddbMock.on(GetCommand).resolves({
        Item: { userId: 'user123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' }
      });
      ddbMock.on(UpdateCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('User updated successfully');
      expect(responseBody.userId).toBe('user123');
    });

    it('should return 404 if user to update does not exist', async () => {
      const event = {
        httpMethod: 'PUT',
        path: '/users/nonexistent',
        pathParameters: { id: 'nonexistent' },
        body: JSON.stringify({
          firstName: 'Updated'
        })
      };

      ddbMock.on(GetCommand).resolves({ Item: undefined }); // User doesn't exist

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('User not found');
    });

    it('should return 400 for invalid update data', async () => {
      const event = {
        httpMethod: 'PUT',
        path: '/users/user123',
        pathParameters: { id: 'user123' },
        body: JSON.stringify({
          email: 'invalid-email',
          age: -5 // Invalid age
        })
      };

      ddbMock.on(GetCommand).resolves({
        Item: { userId: 'user123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' }
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('Validation failed');
    });
  });

  describe('DELETE /users/{id} - Delete User', () => {
    it('should delete a user successfully', async () => {
      const event = {
        httpMethod: 'DELETE',
        path: '/users/user123',
        pathParameters: { id: 'user123' }
      };

      ddbMock.on(GetCommand).resolves({
        Item: { userId: 'user123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' }
      });
      ddbMock.on(DeleteCommand).resolves({});

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toBe('User deleted successfully');
      expect(responseBody.userId).toBe('user123');
    });

    it('should return 404 if user to delete does not exist', async () => {
      const event = {
        httpMethod: 'DELETE',
        path: '/users/nonexistent',
        pathParameters: { id: 'nonexistent' }
      };

      ddbMock.on(GetCommand).resolves({ Item: undefined }); // User doesn't exist

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('User not found');
    });
  });

  describe('Invalid HTTP Methods', () => {
    it('should return 405 for unsupported HTTP method', async () => {
      const event = {
        httpMethod: 'PATCH',
        path: '/users'
      };

      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('Method PATCH not allowed');
    });
  });
});
