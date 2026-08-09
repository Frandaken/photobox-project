FROM node:20-alpine

# smbclient dibutuhkan oleh library samba-client untuk komunikasi SMB
RUN apk add --no-cache samba-client

WORKDIR /app

# Path di-prefix "backend/" karena build context adalah ROOT REPO
# (dipakai saat context: URL Git, yang selalu clone keseluruhan repo,
# bukan hanya subfolder backend/ ini).
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ .

EXPOSE 3001
CMD ["node", "server.js"]
