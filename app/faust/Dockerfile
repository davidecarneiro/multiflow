#######
# Use a base Python image
#######FROM python:3.8

# Update the system and install necessary libraries
#######RUN apt-get update && apt-get install -y librdkafka-dev

# Install MLflow
#######RUN pip install mlflow

# Install other necessary libraries
#######RUN pip install scikit-learn
#######RUN pip install confluent-kafka
#######RUN pip install pymongo
#######RUN pip install pandas
#######RUN pip install joblib
#######RUN pip install faust

# Expose the ports (if necessary)
#######EXPOSE 8080
#######EXPOSE 9092
#######EXPOSE 2181
#######EXPOSE 19000
#######EXPOSE 9000
#######EXPOSE 27017
#######EXPOSE 5000

# Command to run your application (replace with your command)
#######CMD ["tail", "-f", "/dev/null"]

###################################

# Use a base Python image
FROM python:3.8

# Update the system and install necessary libraries
RUN apt-get update && apt-get install -y librdkafka-dev

# Install MLflow
RUN pip install mlflow

# Install other necessary libraries
RUN pip install scikit-learn
RUN pip install confluent-kafka
RUN pip install pymongo
RUN pip install pandas
RUN pip install joblib
RUN pip install faust
RUN pip install flask
RUN pip install flask-cors

#######
# Set the working directory
WORKDIR /server

# Copy the application code to the container
COPY . /server
######

# Expose the ports (if necessary)
EXPOSE 8080
EXPOSE 9092
EXPOSE 2181
EXPOSE 19000
EXPOSE 9000
EXPOSE 27017
EXPOSE 5000
EXPOSE 5010

# Command to run your application (replace with your command)
#CMD ["tail", "-f", "/dev/null"]

# Set environment variable for Flask
ENV FLASK_APP=server.py

# Command to run your application
CMD ["flask", "run", "--port=5010", "--host=0.0.0.0"]
