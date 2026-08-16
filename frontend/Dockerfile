# build stage
FROM node:18-alpine as build

WORKDIR /app

COPY v2/package.json v2/package-lock.json* ./
RUN npm install

COPY v2/ .
RUN npm run build

# production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
