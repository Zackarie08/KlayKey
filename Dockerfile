FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY keyboard-3d/package.json keyboard-3d/package-lock.json ./keyboard-3d/
RUN npm ci --prefix keyboard-3d --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/keyboard-3d/node_modules ./keyboard-3d/node_modules
COPY package.json package-lock.json ./
COPY server ./server
COPY public ./public
COPY keyboard-3d/viewer ./keyboard-3d/viewer
COPY keyboard-3d/config ./keyboard-3d/config
COPY keyboard-3d/exports/*.glb keyboard-3d/exports/*.json ./keyboard-3d/exports/
COPY keyboard-3d/previews ./keyboard-3d/previews
USER node
CMD ["npm", "start"]
