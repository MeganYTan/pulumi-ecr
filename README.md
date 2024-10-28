# NodeJS Hello, <Name> Application

This repository is a Hello, <Name> Application built with NodeJS to be deployed to AWS with Pulumi without the use of Pulumi Crosswalk.

## Deploying the application

### Prerequisites
1. Node.JS installed
2. Pulumi CLI installed
3. AWS CLI installed and configured

### Steps to deploy the application
#### 1. Clone the application
```
git clone https://github.com/MeganYTan/pulumi-ecs.git
```

#### 2. Install dependencies
```
npm install
```

#### 3. Configure the <Name> shown (optional)
A name is already configured. To configure your own name run
```
pulumi config set HELLO_NAME <NAME>
```
To check what the configured name is, run
```
pulumi config get HELLO_NAME
```

#### 4. Deploying the application
```
pulumi up
```

#### 5. Access the application
To find the public IP address, get the ENI ID under the task with the following steps:
1. List aws clusters
```
aws ecs list-clusters
```
2. List services in the cluster
```
aws ecs list-services --cluster <cluster-name>
```
3. List tasks in the service
```
aws ecs list-tasks --cluster <cluster-name> --service-name <service-name>
```
4. Describe task to find the ENI ID
```
aws ecs describe-tasks --cluster <cluster-name> --tasks <task-arn>
```
Look for the networkInterfaceId under attachments -> details

5. Describe ENI to get the public IP
```
aws ec2 describe-network-interfaces --network-interface-ids <eni-id>
```
