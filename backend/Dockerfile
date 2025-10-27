FROM python:3.13-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application code
COPY . backend/

# Expose port
EXPOSE 8080

# Set Python path to include the app directory
ENV PYTHONPATH=/app

# Run the application
CMD ["uvicorn", "backend.api_server:app", "--host", "0.0.0.0", "--port", "8080"]