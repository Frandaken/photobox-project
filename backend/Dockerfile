# ---- Stage 1: build project React (Vite) ----
FROM node:20-alpine AS build
WORKDIR /app

# Path di-prefix "frontend/" karena build context adalah ROOT REPO
# (dipakai saat context: URL Git, yang selalu clone keseluruhan repo,
# bukan hanya subfolder frontend/ ini).
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# ---- Stage 2: serve hasil build pakai nginx ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
