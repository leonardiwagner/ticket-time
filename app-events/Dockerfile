FROM node:22-bookworm-slim
WORKDIR /workspace/app-events
COPY app-events/package*.json ./
RUN npm ci
COPY contracts /workspace/contracts
COPY app-events/ .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 50051 8081
CMD ["node", "--enable-source-maps", "dist/main.js"]
