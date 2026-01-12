FROM oven/bun:1.2.22

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN bun install

# Expose port
EXPOSE 8080

# Start the API
CMD ["bun", "run", "--filter=@midpoker/api", "dev"]
