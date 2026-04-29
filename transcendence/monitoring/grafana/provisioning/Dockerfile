FROM grafana/grafana:latest

USER root
RUN apk update && apk add --no-cache curl jq

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER grafana

ENTRYPOINT ["/entrypoint.sh"]