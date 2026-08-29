FROM apify/actor-node:22
COPY package*.json ./
RUN npm --quiet set progress=false && npm install --omit=dev
COPY . ./
CMD ["node", "src/runtime/apify-main.js"]
