FROM node:20-alpine

# smbclient dibutuhkan oleh library samba-client untuk komunikasi SMB
RUN apk add --no-cache samba-client

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

EXPOSE 3001
CMD ["node", "server.js"]
