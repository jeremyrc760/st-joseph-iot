# ============================================================
# Stage 1: Build the NestJS application
# ============================================================

# Use Node.js 22 on debian Bookworm Slim as the base image for building the application
FROM node:22-bookworm-slim AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy dependencies files to the working directory
# This allows Docker to cache the installation of dependencies if they haven't changed
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code to the working directory
COPY . .

# Compile the TypeScript code to JavaScript, the compiled application will be generated in /app/dist
RUN npm run build

# ============================================================
# Stage 2: Create the production runtime image
# ============================================================

# Start from a clean Node.js image
# This keeps build tools and development dependencies out of the final image, reducing its size and attack surface
FROM node:22-bookworm-slim AS production

# Set the working directory inside the container
WORKDIR /app

# Set the NODE_ENV environment variable to 'production' to optimize the application for production use
ENV NODE_ENV=production

# Copy only the package.json and package-lock.json files to the working directory
# This allows us to install only production dependencies in the next step
COPY package.json package-lock.json ./

# Install only production dependencies, excluding devDependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy only the compiled application and necessary files from the builder stage
# The Typescript source code and development dependencies are not included in the final image
COPY --from=builder /app/dist ./dist

# Run the application as the non-root user 'node' for better security
USER node

# Document that the NestJS application listens on port 3000

EXPOSE 3000

# Start the compiled NestJS application using Node.js
CMD ["node", "dist/main.js"]