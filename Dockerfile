# Stage 1: Build
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy dependency files first
COPY package.json bun.lock* package-lock.json* ./
COPY src/shared/package.json ./src/shared/package.json

# Install dependencies
RUN bun install && mkdir -p node_modules/react-devtools-core && echo 'export default {};' > node_modules/react-devtools-core/index.js

# Copy source code and assets
COPY . .

# Compile the application for Linux
# --minify: smaller binary
# --compile: standalone executable
# Note: --windows-icon is only relevant for Windows targets
RUN bun build src/app.tsx --compile --minify --outfile pos-linux

# Stage 2: Runtime
FROM oven/bun:latest

# We still use /app for data (db, config)
WORKDIR /app

# Copy the compiled binary to a system path to avoid being shadowed by volumes
COPY --from=builder /app/pos-linux /usr/local/bin/pos

# Copy necessary assets and config
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/config.json* ./

# Support for SQLite persistence
# The pos.db will still be used/created in the working directory (/app)

# Set environment variables for terminal interaction
ENV TERM=xterm-256color
ENV NODE_ENV=production

# Now we run 'pos' from the system path
ENTRYPOINT ["pos"]
