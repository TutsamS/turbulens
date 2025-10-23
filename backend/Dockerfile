# Node.js and npm pre-installed
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json 
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port 5001
EXPOSE 5001

# Set environment variable
ENV NODE_ENV=development

# Define the command to run the application
CMD ["npm", "start"]
