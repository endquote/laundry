#!/bin/sh

# A script to run the laundry tick command on an interval.

# Configure S3 or local storage.
export LAUNDRY_S3_KEY=xyz
export LAUNDRY_S3_SECRET=xyz
export LAUNDRY_S3_BUCKET=xyz
#export LAUNDRY_LOCAL=xyz
#export LAUNDRY_BASEURL=xyz

# Create a lock file to prevent multiple copies of laundry from running at once.
PIDFILE=/tmp/`basename $0`.pid
if [ -f $PIDFILE ]; then
  if ps -p `cat $PIDFILE` > /dev/null 2>&1; then
      echo "$0 already running!"
      exit
  fi
fi
echo $$ > $PIDFILE
trap 'rm -f "$PIDFILE" >/dev/null 2>&1' EXIT HUP KILL INT QUIT TERM

# Edit this line to include the proper locations of node and laundry.
# "which node" and "which laundry" will help.
/usr/local/bin/node /usr/local/lib/node_modules/laundry/index.js -v tick
