# Container image for deploying the user service to AWS Lambda
FROM public.ecr.aws/lambda/nodejs:20

# Copy dependency manifests first to take advantage of cached layers
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# The Express server listens on 3001 by default; Lambda forwards requests internally
ENV PORT=3001

# Configure the Lambda entry point
CMD ["lambda-handler.handler"]
