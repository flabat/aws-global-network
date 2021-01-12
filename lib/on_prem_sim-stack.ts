import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import { CustomResource, Duration } from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';
import * as cr from '@aws-cdk/custom-resources';
import * as autoscaling from '@aws-cdk/aws-autoscaling';
import { env } from 'process';
import { Environment } from '@aws-cdk/core';
import { SSMParameterReader } from './ssm-parameter-reader';
import { AmazonLinuxGeneration, AmazonLinuxImage, CfnRoute, PublicSubnet, SubnetType, Vpc } from '@aws-cdk/aws-ec2';
import { StringParameter } from '@aws-cdk/aws-ssm';
import { isMainThread } from 'worker_threads';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import * as path from 'path';
import { Schedule } from '@aws-cdk/aws-autoscaling';

export const ON_PREM_VPC_PARAMETER = 'ONPREM_VPC_PARAMETER';
export const ON_PREM_PCX_PARAMETER = 'ONPREM_PCX_PARAMETER';
export const ON_PREM_RTS_PARAMETER = 'ONPREM_RTS_PARAMETER';
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
      enableDnsSupport: true,
      maxAzs: 99,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: SubnetType.PRIVATE,
        },
      ]
    });

    let rts = new Array();
    vpc.privateSubnets.forEach(subnet => {
      rts.push(subnet.routeTable.routeTableId);
    });

    const rtsssm = new ssm.StringListParameter(this, 'OnPremRTSParameter', {
      parameterName: ON_PREM_RTS_PARAMETER,
      description: 'List of Route Tables in the VPC',
      stringListValue: rts
    });

    const instanceSG = new ec2.SecurityGroup(this, 'InstanceSG', {
      vpc,
      description: 'Allow Traffic from 10.0.0.0/8',
    });
    
    instanceSG.addIngressRule(ec2.Peer.ipv4('10.0.0.0/8'), ec2.Port.allTraffic(), 'Allow All Traffic');

    const instanceRole = new iam.Role(this, 'instanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    instanceRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    const amznLinux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    });

    const asg  = new autoscaling.AutoScalingGroup(this, 'ASG', {
      vpc: vpc,
      minCapacity: rts.length,
      machineImage: amznLinux,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.NANO),
      securityGroup: instanceSG,
      role: instanceRole
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
    });

  }
}
export class OnPremSimAddRoutes extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const lambdaAddRoutesRole = new iam.Role(this , 'LambdaAddRoutesRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });

    lambdaAddRoutesRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'));
    lambdaAddRoutesRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonVPCFullAccess'));

    const lambdaAddRoutes = new lambda.Function(this, 'LambdaAddRoutes', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda-add-routes')),
      timeout: Duration.seconds(300),
      role: lambdaAddRoutesRole,
    });

    const rule = new events.Rule(this, 'AddRoutesRule', {
      schedule: events.Schedule.rate(Duration.minutes(5))
    });
    
    rule.addTarget(new targets.LambdaFunction(lambdaAddRoutes));
    
  }
}