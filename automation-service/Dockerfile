FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install libatomic1 (required by Playwright's node driver on debian-slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libatomic1 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY automation-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install --with-deps chromium

# Copy existing codebase components
COPY bots/ /app/bots/
COPY core/ /app/core/
COPY automation-service/ /app/automation-service/

RUN mkdir -p /app/profile /app/uploads /app/logs

EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "automation-service.app:app", "--host", "0.0.0.0", "--port", "8000"]
