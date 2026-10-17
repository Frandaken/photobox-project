FROM node:20-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ .

EXPOSE 5795 3000
CMD ["npm", "start"]
