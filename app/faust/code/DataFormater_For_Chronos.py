import faust
import os
import pandas as pd
from datetime import datetime, timedelta

# Fetching required environment variables
InstanceName = os.getenv('Name', 'InstanceName')
InstancePort = os.getenv('Port', '6066')
StreamTopic = os.getenv('StreamTopic', 'phd_kafka')
OutputFileName = os.getenv('OutputFileName', 'timeseries_data')

# Setting up Faust app
app = faust.App(InstanceName, broker='kafka_server://localhost:9092', web_port=int(InstancePort))
topic = app.topic(StreamTopic)

# Global variables
received_data = pd.DataFrame()
start_time = datetime.now()  # Snapshot of the current time
global_row_count = 0  # Counter for total rows processed globally

# Function to process and convert data into time-series format
def process_to_timeseries(dataframe, start_row_index):
    timeseries_data = []

    # Generate timestamps by incrementing 1 minute for each row in each column
    for idx, row in dataframe.iterrows():
        for col in dataframe.columns:
            # Calculate the timestamp and format it to exclude milliseconds
            timestamp = (start_time + timedelta(minutes=start_row_index + len(timeseries_data))).strftime('%Y-%m-%d %H:%M:%S')
            timeseries_data.append({
                "item_id": col,
                "timestamp": timestamp,  # Use the formatted timestamp
                "target": row[col]
            })

    # Convert the list of dictionaries into a DataFrame
    timeseries_df = pd.DataFrame(timeseries_data)
    
    return timeseries_df

# Faust agent to process messages and format data
@app.agent(topic)
async def timeseries_processing_agent(stream):
    global received_data, start_time, global_row_count
    async for event in stream:
        # Parsing the incoming event to create a DataFrame row
        csv_data = event.get('csv_data', '')
        try:
            # Split the CSV data into individual values
            row_values = list(map(float, csv_data.split(',')))
            num_columns = len(row_values)
            column_names = [f'col{i+1}' for i in range(num_columns)]
            row_df = pd.DataFrame([row_values], columns=column_names)
        except ValueError:
            print(f"Error: Skipping event due to parsing error: {csv_data}")
            continue

        # Accumulate received data
        received_data = pd.concat([received_data, row_df], ignore_index=True)
        global_row_count += 1

        # Log the number of rows received every 50 rows
        if global_row_count % 100 == 0:
            print(f"Total rows received so far: {global_row_count}")

        # Process accumulated data into time-series format when sufficient data is available
        if len(received_data) >= 100:  # Example threshold for processing
            timeseries_data = process_to_timeseries(received_data, global_row_count - len(received_data))

            # Log relevant information
            print(f"Processed {len(timeseries_data)} rows of time-series data.")

            # Export to CSV
            timeseries_data.to_csv(
                f"{OutputFileName}.csv",
                mode='a',
                header=not os.path.exists(f"{OutputFileName}.csv"),
                index=False
            )
            print(f"Time-series data saved to {OutputFileName}.csv")

            # Reset accumulated data after processing
            received_data = pd.DataFrame()

# Entry point for the application
if __name__ == '__main__':
    app.main()