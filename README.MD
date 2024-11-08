# Hello, <Name> NodeJS Application with Pulumi and ECS

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
To access the application, click on the url outputed by Pulumi.
