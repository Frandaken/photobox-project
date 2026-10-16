FROM node:20-alpine
WORKDIR /app

# smbclient needed for SMB/NAS storage operations
RUN apk add --no-cache samba-client

COPY backend/package*.json ./
RUN npm install

COPY backend/ .

EXPOSE 3000
CMD ["npm", "start"]
