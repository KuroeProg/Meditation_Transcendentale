FROM node:lts

WORKDIR /app/interface

COPY interface/package*.json ./

RUN npm install

WORKDIR /app
COPY . .

WORKDIR /app/interface

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]