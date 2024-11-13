import faust
import os
import pandas as pd
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# Fetch required fields from environment variables
InstanceName = os.getenv('Name', 'InstanceName')
InstancePort = os.getenv('Port', '6066')
StreamTopic = os.getenv('StreamTopic', 'phd_kafka')
initial_block_size = int(os.getenv('InitialBlockSize', '100'))
update_interval = int(os.getenv('UpdateInterval', '25'))
OutputFileName = os.getenv('OutputFileName', 'Received-Events')

# InfluxDB configurations from environment variables
CollectionName = os.getenv('CollectionName', 'outlier_detection')
influxdb_url = os.getenv('INFLUXDB_URL', 'http://influxdb_server:8086')
influxdb_token = os.getenv('INFLUXDB_TOKEN', 'admin')
influxdb_org = os.getenv('INFLUXDB_ORG', 'multiflow')
influxdb_bucket = os.getenv('INFLUXDB_BUCKET', 'faust_app')

# Initializing Faust application with the specified instance name and Kafka broker
app = faust.App(
    InstanceName, 
    broker='kafka_server://localhost:9092',  
    web_port=int(InstancePort)
)

# Defining a Kafka topic to which this Faust app will subscribe
topic = app.topic(StreamTopic)

# Initializing DataFrame to store received events
received_data = pd.DataFrame()

# Setting up InfluxDB client
influx_client = InfluxDBClient(url=influxdb_url, token=influxdb_token, org=influxdb_org)
write_api = influx_client.write_api(write_options=SYNCHRONOUS)

# Function to calculate IQR thresholds for outlier detection
def calculate_iqr_thresholds(data):
    Q1 = data.quantile(0.25)
    Q3 = data.quantile(0.75)
    IQR = Q3 - Q1
    lower_threshold = Q1 - 1.5 * IQR
    upper_threshold = Q3 + 1.5 * IQR
    return lower_threshold, upper_threshold

# Function to update IQR thresholds dynamically for numeric columns in any dataset
def update_iqr_thresholds(dataframe, numeric_columns):
    thresholds = {}
    for column in numeric_columns:
        lower_threshold, upper_threshold = calculate_iqr_thresholds(dataframe[column])
        thresholds[column] = (lower_threshold, upper_threshold)
    return thresholds

# Function to send data to InfluxDB
def send_to_influxdb(row_df, CollectionName):
    for _, row in row_df.iterrows():
        point = Point(CollectionName) \
            .tag("outliers", row['outliers'])  # Tags for quick filtering
        for column in row.index:
            if column != 'outliers':
                point = point.field(column, float(row[column]))
        write_api.write(bucket=influxdb_bucket, record=point)
        print(f"Data point written to InfluxDB: {row.to_dict()}")

# Defining an agent to process messages from the Kafka topic
@app.agent(topic)
async def outlier_detection_agent(stream):
    global received_data

    row_count = 0
    numeric_columns = None
    thresholds = {}

    async for event in stream:
        # Parsing incoming event data to create a DataFrame row
        csv_data = event.get('csv_data', '')
        
        # Spliting the csv_data string by commas to count columns and convert to floats
        try:
            row_values = list(map(float, csv_data.split(',')))
            
            # Determining the number of columns
            num_columns = len(row_values)
            column_names = [f'col{i+1}' for i in range(num_columns)]
            
            # Creating DataFrame with dynamic column names
            row_df = pd.DataFrame([row_values], columns=column_names)
            print("Parsed DataFrame row:", row_df)
        except ValueError:
            print(f"Skipping event due to parsing error: {csv_data}")
            continue

        # Initializing numeric columns and setting IQR thresholds on the first row
        if numeric_columns is None:
            numeric_columns = row_df.select_dtypes(include='number').columns.tolist()
            thresholds = update_iqr_thresholds(pd.concat([received_data, row_df]).head(initial_block_size), numeric_columns)
            print(f"Initial IQR thresholds set for numeric columns: {thresholds}")

        ### Checking for outliers
        is_outlier = False
        for column in numeric_columns:
            lower_threshold, upper_threshold = thresholds[column]
            value = row_df[column].iloc[0]
            if value < lower_threshold or value > upper_threshold:
                is_outlier = True
                print(f"Outlier detected in {column}: Value={value}  (Thresholds=({lower_threshold}, {upper_threshold}))")
                break

        # Labeling the row and adding it to received_data
        row_df['outliers'] = 'yes' if is_outlier else 'no'
        received_data = pd.concat([received_data, row_df], ignore_index=True)
        row_count += 1

        # Sending data to InfluxDB with collection name
        send_to_influxdb(row_df, CollectionName=CollectionName)

        # Updating thresholds every `update_interval` rows
        if row_count % update_interval == 0:
            thresholds = update_iqr_thresholds(received_data.iloc[:row_count], numeric_columns)
            print(f"Updated IQR thresholds after {row_count} rows: {thresholds}")

        # Saving to CSV in batches of 100 rows
        if row_count % 100 == 0:
            received_data.to_csv(str(OutputFileName) + ".csv", index=False)
            print("CSV file updated with latest events.")

# Entry point for the application
if __name__ == '__main__':
    app.main()