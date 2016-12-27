#!/bin/bash

targetPath="$1";
nodeExecutable=$(which node)
filePermissionUser="www";
filePermissionGroup="www";
filePermissionMode="0777";

mkdir -pv "${targetPath}/archive";

while true
do
    workingDir=$(pwd);
    touch tmp.html;
    currentDateTime=$(date);
    currentDateTimeFormated=$(date +%Y-%m-%d_%H%M.%S);

    echo "$currentDateTime";
    node ftpscan.js;

    mv tmp.html "$targetPath/archive/${currentDateTimeFormated}.html";
    #mv tmp.json "${targetPath}/${currentDateTimeFormated}.json";
    cd "$targetPath";
    #ln -sf "archive/${currentDateTimeFormated}.json" index.json;
    ln -sf "archive/${currentDateTimeFormated}.html" index.html;

    chmod -R "$filePermissionMode" "$targetPath";
    chown -R "${filePermissionUser}:${filePermissionGroup}" "$targetPath";

    cd "$workingDir";
done
