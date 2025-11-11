FROM node:16

# Install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Use bash shell for subsequent commands (to enable nvm)
SHELL ["/bin/bash", "-c"]

# Use Node.js 23
RUN . ~/.nvm/nvm.sh && nvm install 23 && nvm use 23

# Set working directory
WORKDIR /track-mix-app/client

# Copy package.json and package-lock.json
COPY ./client/package*.json ./

# Install dependencies
RUN . ~/.nvm/nvm.sh && nvm use 23 && npm install

# Copy the rest of the client application
COPY ./client ./

# Build the React app
RUN . ~/.nvm/nvm.sh && nvm use 23 && npm run build

# Install serve globally to serve the build folder
RUN . ~/.nvm/nvm.sh && nvm use 23 && npm install -g serve

# Expose the client port
EXPOSE 8000

# Start the React app
CMD ["/bin/bash", "-c", ". ~/.nvm/nvm.sh && nvm use 23 && serve -s build -l 8000"]