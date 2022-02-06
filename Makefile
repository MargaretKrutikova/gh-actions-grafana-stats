JQ_VERSION=1.6

include .env
export $(shell sed 's/=.*//' .env)

jq_v${JQ_VERSION}:
	curl --compressed -#Lo jq_v${JQ_VERSION} \
        https://github.com/stedolan/jq/releases/download/jq-${JQ_VERSION}/jq-osx-amd64

jq: jq_v${JQ_VERSION}
	cp jq_v${JQ_VERSION} jq
	chmod +x jq

.PHONY : update-grafana
update-grafana: jq
	bash ./scripts/fetch-grafana-config.sh
	