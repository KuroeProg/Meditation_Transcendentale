FROM node:lts

WORKDIR /app/interface

COPY interface/package*.json ./

RUN npm install

WORKDIR /app
COPY . .

WORKDIR /app/interface

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]