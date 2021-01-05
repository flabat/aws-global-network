#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { OnPremSimStack } from '../lib/on_prem_sim-stack';

const app = new cdk.App();
new OnPremSimStack(app, 'OnPremSimStack');
