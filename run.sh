#!/bin/bash
set -e

# echo -n "Target SSH Server: "; read targetSshServer
# echo -n "Target SSH Server Username: "; read targetSshUsername
# echo -n "Path on target SSH Server: "; read targetSshPath

targetPath="./work"

mkdir -pv "${targetPath}/archive"

. ./enable-nvm.sh

npm ci

while true
do
  touch tmp.html
  touch tmp.json
  currentDateTime=$(date)
  currentDateTimeFormated=$(date +%Y-%m-%d_%H%M.%S)

  echo "$currentDateTime"
  node index.js $*

  mv tmp.html "${targetPath}/archive/${currentDateTimeFormated}.html"
  # mv tmp.json "${targetPath}/archive/${currentDateTimeFormated}.json"
  pushd "$targetPath"
  # ln -sf "archive/${currentDateTimeFormated}.json" index.json
  ln -sf "archive/${currentDateTimeFormated}.html" index.html
  popd

  rsync --links --progress --no-p --no-g -r "${targetPath}/index.html" "${targetPath}/index.json" "${targetPath}/archive" "${targetSshUsername}@${targetSshServer}:${targetSshPath}"
done
