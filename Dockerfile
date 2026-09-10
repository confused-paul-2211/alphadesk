# ---- Stage 1: build the React frontend --------------------------------
FROM node:20-alpine AS webbuild
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python API, serving the built frontend -------------------
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=webbuild /web/dist ./static

# Render injects PORT at runtime; Hugging Face Spaces expects 7860.
# The shell-form CMD honours both.
EXPOSE 7860
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
