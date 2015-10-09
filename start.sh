#!/bin/sh
for (( i=1500; i <= 3000; i+=200 ))
do
    echo "NODE_ENV=production node index.js --pages=100 --fromOffset=$i --browserNum=2 | tee r$i.log"
    NODE_ENV=production node index.js --pages=100 --fromOffset=$i --browserNum=2 | tee r$i.log
done
