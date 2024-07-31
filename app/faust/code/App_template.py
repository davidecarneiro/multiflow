import faust
import os

# Fetch required fields from environment variables. 
# These fields are mandatory and should be provided by the instance.
InstanceName = os.getenv('Name', 'InstanceName')  # Name of the instance, defaults to 'InstanceName'
InstancePort = os.getenv('Port', '6066')  # Port number for the instance, defaults to 6066

# Fetch custom parameters from environment variables.
# These can be customized as needed by setting the appropriate environment variables.
StreamTopic = os.getenv('StreamTopic', 'phd_kafka')  # Kafka topic to listen to, defaults to 'phd_kafka'
Parameter1 = os.getenv('Parameter1', 'default_value_1')  # Custom parameter 1, defaults to 'default_value_1'
Parameter2 = os.getenv('Parameter2', 'default_value_2')  # Custom parameter 2, defaults to 'default_value_2'
Parameter3 = os.getenv('Parameter3', 'default_value_3')  # Custom parameter 3, defaults to 'default_value_3'

# Create a Faust application with the specified instance name and Kafka broker.
# The web server will listen on the port provided by the InstancePort variable.
app = faust.App(
    InstanceName, 
    broker='kafka_server://localhost:9092',  # Address of the Kafka broker
    web_port=int(InstancePort)  # Port for the web server
)

# Define a Kafka topic to which this Faust app will subscribe.
topic = app.topic(StreamTopic)

# Define an agent to process messages from the Kafka topic.
@app.agent(topic)
async def example_agent(stream):
    async for event in stream:  # Asynchronously process each event in the stream
        message = (
            f'Instance "{InstanceName}" is running on Port {InstancePort}\n'
            f'Stream topic is: {StreamTopic}\n'
            f'Parameter 1 is: {Parameter1}\n'
            f'Parameter 2 is: {Parameter2}\n'
            f'Parameter 3 is: {Parameter3}\n'
            f'Received event: {event}\n'
        )
        print(message)  # Print the message to the console
        
        # Writing the message to a file
        try:
            with open('received_events.txt', 'a') as file:
                file.write(message)
        except Exception as e:
            print(f"Failed to write to file: {e}")  # Handling file writing errors

# Entry point for the application
if __name__ == '__main__':
    app.main()  # Start the Faust application