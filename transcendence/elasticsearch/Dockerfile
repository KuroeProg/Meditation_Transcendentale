FROM docker.elastic.co/elasticsearch/elasticsearch:8.10.2

USER root

RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER elasticsearch

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]