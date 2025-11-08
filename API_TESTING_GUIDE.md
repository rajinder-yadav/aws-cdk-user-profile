# API Testing Guide for User Profile Management System

This guide provides instructions on how to test all the APIs in the User Profile Management System that was deployed using AWS CDK.

## Prerequisites

1. **Deployed Stack**: The AWS CDK stack must be deployed successfully
2. **API Gateway URL**: You need the API Gateway URL from the deployment output
3. **HTTP Client**: Any HTTP client (curl, Postman, Insomnia, etc.) or command line tools

## API Endpoints

After successful deployment, you will have the following endpoints available (the actual URL will be provided in the deployment output):

- **Base URL**: `https://[api-id].execute-api.[region].amazonaws.com/prod/`
- **Create User**: `POST /users`
- **List All Users**: `GET /users`
- **Get User**: `GET /users/{id}`
- **Update User**: `PUT /users/{id}`
- **Delete User**: `DELETE /users/{id}`

## Testing Instructions

### 1. Create a User (POST /users)

**Endpoint**: `POST /users`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "userId": "user123",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "age": 30
}
```

**Example using curl**:
```bash
curl -X POST \
  'https://[api-id].execute-api.[region].amazonaws.com/prod/users' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user123",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "age": 30
  }'
```

**Expected Response**:
- Status Code: `201 Created`
- Response Body:
```json
{
  "message": "User created successfully",
  "user": {
    "userId": "user123",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "age": 30,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 2. List All Users (GET /users)

**Endpoint**: `GET /users`

**Headers**:
```
Content-Type: application/json
```

**Example using curl**:
```bash
curl -X GET \
  'https://[api-id].execute-api.[region].amazonaws.com/prod/users' \
  -H 'Content-Type: application/json'
```

**Expected Response**:
- Status Code: `200 OK`
- Response Body:
```json
{
  "users": [
    {
      "userId": "user123",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "age": 30,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
 ]
}
```

### 3. Get Specific User (GET /users/{id})

**Endpoint**: `GET /users/{id}`

**Path Parameter**:
- `id`: The user ID of the user you want to retrieve

**Headers**:
```
Content-Type: application/json
```

**Example using curl**:
```bash
curl -X GET \
  'https://[api-id].execute-api.[region].amazonaws.com/prod/users/user123' \
  -H 'Content-Type: application/json'
```

**Expected Response**:
- Status Code: `200 OK`
- Response Body:
```json
{
  "user": {
    "userId": "user123",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "age": 30,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

**Error Response** (User not found):
- Status Code: `404 Not Found`
- Response Body:
```json
{
  "error": "User not found"
}
```

### 4. Update User (PUT /users/{id})

**Endpoint**: `PUT /users/{id}`

**Path Parameter**:
- `id`: The user ID of the user you want to update

**Headers**:
```
Content-Type: application/json
```

**Request Body** (only include fields you want to update):
```json
{
  "firstName": "Jane",
  "age": 28
}
```

**Example using curl**:
```bash
curl -X PUT \
  'https://[api-id].execute-api.[region].amazonaws.com/prod/users/user123' \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Jane",
    "age": 28
  }'
```

**Expected Response**:
- Status Code: `200 OK`
- Response Body:
```json
{
  "message": "User updated successfully",
  "userId": "user123"
}
```

**Error Response** (User not found):
- Status Code: `404 Not Found`
- Response Body:
```json
{
  "error": "User not found"
}
```

### 5. Delete User (DELETE /users/{id})

**Endpoint**: `DELETE /users/{id}`

**Path Parameter**:
- `id`: The user ID of the user you want to delete

**Headers**:
```
Content-Type: application/json
```

**Example using curl**:
```bash
curl -X DELETE \
  'https://[api-id].execute-api.[region].amazonaws.com/prod/users/user123' \
  -H 'Content-Type: application/json'
```

**Expected Response**:
- Status Code: `200 OK`
- Response Body:
```json
{
  "message": "User deleted successfully",
  "userId": "user123"
}
```

**Error Response** (User not found):
- Status Code: `404 Not Found`
- Response Body:
```json
{
  "error": "User not found"
}
```

## Testing All APIs Sequentially

Here's a recommended sequence to test all API operations:

1. **Create a test user** - POST /users
2. **Get the created user** - GET /users/{id}
3. **List all users** - GET /users (should include the new user)
4. **Update the user** - PUT /users/{id}
5. **Get the updated user** - GET /users/{id} (verify changes)
6. **Delete the user** - DELETE /users/{id}
7. **Try to get the deleted user** - GET /users/{id} (should return 404)

## Error Testing

Test the following error scenarios:

1. **Create user with invalid data** - Should return 400 with validation errors
2. **Get non-existent user** - Should return 404
3. **Update non-existent user** - Should return 404
4. **Delete non-existent user** - Should return 404
5. **Use invalid HTTP method** - Should return 405

## Using the Test Script

The project includes an automated test script that can test all APIs using Node.js native fetch API:

1. Make sure you have the API URL from your deployment
2. Set the API_URL environment variable:
   ```bash
   export API_URL=https://[api-id].execute-api.[region].amazonaws.com/prod/
   ```
3. Run the test script:
   ```bash
   npm run test:apis
   # or
   node test-apis.js
   ```

The test script uses Node.js native `fetch` API instead of external libraries like axios, making it lighter and not requiring additional dependencies.

## Troubleshooting

### Common Issues:

1. **502 Bad Gateway**: Usually indicates an issue with the Lambda function. Check CloudWatch logs.
2. **403 Forbidden**: Check if the API Gateway has proper CORS configuration.
3. **404 Not Found**: Verify the endpoint URL and path parameters.
4. **400 Bad Request**: Check request body format and required fields.

### Accessing CloudWatch Logs:

To view Lambda function logs for debugging:
1. Go to AWS Console → CloudWatch → Logs → Log Groups
2. Find the log group for your Lambda function (usually `/aws/lambda/[function-name]`)
3. View the log streams to see function execution details

## Validation Rules

The API validates the following:
- `userId`: Required, 1-100 characters
- `email`: Required, valid email format
- `firstName`: Required, 1-100 characters
- `lastName`: Required, 1-100 characters
- `age`: Optional, integer between 0-150
