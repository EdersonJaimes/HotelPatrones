# Etapa 1: compilar el frontend con Vite.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# VITE_API_URL se incrusta al compilar: es la URL del gateway tal como la ve el NAVEGADOR.
ARG VITE_API_URL=http://127.0.0.1:3000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: servir los estáticos con nginx.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
