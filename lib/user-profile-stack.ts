import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'node:path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class UserProfileStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB table for user profiles
    const userTable = new dynamodb.Table(this, 'UserProfileTable', {
      tableName: 'UserProfile',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Use DESTROY for development, RETAIN for production
      timeToLiveAttribute: 'ttl', // Optional: for automatic cleanup
    });

    // Create Lambda function for handling user profile CRUD operations
    const userProfileFunction = new NodejsFunction(this, 'UserProfileFunction', {
      entry: path.join(__dirname, '../lambda/index.ts'), // Points to the entry file
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X, // Explicitly set runtime for AWS SDK v3
      environment: {
        USER_TABLE_NAME: userTable.tableName,
      },
      timeout: cdk.Duration.seconds(60), // Increased timeout to handle potential delays
      memorySize: 512, // Increased memory for better performance
      bundling: {
        minify: false,
        externalModules: [
          // Mark these as external to keep them out of the bundle
          // The AWS SDK is already available in the Lambda runtime
          '@aws-sdk/*',
        ],
        esbuildArgs: {
          '--packages': 'bundle',  // Correct argument for esbuild breaking change
        },
      },
    });

    // Grant the Lambda function read/write permissions to the DynamoDB table
    userTable.grantReadWriteData(userProfileFunction);

    // Create API Gateway REST API
    const api = new apigateway.RestApi(this, 'UserProfileApi', {
      restApiName: 'User Profile Service',
      description: 'API for managing user profiles',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Add resource and methods for user profile operations
    const usersResource = api.root.addResource('users');

    // POST /users - Create user
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(userProfileFunction, {
      proxy: true,
    }));

    // GET /users - List all users
    usersResource.addMethod('GET', new apigateway.LambdaIntegration(userProfileFunction, {
      proxy: true,
    }));

    const userResource = usersResource.addResource('{id}');

    // GET /users/{id} - Get specific user
    userResource.addMethod('GET', new apigateway.LambdaIntegration(userProfileFunction, {
      proxy: true,
    }));

    // PUT /users/{id} - Update specific user
    userResource.addMethod('PUT', new apigateway.LambdaIntegration(userProfileFunction, {
      proxy: true,
    }));

    // DELETE /users/{id} - Delete specific user
    userResource.addMethod('DELETE', new apigateway.LambdaIntegration(userProfileFunction, {
      proxy: true,
    }));

    // Output the API Gateway URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'The URL of the User Profile API',
      exportName: 'UserProfileApiUrl',
    });

    // Output the DynamoDB table name
    new cdk.CfnOutput(this, 'TableName', {
      value: userTable.tableName,
      description: 'The name of the User Profile table',
      exportName: 'UserProfileTableName',
    });

    // Output individual endpoint URLs
    new cdk.CfnOutput(this, 'CreateUserEndpoint', {
      value: `${api.url}users`,
      description: 'POST endpoint to create a user profile',
      exportName: 'CreateUserEndpoint',
    });

    new cdk.CfnOutput(this, 'ListUsersEndpoint', {
      value: `${api.url}users`,
      description: 'GET endpoint to list all user profiles',
      exportName: 'ListUsersEndpoint',
    });

    new cdk.CfnOutput(this, 'GetUserEndpoint', {
      value: `${api.url}users/{id}`,
      description: 'GET endpoint to retrieve a specific user profile',
      exportName: 'GetUserEndpoint',
    });

    new cdk.CfnOutput(this, 'UpdateUserEndpoint', {
      value: `${api.url}users/{id}`,
      description: 'PUT endpoint to update a specific user profile',
      exportName: 'UpdateUserEndpoint',
    });

    new cdk.CfnOutput(this, 'DeleteUserEndpoint', {
      value: `${api.url}users/{id}`,
      description: 'DELETE endpoint to delete a specific user profile',
      exportName: 'DeleteUserEndpoint',
    });
  }
}
