ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
FROM $DOCKER_REGISTRY/gms-common/java:$DOCKER_IMAGE_TAG

USER 0

WORKDIR /opt/gms

EXPOSE 8080

COPY bin ./bridged-data-source-simulator-application/bin
COPY lib ./bridged-data-source-simulator-application/lib

RUN set -ex && \
    chown -R gms:gms /opt/gms

# gms uid
USER 1001

WORKDIR bridged-data-source-simulator-application

# Define default command.
CMD ["./bin/bridged-data-source-simulator-application"]
