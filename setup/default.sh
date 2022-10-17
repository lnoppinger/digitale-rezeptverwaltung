#!/bin/bash

# functions

input() {
    NAME=$1
    DESCRIPTION=$2
    DEFAULT=$3

    read -p "$DESCRIPTION ($DEFAULT): " RESULT
    RESULT=${RESULT:-$DEFAULT}

    echo "$NAME=$RESULT" >> $FILE
}

random() {
    NAME=$1

    echo "Creating random string ..."
    RANDOM64=$(openssl rand -base64 70 | tr -d "=\\ \n" | cut -c1-64)

    echo "$NAME=$RANDOM64" >> $FILE
}

space() {
    echo "" >> $FILE
}

# Start

FILE_DEFAULT="./.env"
FILE=$1
FILE=${FILE:-$FILE_DEFAULT}

if [ ! -f "$FILE" ]; 
    then
        echo "" > $FILE
fi

clear
echo "Current config: "
echo "$(cat $FILE)"
echo ""

read -p "Do you want to update the .env file? (y/n): " -n 1 -t 5
if [[ ! $REPLY =~ ^[Yy]$ ]] 
    then
        echo -e "\nFinishing setup process ..."
        exit 0
fi

clear
echo "Starting setup process ..."

echo "" > $FILE

### Questions \/ ###

input "BASE_URL" "The URL of the application with protocoll and port" "http://localhost:3000"
space
random "COOKIE_SECRET"

### Questions /\ ###

echo "Finished setup process."
