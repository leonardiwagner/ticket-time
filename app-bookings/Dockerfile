FROM node:22-bookworm-slim
WORKDIR /workspace/app-bookings
COPY app-bookings/package*.json ./
RUN npm ci
COPY contracts /workspace/contracts
COPY app-bookings/ .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 50052 8082
CMD ["node", "--enable-source-maps", "dist/main.js"]
