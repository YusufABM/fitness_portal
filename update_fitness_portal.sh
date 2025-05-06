#!/bin/bash

# Stop the existing container
sudo docker stop fitness_portal_container

# Remove the stopped container
sudo docker rm fitness_portal_container

# Build the new image
sudo docker build -t fitness_portal .

# Run the container with the new image
sudo docker run -d --restart unless-stopped --name fitness_portal_container -p 2095:2095 fitness_portal
