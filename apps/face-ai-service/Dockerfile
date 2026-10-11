FROM python:3.11-slim
WORKDIR /app
COPY apps/face-ai-service/ ./
RUN pip install --no-cache-dir fastapi uvicorn insightface onnxruntime pillow numpy 2>/dev/null || pip install --no-cache-dir fastapi uvicorn
EXPOSE 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
