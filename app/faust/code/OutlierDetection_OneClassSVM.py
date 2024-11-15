import faust
import os
import pandas as pd
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# Fetching environment variables
InstanceName = os.getenv('Name', 'InstanceName')
InstancePort = os.getenv('Port', '6066')
StreamTopic = os.getenv('StreamTopic', 'phd_kafka')
initial_block_size = int(os.getenv('InitialBlockSize', '100'))
update_interval = int(os.getenv('UpdateInterval', '25'))
OutputFileName = os.getenv('OutputFileName', 'Received-Events')

# InfluxDB configuration
CollectionName = os.getenv('CollectionName', 'outlier_detection')
influxdb_url = os.getenv('INFLUXDB_URL', 'http://influxdb_server:8086')
influxdb_token = os.getenv('INFLUXDB_TOKEN', 'admin')
influxdb_org = os.getenv('INFLUXDB_ORG', 'multiflow')
influxdb_bucket = os.getenv('INFLUXDB_BUCKET', 'faust_app')

# Faust and InfluxDB client initialization
app = faust.App(InstanceName, broker='kafka_server://localhost:9092', web_port=int(InstancePort))
topic = app.topic(StreamTopic)
influx_client = InfluxDBClient(url=influxdb_url, token=influxdb_token, org=influxdb_org)
write_api = influx_client.write_api(write_options=SYNCHRONOUS)

# Global data storage and model variables
received_data = pd.DataFrame()
scaler = None
one_class_svm_model = None

# Function to train or update One-Class SVM model
def train_one_class_svm(data):
    global scaler
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(data)
    model = OneClassSVM(gamma='auto', kernel='rbf', nu=0.05)
    model.fit(scaled_data)
    return model

# Function to detect anomalies with One-Class SVM
def detect_anomaly(model, data):
    scaled_data = scaler.transform(data) if scaler else data
    predictions = model.predict(scaled_data)
    return predictions

# Function to send data to InfluxDB
def send_to_influxdb(row_df, CollectionName):
    for _, row in row_df.iterrows():
        point = Point(CollectionName).tag("outliers", row['outliers'])
        for column in row.index:
            if column != 'outliers':
                point = point.field(column, float(row[column]))
        write_api.write(bucket=influxdb_bucket, record=point)
        print(f"Data point written to InfluxDB: {row.to_dict()}")

# Faust agent to process messages from the Kafka topic
@app.agent(topic)
async def outlier_detection_agent(stream):
    global received_data, one_class_svm_model, scaler

    row_count = 0
    numeric_columns = None

    async for event in stream:
        # Parsing the incoming event to create a DataFrame row
        csv_data = event.get('csv_data', '')
        try:
            row_values = list(map(float, csv_data.split(',')))
            num_columns = len(row_values)
            column_names = [f'col{i+1}' for i in range(num_columns)]
            row_df = pd.DataFrame([row_values], columns=column_names)
            print("Parsed DataFrame row:", row_df)
        except ValueError:
            print(f"Skipping event due to parsing error: {csv_data}")
            continue

        # Initializing columns and trainning initial One-Class SVM model
        if numeric_columns is None:
            numeric_columns = row_df.select_dtypes(include='number').columns.tolist()
            initial_data = pd.concat([received_data, row_df]).head(initial_block_size)
            one_class_svm_model = train_one_class_svm(initial_data[numeric_columns])
            print(f"Initial One-Class SVM model trained on the first {initial_block_size} rows.")

        # Detecting anomalies
        current_data = pd.DataFrame(row_df[numeric_columns].values.reshape(1, -1), columns=numeric_columns)
        predictions = detect_anomaly(one_class_svm_model, current_data)
        
        # Assigning 'outliers' label based on predictions (-1 for outliers)
        row_df['outliers'] = 'yes' if predictions[0] == -1 else 'no'
        
        # Adding the row to received data and update the row count
        received_data = pd.concat([received_data, row_df], ignore_index=True)
        row_count += 1

        # Sending data to InfluxDB
        send_to_influxdb(row_df, CollectionName=CollectionName)

        # Periodically updating the model every `update_interval` rows
        if row_count % update_interval == 0:
            recent_data = received_data.iloc[-initial_block_size:]
            one_class_svm_model = train_one_class_svm(recent_data[numeric_columns])
            print(f"One-Class SVM model updated after {row_count} rows.")

        # Saving to CSV in batches of 100 rows
        if row_count % 100 == 0:
            received_data.to_csv(f"{OutputFileName}.csv", index=False)
            print("CSV file updated with latest events.")

# Entry point for the application
if __name__ == '__main__':
    app.main()