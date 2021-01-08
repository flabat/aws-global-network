#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { OnPremSimVPCStack, OnPremSimVPCPeeringStack, OnPremSimVPCAddRouteStack } from '../lib/on_prem_sim-stack';
import { env } from 'process';

const app = new cdk.App();

// Declare region properties
const environments = [
    { account: '249937418483', region: 'us-east-2' , cidr: '10.2.0.0/16'},
    { account: '249937418483', region: 'eu-west-2' , cidr: '10.4.0.0/16'},
    { account: '249937418483', region: 'ap-northeast-1' , cidr: '10.8.0.0/16'},
    { account: '249937418483', region: 'eu-central-1' , cidr: '10.12.0.0/16'},
    // { account: '249937418483', region: 'sa-east-1' , cidr: '10.14.0.0/16'},
    // { account: '249937418483', region: 'me-south-1' , cidr: '10.16.0.0/16'},
    // { account: '249937418483', region: 'af-south-1' , cidr: '10.18.0.0/16'},
    // { account: '249937418483', region: 'af-south-1' , cidr: '10.20.0/16'},
    // { account: '249937418483', region: 'af-south-1' , cidr: '10.22.0.0/16'},
    // { account: '249937418483', region: 'af-south-1' , cidr: '10.24.0.0/16'},
    // { account: '249937418483', region: 'af-south-1' , cidr: '10.26.0.0/16'},
    // { account: '249937418483', region: 'af-south-1' , cidr: '10.28.0.0/16'},
    // { account: '249937418483', region: 'af-south-1' , cidr: '10.30.0.0/16'},
    // { account: '249937418483', region: 'af-south-1' , cidr: '10.32.0.0/16'},
]

// Instantiate one VPC stack per region
const envCount = environments.length;
let envIndex = 0;

for (const env of environments) {
    const VPCStackRegion = new OnPremSimVPCStack(app, `OnPremSimVPCStack-${env.region}`, {
        env: { account: env.account, region: env.region},
        vpcCidr: env.cidr
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
        };  
    };
    envIndex++;
    // loop over regions and create routes
    const VPCRoutes = new OnPremSimVPCAddRouteStack(app, `OnPremSimRoute-${env.region}`, {
        env: { account: env.account, region: env.region},
        fromRegion: env.region
    });

    
}