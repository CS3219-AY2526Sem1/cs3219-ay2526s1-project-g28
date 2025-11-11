# Deploying the user service to AWS Lambda

This directory contains the assets required to deploy the Express-based user service as an AWS Lambda function that is packaged inside a container image. The Dockerfile follows the guidance from the [AWS Lambda documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html) for Node.js 20.

## Prerequisites

- AWS CLI v2 configured with credentials that have permissions for Amazon ECR and AWS Lambda
- Docker 25.0 or later with the `buildx` plugin enabled
- An Amazon ECR repository in the AWS Region you intend to deploy to
- MongoDB Atlas (or another MongoDB deployment) that the function can reach, along with the necessary connection string in `DB_CLOUD_URI`

## Build and push the container image

From the `backend/user-service` directory:

```bash
# Build the container image that targets the Lambda execution environment
DOCKER_BUILDKIT=1 docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t user-service-lambda:latest \
  -f lambda/Dockerfile \
  .

# (Optional) Test locally with the Lambda Runtime Interface Emulator
# Requires the RIE binary to be installed at ~/.aws-lambda-rie/aws-lambda-rie
mkdir -p ~/.aws-lambda-rie
if [ ! -f ~/.aws-lambda-rie/aws-lambda-rie ]; then
  curl -Lo ~/.aws-lambda-rie/aws-lambda-rie \
    https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie
  chmod +x ~/.aws-lambda-rie/aws-lambda-rie
fi

docker run --rm \
  --platform linux/amd64 \
  -p 9000:8080 \
  --env-file ./.env \
  --entrypoint /aws-lambda/aws-lambda-rie \
  user-service-lambda:latest \
    /lambda-entrypoint.sh lambda-handler.handler

# Invoke the locally running container
curl "http://127.0.0.1:9000/2015-03-31/functions/function/invocations" \
  -d '{"rawPath":"/health","requestContext":{"http":{"method":"GET"}}}'
```

Once you have tested the image, authenticate Docker to ECR, tag the image, and push it to the repository:

```bash
AWS_ACCOUNT_ID=111122223333
AWS_REGION=us-east-1
ECR_REPO=user-service

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker tag user-service-lambda:latest \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest"

docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest"
```

## Create or update the Lambda function

```bash
LAMBDA_ROLE_ARN=arn:aws:iam::111122223333:role/user-service-lambda-role
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest"

aws lambda create-function \
  --function-name user-service \
  --package-type Image \
  --code ImageUri="$IMAGE_URI" \
  --role "$LAMBDA_ROLE_ARN" \
  --timeout 30 \
  --memory-size 1024
```

For subsequent deployments, replace `create-function` with `update-function-code`:

```bash
aws lambda update-function-code \
  --function-name user-service \
  --image-uri "$IMAGE_URI" \
  --publish
```

Set the required environment variables on the function so that the Express application can connect to MongoDB and generate the correct callback URLs:

```bash
aws lambda update-function-configuration \
  --function-name user-service \
  --environment "Variables={
    ENV=PROD,
    DB_CLOUD_URI=<mongodb-uri>,
    JWT_SECRET=<jwt-secret>,
    FRONTEND_ORIGIN=https://your-frontend.example,
    GOOGLE_CALLBACK_URL=https://your-domain/auth/google/callback,
    GITHUB_CALLBACK_URL=https://your-domain/auth/github/callback,
    EMAIL_VERIFICATION_URL=https://your-frontend.example/verify-email,
    PASSWORD_RESET_URL=https://your-frontend.example/reset-password,
    EMAIL_VERIFICATION_TTL_HOURS=60
  }"
```

After the environment variables are configured, invoke the Lambda function directly to verify that it responds correctly:

```bash
aws lambda invoke \
  --function-name user-service \
  response.json && cat response.json
```

You can then expose the function through an HTTPS endpoint by configuring an API Gateway HTTP API or a Lambda Function URL.
