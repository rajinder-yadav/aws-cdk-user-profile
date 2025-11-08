#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { UserProfileStack } from '../lib/user-profile-stack';

const app = new cdk.App();
new UserProfileStack(app, 'UserProfileStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
