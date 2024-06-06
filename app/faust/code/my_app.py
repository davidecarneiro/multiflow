import faust
import pandas as pd
from sklearn.svm import OneClassSVM
import joblib
from datetime import datetime
from io import StringIO
import json
import pymongo
import os
from sklearn.metrics import precision_score, recall_score, f1_score
import mlflow
import mlflow.sklearn

app = faust.App(
    'my_app',
    broker='kafka_server://localhost:9092',
    value_serializer='json',  # Use 'json' serializer for JSON data
)

# Define the Kafka topic you want to consume from
kafka_topic = 'phd_kafka'  # Replace with your Kafka topic name

# Create the Kafka topic with a specified name
kafka_topic = app.topic(kafka_topic, value_type=bytes)

# List to accumulate CSV rows
csv_buffer = []

# Maximum buffer size before processing
MAX_BUFFER_SIZE = 100

# Directory where you want to save the model
MODEL_DIR = '/app/models'

# Function to save the DataFrame and model in MongoDB and the file system
def save_records_and_model(records, model):
    try:
        # MongoDB client configuration
        client = pymongo.MongoClient("mongodb://mongodb_server:27017/")

        # Database and collection where you want to save data associated with each model
        db = client["phd_kafka"]
        model_collection = db["phd_kafka_models"]
        data_collection = db["phd_kafka_data"]

        # Generate a unique name for the model based on the timestamp
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        model_name = f'oneclass_svm_model_{timestamp}.joblib'

        # Save the model to the file system with the unique name
        model_path = os.path.join(MODEL_DIR, model_name)
        joblib.dump(model, model_path)
        print(f"The model was saved at {model_path}")

        # Insert the model into the models collection and get the ID
        model_document = {
            "timestamp": datetime.now(),
            "model_path": model_path,
            "model_details": model.get_params()  # Add other model details if necessary
        }
        model_result = model_collection.insert_one(model_document)
        model_id = model_result.inserted_id

        # Associate each record with the model ID
        for record in records:
            record["model_id"] = model_id

        # Insert the records associated with the model into the data collection
        data_collection.insert_many(records)

        print("Data was associated with the model and successfully stored in MongoDB.")

        return model_id, model_name  # Return the model ID and file name

    except Exception as e:
        print(f"Error storing records and the model: {str(e)}")
        return None, None

# Function to process 100 CSV lines and train the model
def process_and_train(csv_lines):
    try:
        # Replace commas with periods in the strings
        csv_lines = [line.replace(',', '.') for line in csv_lines]

        # Create a DataFrame with CSV lines and specify columns manually
        df = pd.read_csv(StringIO("\n".join(csv_lines)), delimiter=';', names=['Injection Time', 'Plasticization Time', 'Cycle Time', 'Pad', 'Maximum Pressure', 'Quality'])

        # Map the "Quality" column to numerical values
        quality_mapping = {
            'OK': 0,
            'NOK (Burr)': 1,
            'NOK (Filling)': 2
        }
        df['Quality'] = df['Quality'].map(quality_mapping)

        # Remove the "Quality" column from attributes
        X = df.drop(columns=['Quality'])

        # Train the One-Class SVM model
        model = OneClassSVM()
        model.fit(X)

        return model, df  # Return the model and DataFrame

    except Exception as e:
        print(f"Error processing and training the model: {str(e)}")
        return None, None  # In case of error, return None for both outputs

# Function to calculate model metrics and save them in MongoDB and MLflow
def save_metrics(model_id, model, features, records):
    try:
        # MongoDB client configuration
        client = pymongo.MongoClient("mongodb://mongodb_server:27017/")

        # Database and collection where you want to save model metrics
        db = client["phd_kafka"]
        metrics_collection = db["phd_kafka_model_metrics"]

        # Calculate model metrics
        y_true = [1] * len(features)  # Assume all examples are anomalies
        y_pred = model.predict(features)

        precision = precision_score(y_true, y_pred)
        recall = recall_score(y_true, y_pred)
        f1 = f1_score(y_true, y_pred)

        # Create a dictionary with the metrics
        metrics = {
            "model_id": str(model_id),
            "timestamp": datetime.now(),
            "precision": precision,
            "recall": recall,
            "f1": f1,
            # Add other metrics if necessary
        }

        # Insert model metrics into MongoDB
        metrics_collection.insert_one(metrics)

        print("Model metrics were successfully stored in MongoDB.")

        return precision, recall, f1, features  # Return precision, recall, and f1 scores

    except Exception as e:
        print(f"Error storing model metrics: {str(e)}")

@app.agent(kafka_topic)
async def process_kafka_data(stream):
    async for message in stream:
        try:
            # Get the "csv_data" field from the Kafka message
            csv_data = message.get("csv_data")

            # Add the CSV row to the buffer
            csv_buffer.append(csv_data)

            # Check if the buffer has reached the maximum size
            if len(csv_buffer) >= MAX_BUFFER_SIZE:
                # Process the buffer and train the model
                model, records = process_and_train(csv_buffer)

                # Clear the buffer after processing
                csv_buffer.clear()

                if model and not records.empty:
                    # Save the records associated with the model in MongoDB and the file system
                    model_id, model_name = save_records_and_model(records.to_dict(orient='records'), model)

                    # Calculate model metrics and save them in MongoDB and MLflow
                    precision, recall, f1, features = save_metrics(model_id, model, records.drop(columns=['Quality']), records)

                    # Initialize MLflow
                    mlflow.set_tracking_uri('http://mlflow_server:5000')
                    
                    # Initialize the MLflow run to log metrics and the model
                    with mlflow.start_run() as run:
                        mlflow.sklearn.log_model(model, "model")

                        # Log metrics in MLflow
                        mlflow.log_metric("precision", precision)
                        mlflow.log_metric("recall", recall)
                        mlflow.log_metric("f1", f1)

                        # Log other information if necessary
                        mlflow.log_param("num_samples", len(features))
                        mlflow.log_params(model.get_params())  # Log model parameters
                        #print(features)

        except Exception as e:
            print(f"Error processing the message: {str(e)}")

if __name__ == '__main__':
    app.main()
