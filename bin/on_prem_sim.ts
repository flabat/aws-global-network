#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { OnPremSimVPCStack, OnPremSimVPCPeeringStack } from '../lib/on_prem_sim-stack';
import { env } from 'process';

const app = new cdk.App();

// Declare region properties

const environments = [
    { account: '249937418483', region: 'us-east-2' , cidr: '10.4.0.0/16'},
    { account: '249937418483', region: 'eu-west-2' , cidr: '10.8.0.0/16'},
    { account: '249937418483', region: 'ap-northeast-1' , cidr: '10.12.0.0/16'}
]

const VPCPeeringStack = new OnPremSimVPCPeeringStack(app, `OnPremSimVPCPeeringStack-${environments[0].region}`, {
    env: { account: environments[0].account, region: environments[0].region},
    fromRegion: environments[0].region,
    toRegion: environments[1].region
 });
 
// Instantiate one VPC stack per region

for (const env of environments) {
    const VPCStackRegion = new OnPremSimVPCStack(app, `OnPremSimVPCStack-${env.region}`, {
    env: { account: env.account, region: env.region},
    vpcCidr: env.cidr
    });
    
    VPCPeeringStack.addDependency(VPCStackRegion);
}







