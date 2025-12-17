FROM electronuserland/builder:20-bullseye

WORKDIR /app


COPY . .


RUN npm install


RUN npm run build


VOLUME ["/app/release"]
