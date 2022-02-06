#!/bin/bash

set -o errexit
set -o pipefail

BEARER=${GRAFANA_API_KEY}
FULLURL="http://localhost:4000"
# curl has trouble returning both status and response, so the response is written into file
temp_http_reponse=response.txt
dashboards_dir=dashboards
datasources_dir=datasources

function fetch {
    status=$(curl -s --connect-timeout 5 -k -H "Authorization: Bearer ${BEARER}" -o ${temp_http_reponse} -w "%{http_code}" $1)
    if [ "$status" != "200" ]; then
        echo >&2 "Failed to access url: $1 with status code: $status"
        rm ${temp_http_reponse}
        exit 1
    else
        cat ${temp_http_reponse}
    fi
}

function sanitize_file_name {
    echo -n $1 | tr -cs 'a-zA-Z0-9' '-' | tr '[:upper:]' '[:lower:]' | sed 's/-*$//g'
}

echo "Exporting Grafana dashboards from $FULLURL"

while read -r line; do
  dashboard_ids+=("$line")
done < <(
  set -o pipefail
  fetch "$FULLURL/api/search" | ./jq -j '.[]  | select( .type | contains("dash-db")) | .uid | (., "\n")'
)

rm -rf ${dashboards_dir}
mkdir -p ${dashboards_dir}

for dash in "${dashboard_ids[@]}"; do
    echo "Fetching dashboard with id $dash"

    dashboard_json=$(fetch "$FULLURL/api/dashboards/uid/$dash")

    title=$(echo "$dashboard_json" | ./jq -r '.dashboard | .title' | sed -r 's/[ \/]+/_/g' )
    slug=$(echo "$dashboard_json" | ./jq -r '.meta.slug')

    echo "${dashboard_json}" | ./jq '.' > ${dashboards_dir}/"${slug}".json
    echo "Sucessfully fetched dashboard: $title"
done


echo "Exporting Grafana data sources from $FULLURL"

rm -rf ${datasources_dir}
mkdir -p ${datasources_dir}

fetch "$FULLURL/api/datasources" | ./jq -j '.' > ./"${datasources_dir}"/datasources.json
 



rm ${temp_http_reponse}