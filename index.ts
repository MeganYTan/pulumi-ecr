import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";

// 1. Create an ECR repository
const repo = new aws.ecr.Repository("hello-world-2-pulumi");

// 2. Build and push the Docker image to ECR
export const imageName = pulumi.interpolate`${repo.repositoryUrl}:v1`;

const image = new docker.Image("hello-world-image", {
    build: { context: "./helloworld" },
    imageName: imageName,
    registry: repo.repositoryUrl.apply(async ([repositoryUrl]) => {
        const authToken = await aws.ecr.getAuthorizationToken();
        const decodedCredentials = Buffer.from(authToken.authorizationToken, 'base64').toString('utf-8');
        const [username, password] = decodedCredentials.split(':');
        const serverUrl = repositoryUrl.substring(0, repositoryUrl.lastIndexOf('/'));
        return {
            server: serverUrl,
            username: username,
            password: password,
        };
    }),
});


// create a cluster
const cluster = new aws.ecs.Cluster("pulumi-ecs-cluster-2");

// define the default vpc info to deploy
const vpc = aws.ec2.getVpcOutput({ default: true });
const subnets = aws.ec2.getSubnetsOutput({
  filters: [
    {
      name: "vpc-id",
      values: [vpc.id],
    },
  ],
});

// create the security groups
const securityGroup = new aws.ec2.SecurityGroup("ecs-sg-2", {
  vpcId: vpc.id,
  description: "HTTP access",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

// define a loadbalancer
const lb = new aws.lb.LoadBalancer("pulumi-lb", {
  securityGroups: [securityGroup.id],
  subnets: subnets.ids,
});

// target group for port 80
const targetGroup = new aws.lb.TargetGroup("pulumi-tg", {
  port: 80,
  protocol: "HTTP",
  targetType: "ip",
  vpcId: vpc.id,
});

// listener for port 80
const listener = new aws.lb.Listener("pulumi-listener", {
  loadBalancerArn: lb.arn,
  port: 80,
  defaultActions: [
    {
      type: "forward",
      targetGroupArn: targetGroup.arn,
    },
  ],
});

const role = new aws.iam.Role("role", {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "ecs-tasks.amazonaws.com",
  }),
});

new aws.iam.RolePolicyAttachment("role-policy-attachment", {
  role: role.name,
  policyArn:
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});


let config = new pulumi.Config();
const HELLO_NAME = config.get("HELLO_NAME");

const taskDefJson = pulumi.all([imageName, securityGroup]).apply(([imgName, sg]) =>
    JSON.stringify([
      {
        name: "my-app",
        image: imgName,
        portMappings: [
          {
            containerPort: 80,
            hostPort: 80,
            protocol: sg.ingress[0].protocol,
          },
        ],
        environment: [
            { name: "HELLO_NAME", value: HELLO_NAME }
        ],
      },
    ])
);

const taskDefinition = new aws.ecs.TaskDefinition("task-definition", {
  family: "pulumi-task-definition",
  cpu: "256",
  memory: "512",
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  executionRoleArn: role.arn,
  containerDefinitions: taskDefJson
});

const service = new aws.ecs.Service("example", {
  cluster: cluster.arn,
  desiredCount: 1,
  launchType: "FARGATE",
  taskDefinition: taskDefinition.arn,
  networkConfiguration: {
    assignPublicIp: true,
    subnets: subnets.ids,
    securityGroups: [securityGroup.id],
  },
  loadBalancers: [
    {
      targetGroupArn: targetGroup.arn,
      containerName: "my-app",
      containerPort: 80,
    },
  ],
});

export const url = lb.dnsName;