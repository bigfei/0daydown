#!/bin/sh
for (( i=1500; i <= 3000; i+=200 ))
do
    echo "NODE_ENV=production node index.js --pages=200 --fromOffset=$i --browserNum=2"
    NODE_ENV=production node index.js --pages=200 --fromOffset=$i --browserNum=2
done
