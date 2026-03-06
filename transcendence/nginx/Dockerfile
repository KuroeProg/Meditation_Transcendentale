FROM nginx:stable-alpine

RUN apk add --no-cache openssl

RUN rm /etc/nginx/conf.d/default.conf

RUN mkdir -p /etc/nginx/certs /var/www/html/legal

COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

COPY legal/ /var/www/html/legal/

COPY setup_ssl.sh /usr/local/bin/setup_ssl.sh
RUN chmod +x /usr/local/bin/setup_ssl.sh

EXPOSE 443
