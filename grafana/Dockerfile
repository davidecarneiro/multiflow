#FROM node:16-alpine AS node
FROM node:21-alpine AS node

FROM grafana/grafana-oss

USER root

COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/share /usr/local/share
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

ADD ./custom-run.sh /custom-run.sh

RUN apk update \
    && apk upgrade

#ENTRYPOINT ["/custom-run.sh"]
