FROM owasp/modsecurity-crs:nginx

USER root

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/nginx/certs /var/www/html/legal /etc/nginx/templates/conf.d

COPY conf.d/0-map-ws.conf.template /etc/nginx/templates/conf.d/0-map-ws.conf.template
COPY conf.d/default.conf /etc/nginx/templates/conf.d/default.conf.template
COPY legal/ /var/www/html/legal/

COPY setup_ssl.sh /usr/local/bin/setup_ssl.sh
RUN chmod +x /usr/local/bin/setup_ssl.sh

EXPOSE 8443