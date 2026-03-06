FROM docker.elastic.co/elasticsearch/elasticsearch:8.10.2

# We use the built-in 'users' tool to pre-create the system account
# This creates static files in /usr/share/elasticsearch/config/
USER root
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER elasticsearch

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]