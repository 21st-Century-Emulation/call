FROM ubuntu:20.04 as build

RUN apt update && apt install curl unzip -y
RUN curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=/usr/local sh

WORKDIR /app
COPY . .

RUN deno compile --unstable --allow-net --allow-env src/webserver.ts

FROM ubuntu:20.04 as runtime

COPY --from=build /app/webserver .

ENTRYPOINT ["./webserver"]