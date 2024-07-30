import faust
import os

# Command line example: Par1=aaaaa Par2=bbbbb Par3=ccccc faust -A my_app2 worker -l info
name = os.getenv('Name', 'my_app2')
portx = os.getenv('Port', '6066')
par4 = os.getenv('CField', 'default_value4')
topic = os.getenv('StreamTopic', 'dataset')

# Create a Faust application
app = faust.App(name, broker='kafka_server://localhost:9092', web_port=int(portx))

# Define a Kafka topic
topic = app.topic(topic)

# Read environment variables
par1 = os.getenv('Par1', 'default_value1')
par2 = os.getenv('Par2', 'default_value2')

@app.agent(topic)
async def example_agent(stream):
    async for event in stream:
        message = (
            f'Par1 is: {par1}\n'
            f'Par2 is: {par2}\n'
            f'Topic is: {topic}\n'
            f'Name is: {name}\n'
            f'Par4 is: {par4}\n'
            f'Port is: {portx}\n'
            f'Received event: {event}\n'
        )
        print(message)
        
        # Write the message to a file
        with open('received_events.txt', 'a') as file:
            file.write(message)

if __name__ == '__main__':
    app.main()
