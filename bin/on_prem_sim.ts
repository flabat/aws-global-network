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

 
// Instantiate one VPC stack per region

const envCount = environments.length;
let envIndex = 0;

console.log(envCount); // debug

for (const env of environments) {
    console.log(envIndex);
    
    const VPCStackRegion = new OnPremSimVPCStack(app, `OnPremSimVPCStack-${env.region}`, {
    env: { account: env.account, region: env.region},
    vpcCidr: env.cidr
    });
    if ( (envIndex+1) < envCount) {
        const VPCPeeringStack = new OnPremSimVPCPeeringStack(app, `OnPremSimVPCPeeringStack-${env.region}`, {
            env: { account: env.account, region: env.region},
            fromRegion: environments[envIndex].region,
            toRegion: environments[envIndex+1].region
        });
        VPCPeeringStack.addDependency(VPCStackRegion);
    };
    
    envIndex++;
}







