# Use Node.js 16 for development server
FROM node:16

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the development server
CMD ["npm", "start"]