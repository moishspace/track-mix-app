FROM node:16

# Install nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Use bash shell for subsequent commands (to enable nvm)
SHELL ["/bin/bash", "-c"]

# Use Node.js 23
RUN . ~/.nvm/nvm.sh && nvm install 23 && nvm use 23

# Set working directory
WORKDIR /track-mix-app/server

# Copy package.json and package-lock.json
COPY ./server/package*.json ./

# Install dependencies
RUN . ~/.nvm/nvm.sh && nvm use 23 && npm install

# Copy the rest of the server application
COPY ./server ./

# Expose the server port
EXPOSE 3001

# Start the server
CMD ["/bin/bash", "-c", ". ~/.nvm/nvm.sh && nvm use 23 && npm run dev"]