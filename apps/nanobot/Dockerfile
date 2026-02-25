FROM python:3.11-slim

WORKDIR /app

# System deps for websockets, build tools, and curl (healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY apps/nanobot/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy nanobot source
COPY apps/nanobot/server.py .

# Copy bridge source (for uploading to Daytona sandboxes)
COPY apps/nanobot/bridge/ ./bridge/

# Copy MCP server scripts (PPPoker bridge)
RUN mkdir -p ./mcp
COPY Ppfichas/pppoker_mcp.py ./mcp/pppoker_mcp.py
COPY Ppfichas/pppoker_direct_api.py ./mcp/pppoker_direct_api.py

# Create nanobot workspace and config directories
RUN mkdir -p /root/.nanobot/workspace /root/.nanobot/cron

# Copy production config (API keys overridden via volume or env at runtime)
COPY apps/nanobot/config.prod.json /root/.nanobot/config.json

ENV TZ=UTC
ENV PYTHONUNBUFFERED=1

EXPOSE 18790
ENV PORT=18790

CMD ["python", "server.py"]
