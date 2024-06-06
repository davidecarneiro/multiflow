# Use the Python image as the base image
FROM python:3.8

# Copy the API code into the Docker image
COPY . /app

# Set the working directory to /app
WORKDIR /app

# Install Flask and pymongo dependencies
RUN pip install flask pymongo

# Expose port 8081 for the Flask application
EXPOSE 8081

# Command to start the Flask application
#CMD ["python", "app.py"]
#CMD ["flask", "run", "--host=0.0.0.0", "--port=8081", "create_app"]
