FROM node:18-slim

WORKDIR /app

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
