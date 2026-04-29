FROM docker.elastic.co/logstash/logstash:8.10.2

RUN rm -f /usr/share/logstash/pipeline/logstash.conf
COPY pipeline/logstash.conf /usr/share/logstash/pipeline/logstash.conf

USER root
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER logstash

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]