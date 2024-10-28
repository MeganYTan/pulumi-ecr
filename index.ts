import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";

// Create container Image
// 1. Create an ECR repository
const repo = new aws.ecr.Repository("hello-world");

// 2. Build and push the Docker image to ECR
const imageName = pulumi.interpolate`${repo.repositoryUrl}:v3`;
const image = new docker.Image("hello-world-image", {
    build: { context: "./helloworld" },
    imageName: imageName,  
    registry: pulumi.all([repo.repositoryUrl]).apply(async ([repositoryUrl]) => {
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

// Deploy image onto ECS
// 1. Create an ECS cluster
const cluster = new aws.ecs.Cluster("my-ecs-cluster");

// 2. Define an IAM role for ECS Task Execution
const taskExecutionRole = new aws.iam.Role("ecs-task-execution-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { Service: "ecs-tasks.amazonaws.com" },
                Action: "sts:AssumeRole",
            },
        ],
    }),
});

// Attach the necessary policy to the role
new aws.iam.RolePolicyAttachment("ecsTaskExecutionPolicy", {
    role: taskExecutionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

// Get the Pulumi Config values
let config = new pulumi.Config();
const HELLO_NAME = config.get("HELLO_NAME");
console.log(HELLO_NAME);
// Get the deployed image name and access it
imageName.apply(imgName => {
    // 3. Create a task definition for the ECS service
    const taskDefinition = new aws.ecs.TaskDefinition("my-app-task", {
        family: "my-ecs-task-family",
        cpu: "256",
        memory: "512",
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: taskExecutionRole.arn,
        containerDefinitions: pulumi.output(
            JSON.stringify([
                {
                    name: "my-app",
                    image: imgName,
                    essential: true,
                    portMappings: [
                        {
                            containerPort: 80,
                            hostPort: 80,
                            protocol: "tcp",
                        },
                    ],
                    // Set config variable as environmental variable so node application can access it
                    environment: [
                        { name: "HELLO_NAME", value: HELLO_NAME }
                    ],
                },
            ])
        ),
    });
    // 4. Create a security group
    const securityGroup = new aws.ec2.SecurityGroup("ecs-sg", {
        description: "Allow HTTP traffic",
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

    // 5. Create an ECS service using the task definition
    const service = new aws.ecs.Service("my-ecs-service", {
        cluster: cluster.arn,
        taskDefinition: taskDefinition.arn,
        desiredCount: 1,
        launchType: "FARGATE",
        networkConfiguration: {
            assignPublicIp: true,
            subnets: ["subnet-000a7ddcea49bf1c7"],
            securityGroups: [securityGroup.id],
        },
    });
})
