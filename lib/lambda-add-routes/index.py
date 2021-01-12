import boto3
import botocore

def handler(event, context):

  ssm = boto3.client('ssm')
  ec2 = boto3.client('ec2')


  routeTablesResponse = ssm.get_parameter(
      Name='ONPREM_RTS_PARAMETER'
  )

  vpcResponse = ssm.get_parameter(
      Name='ONPREM_VPC_PARAMETER'
  )
  peeringConnectionsResponse = ec2.describe_vpc_peering_connections()

  routeTables = routeTablesResponse['Parameter']['Value'].split(",")
  vpc = vpcResponse['Parameter']['Value']
  peeringConnections = peeringConnectionsResponse['VpcPeeringConnections']

  vpcCidrResponse = ec2.describe_vpcs(
      VpcIds=[
          vpc,
      ],
  )

  vpcCidr = vpcCidrResponse['Vpcs'][0]['CidrBlock']

  print("Region VPC Cidr Block: " + vpcCidr)

  for peering in peeringConnections:
      if peering['Status']['Code'] == "active":
          PeeringId = peering['VpcPeeringConnectionId']
          AccepterVpcCidr = peering['AccepterVpcInfo']['CidrBlock']
          RequesterVpcCidr = peering['RequesterVpcInfo']['CidrBlock']
          print(AccepterVpcCidr)
          print(RequesterVpcCidr)
          if AccepterVpcCidr == vpcCidr:
              print('accepter is local')
              for routeTable in routeTables:
                  try:
                      createRoute = ec2.create_route(
                          DestinationCidrBlock= RequesterVpcCidr,
                          RouteTableId= routeTable,
                          VpcPeeringConnectionId= PeeringId,
                      )
                      print("Route Added")
                  except botocore.exceptions.ClientError as error:
                      print("error: Route probably already exist")
          if RequesterVpcCidr == vpcCidr:
              print('requester is local')
              for routeTable in routeTables:
                  try:
                      createRoute = ec2.create_route(
                          DestinationCidrBlock= AccepterVpcCidr,
                          RouteTableId= routeTable,
                          VpcPeeringConnectionId= PeeringId,
                      )
                      print("route added")
                  except botocore.exceptions.ClientError as error:
                      print("error: Route probably already exist")
          print("_______________")
  return "AddRoutes Executed"