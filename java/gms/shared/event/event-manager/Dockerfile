ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
FROM $DOCKER_REGISTRY/gms-common/java:$DOCKER_IMAGE_TAG

USER 0

WORKDIR /opt/gms

EXPOSE 8080

COPY event-manager-LATEST.jar ./event-manager/event-manager-LATEST.jar

RUN set -ex && \
    chown -R gms:gms /opt/gms

# gms uid
USER 1001

WORKDIR event-manager

# Define default command.
CMD exec java $JAVA_OPTS $IGNITE_OPTS -jar /opt/gms/event-manager/event-manager-LATEST.jar
