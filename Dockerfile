FROM node:lts-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

# 修改端口为 7860
ENV PORT=7860

EXPOSE 7860

CMD ["npm", "run", "start"]
