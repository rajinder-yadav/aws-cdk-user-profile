import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';

// Initialize DynamoDB client with specific configuration for better reliability
const client = new DynamoDBClient({
  maxAttempts: 3,
  retryMode: 'adaptive'
});
const docClient = DynamoDBDocumentClient.from(client);

// Environment variable validation
const envSchema = z.object({
  USER_TABLE_NAME: z.string().min(1),
});

const env = envSchema.parse(process.env);

// Define user profile schema with Zod
const createUserProfileSchema = z.object({
  userId: z.string().min(1).max(100),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  age: z.number().int().min(0).max(150).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
// type CreateUserProfile = z.infer<typeof createUserProfileSchema>;

// Define partial schema for updates (all fields optional)
const updateUserProfileSchema = createUserProfileSchema.partial();
// type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

// Define API Gateway event types
interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  body?: string | null;
  pathParameters?: Record<string, string> | null;
  queryStringParameters?: Record<string, string> | null;
  headers?: Record<string, string> | null;
  requestContext?: Record<string, unknown>;
  isBase64Encoded?: boolean;
}

// API Gateway Lambda handler
export const handler = async (event: APIGatewayEvent) => {
  console.log('Lambda handler invoked');
  console.log('HTTP Method:', event.httpMethod);
  console.log('Path:', event.path);
  console.log('Path Parameters:', event.pathParameters);
  console.log('Raw body present:', !!event.body);

  try {
    // Validate the event structure to prevent 502 errors
    if (!event?.httpMethod || !event.path) {
      console.error('Invalid event structure received:', event);
      return createResponse(500, {
        error: 'Invalid event structure',
        details: 'Required event properties are missing'
      });
    }

    // Determine the HTTP method from the event
    const httpMethod = event.httpMethod.toUpperCase();
    const pathParameters = event.pathParameters || {};
    const userId = pathParameters.id ? pathParameters.id.trim() : '';

    console.log('Processing request for method:', httpMethod, 'with userId:', userId);

    switch (httpMethod) {
      case 'POST':
        return await createUser(event);
      case 'GET':
        if (userId) {
          return await getUser(userId);
        } else {
          return await listUsers();
        }
      case 'PUT':
        if (userId) {
          return await updateUser(userId, event);
        } else {
          return createResponse(400, { error: 'User ID is required for update' });
        }
      case 'DELETE':
        if (userId) {
          return await deleteUser(userId);
        } else {
          return createResponse(400, { error: 'User ID is required for deletion' });
        }
      default:
        return createResponse(405, { error: `Method ${httpMethod} not allowed` });
    }
  } catch (error: unknown) {
    console.error('Unhandled error in handler:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');

    // Ensure we always return a valid response even in unexpected error cases
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createResponse(500, {
      error: 'Internal server error',
      details: errorMessage
    });
  }
};

// Create a new user
const createUser = async (event: APIGatewayEvent) => {
  try {
    // Parse and validate the request body
    let requestBody: Record<string, unknown> = {};
    if (event.body) {
      try {
        requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch {
        return createResponse(400, { error: 'Invalid JSON in request body' });
      }
    }

    // Validate the input against the schema
    const validatedData = createUserProfileSchema.parse({
      ...requestBody,
      userId: requestBody.userId || generateUserId(), // Generate if not provided
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Check if user already exists
    const existingUser = await docClient.send(
      new GetCommand({
        TableName: env.USER_TABLE_NAME,
        Key: { userId: validatedData.userId },
      })
    );

    if (existingUser.Item) {
      return createResponse(409, { error: 'User already exists' });
    }

    // Save the user to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: env.USER_TABLE_NAME,
        Item: validatedData,
      })
    );

    return createResponse(201, { message: 'User created successfully', user: validatedData });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createResponse(400, { error: 'Validation failed', details: error.errors });
    }
    const errorMessage = error instanceof Error ? error.message : 'Request body validation failed';
    return createResponse(400, {
      error: 'Invalid request body',
      details: errorMessage
    });
  }
};

// Get a specific user
const getUser = async (userId: string) => {
  try {
    // Validate userId format
    z.string().min(1).parse(userId);

    const result = await docClient.send(
      new GetCommand({
        TableName: env.USER_TABLE_NAME,
        Key: { userId },
      })
    );

    if (!result.Item) {
      return createResponse(404, { error: 'User not found' });
    }

    return createResponse(200, { user: result.Item });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createResponse(400, { error: 'Invalid user ID format', details: error.errors });
    }
    const errorMessage = error instanceof Error ? error.message : 'Error retrieving user from database';
    return createResponse(500, {
      error: 'Failed to retrieve user',
      details: errorMessage
    });
  }
};

// List all users
const listUsers = async () => {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: env.USER_TABLE_NAME,
      })
    );

    return createResponse(200, { users: result.Items || [] });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error scanning user database';
    return createResponse(500, {
      error: 'Failed to list users',
      details: errorMessage
    });
  }
};

// Update a specific user
const updateUser = async (userId: string, event: APIGatewayEvent) => {
  try {
    // Validate userId format
    z.string().min(1).parse(userId);

    // Parse and validate the request body
    let requestBody: Record<string, unknown> = {};
    if (event.body) {
      try {
        requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch {
        return createResponse(400, { error: 'Invalid JSON in request body' });
      }
    }

    // Validate the input against the update schema (partial)
    const validatedData = updateUserProfileSchema.parse({
      ...requestBody,
      userId,
      updatedAt: new Date().toISOString(),
    });

    // Check if the user exists
    const existingUser = await docClient.send(
      new GetCommand({
        TableName: env.USER_TABLE_NAME,
        Key: { userId },
      })
    );

    if (!existingUser.Item) {
      return createResponse(404, { error: 'User not found' });
    }

    // Build update expression and attribute values
    const updateExpression = 'SET ' +
      Object.keys(validatedData)
        .filter(key => key !== 'userId') // userId cannot be updated
        .map((key) => `#${key} = :${key}`)
        .join(', ');

    const expressionAttributeNames = Object.keys(validatedData)
      .filter(key => key !== 'userId')
      .reduce((acc, key) => {
        acc[`#${key}`] = key;
        return acc;
      }, {} as Record<string, string>);

    const expressionAttributeValues = Object.keys(validatedData)
      .filter(key => key !== 'userId')
      .reduce((acc, key) => {
        acc[`:${key}`] = (validatedData as Record<string, unknown>)[key] as string | number | boolean;
        return acc;
      }, {} as Record<string, string | number | boolean>);

    // Update the user in DynamoDB
    await docClient.send(
      new UpdateCommand({
        TableName: env.USER_TABLE_NAME,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return createResponse(200, { message: 'User updated successfully', userId });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createResponse(400, { error: 'Validation failed', details: error.errors });
    }
    const errorMessage = error instanceof Error ? error.message : 'Request body validation failed';
    return createResponse(400, {
      error: 'Invalid request body',
      details: errorMessage
    });
  }
};

// Delete a specific user
const deleteUser = async (userId: string) => {
  try {
    // Validate userId format
    z.string().min(1).parse(userId);

    // Check if the user exists
    const existingUser = await docClient.send(
      new GetCommand({
        TableName: env.USER_TABLE_NAME,
        Key: { userId },
      })
    );

    if (!existingUser.Item) {
      return createResponse(404, { error: 'User not found' });
    }

    // Delete the user from DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: env.USER_TABLE_NAME,
        Key: { userId },
      })
    );

    return createResponse(200, { message: 'User deleted successfully', userId });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return createResponse(400, { error: 'Invalid user ID format', details: error.errors });
    }
    const errorMessage = error instanceof Error ? error.message : 'Error deleting user from database';
    return createResponse(500, {
      error: 'Failed to delete user',
      details: errorMessage
    });
  }
};

// Helper function to create API Gateway response
const createResponse = (statusCode: number, body: Record<string, unknown> | string) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
};

// Helper function to generate a unique user ID
const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
