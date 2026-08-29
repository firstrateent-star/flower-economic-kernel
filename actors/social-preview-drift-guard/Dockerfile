FROM apify/actor-node:24

COPY --chown=myuser:myuser package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && npm cache clean --force

COPY --chown=myuser:myuser . ./
RUN npm run check && npm test

CMD ["npm", "start", "--silent"]
