# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install OS dependencies
RUN apt-get update && apt-get install -y build-essential python3-dev

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the app
COPY . .

# Ensure __init__.py exists
RUN touch app/__init__.py

# Expose the FastAPI port
EXPOSE 8001

# Run the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
