# ---- Stage 1: build project React (Vite) ----
FROM node:20-alpine AS build
WORKDIR /app

# Copy manifest dulu biar layer cache npm install lebih efisien
COPY package*.json ./
RUN npm install

# Copy sisa source code lalu build jadi folder dist/ statis
COPY . .
RUN npm run build

# ---- Stage 2: serve hasil build pakai nginx ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
