FROM docker.elastic.co/elasticsearch/elasticsearch:8.10.2

COPY entrypoint.sh /usr/share/elasticsearch/entrypoint.sh

ENV CERT_DIR=/usr/share/elasticsearch/config/certs

# Switch to root to change permissions, then back to elasticsearch user
USER root

RUN mkdir -p ${CERT_DIR} && \
    chown -R elasticsearch:root ${CERT_DIR} && \
    chmod 775 ${CERT_DIR}

RUN chmod +x /usr/share/elasticsearch/entrypoint.sh
USER elastic

ENTRYPOINT ["/usr/share/elasticsearch/entrypoint.sh"]