FROM node:lts

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

#vite utilise l eport 5173 par defaut
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]