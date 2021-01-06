import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import { env } from 'process';
import { Environment } from '@aws-cdk/core';
import { SSMParameterReader } from './ssm-parameter-reader';

export const ON_PREM_VPC_PARAMETER = 'ONPREM_VPC_PARAMETER';

interface OnPremSimProps extends cdk.StackProps {
  vpcCidr?: string;
}

export interface OnPremSimVpcPeeringProps extends OnPremSimProps { 
  fromRegion: string;
  toRegion: string
}
export class OnPremSimVPCStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: OnPremSimProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'OnPremVPC', {
      cidr: props.vpcCidr,
      maxAzs: 2,
      natGateways: 1,
      enableDnsSupport: true
    });

    const vpcssm = new ssm.StringParameter(this, 'OnPremVPCParameter', {
      parameterName: ON_PREM_VPC_PARAMETER,
      description: 'The VPC Id created by the OnPremSim Deployment',
      stringValue: vpc.vpcId
    });
  }
}

export class OnPremSimVPCPeeringStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: OnPremSimVpcPeeringProps) {
    super(scope, id, props);

    // reads the vpc id from parameter store in the 'to' region
    const PeerVPCIdReader = new SSMParameterReader(this, 'PeerVPCIdReader', {
      parameterName: ON_PREM_VPC_PARAMETER,
      region: props.toRegion
    });
    const PeerVPCid: string = PeerVPCIdReader.getParameterValue();

    const VPCIdReader = new SSMParameterReader(this, 'VPCIdReader', {
      parameterName: ON_PREM_VPC_PARAMETER,
      region: props.fromRegion
    });
    const VPCid: string = VPCIdReader.getParameterValue();
    
    const vpcPeering = new ec2.CfnVPCPeeringConnection(this, 'OnPremVPCPeering', {
      vpcId: VPCid,
      peerVpcId: PeerVPCid,
      peerRegion: props.toRegion
    })
  }
}