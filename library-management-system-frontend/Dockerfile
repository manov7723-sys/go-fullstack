FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Unprivileged nginx: uid 101, listens on 8080, writable paths under /tmp.
# Stock nginx here would need root for :80 and /var/cache/nginx and exits
# [emerg] under the manifest's runAsNonRoot + readOnlyRootFilesystem.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Already the image's default; stated so the manifest's runAsUser has
# something to agree with and the review rules can see it.
USER 101
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
