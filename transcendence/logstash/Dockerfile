FROM docker.elastic.co/logstash/logstash:8.10.2

RUN rm -f /usr/share/logstash/pipeline/logstash.conf

COPY pipeline/logstash.conf /usr/share/logstash/pipeline/logstash.conf
