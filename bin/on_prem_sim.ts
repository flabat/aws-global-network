#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { OnPremSimVPCStack, OnPremSimVPCPeeringStack, OnPremSimAddRoutes } from '../lib/on_prem_sim-stack';
import { env } from 'process';

const app = new cdk.App();

const account = '249937418483';

// Declare region properties
const environments = [
    { account: account, region: 'af-south-1' , cidr: '10.2.0.0/16'},
    // { account: account, region: 'ap-east-1' , cidr: '10.4.0.0/16'},
    // { account: account, region: 'ap-northeast-1' , cidr: '10.8.0.0/16'},
    // { account: account, region: 'ap-northeast-2' , cidr: '10.12.0.0/16'},
    // { account: account, region: 'ap-northeast-3' , cidr: '10.14.0.0/16'},
    // { account: account, region: 'ap-south-1' , cidr: '10.16.0.0/16'},
    // { account: account, region: 'ap-southeast-1' , cidr: '10.20.0.0/16'},
    // { account: account, region: 'ap-southeast-2' , cidr: '10.22.0.0/16'},
    // { account: account, region: 'ca-central-1' , cidr: '10.24.0.0/16'},
    // { account: account, region: 'eu-central-1' , cidr: '10.26.0.0/16'},
    // { account: account, region: 'eu-north-1' , cidr: '10.28.0.0/16'},
    // { account: account, region: 'eu-south-1' , cidr: '10.30.0.0/16'},
    // { account: account, region: 'eu-west-1' , cidr: '10.32.0.0/16'},
    { account: account, region: 'eu-west-2' , cidr: '10.34.0.0/16'},
    // { account: account, region: 'eu-west-3' , cidr: '10.36.0.0/16'},
    // { account: account, region: 'me-south-1' , cidr: '10.38.0.0/16'},
    { account: account, region: 'sa-east-1' , cidr: '10.40.0.0/16'},
    // { account: account, region: 'us-east-1' , cidr: '10.42.0.0/16'},
    { account: account, region: 'us-east-2' , cidr: '10.44.0.0/16'},
    //{ account: account, region: 'us-west-1' , cidr: '10.46.0.0/16'},
    { account: account, region: 'us-west-2' , cidr: '10.48.0.0/16'},
]

// Instantiate one VPC stack per region
const envCount = environments.length;
let envIndex = 0;

for (const env of environments) {

    const VPCStackRegion = new OnPremSimVPCStack(app, `OnPremSimVPCStack-${env.region}`, {
        env: { account: env.account, region: env.region},
        vpcCidr: env.cidr
    });

    const addRoutes = new OnPremSimAddRoutes(app, `AddRoutesLambda-${env.region}`, {
        env: { account: env.account, region: env.region},
    });

    if ( (envIndex+1) < envCount) {
        const peerings = (envCount - envIndex - 1);
        for(var i=0; i < peerings; i++) {
            const VPCPeeringStack = new OnPremSimVPCPeeringStack(app, `OnPremSimVPCPeeringStack-${env.region}-${i}`, {
                env: { account: env.account, region: env.region},
                fromRegion: environments[envIndex].region,
                toRegion: environments[envIndex+1+i].region
            });
            VPCPeeringStack.addDependency(VPCStackRegion);
            addRoutes.addDependency(VPCPeeringStack);
            addRoutes.addDependency(VPCStackRegion); 
        };
        
    };
    envIndex++;
}