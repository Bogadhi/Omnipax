# ---- Base Stage ----
FROM node:20-alpine

WORKDIR /app

# Install system deps
RUN apk add --no-cache openssl libc6-compat

# Copy backend package files
COPY backend/package*.json ./

# Copy shared package
COPY shared ./shared

# Install dependencies
RUN npm install

# Copy backend source
COPY backend .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS
RUN npm run build

# Expose port
EXPOSE 5001

# Start production server
CMD ["npm", "run", "start:prod"]