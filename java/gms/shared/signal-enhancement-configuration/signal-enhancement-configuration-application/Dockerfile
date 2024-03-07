ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
FROM $DOCKER_REGISTRY/gms-common/java:$DOCKER_IMAGE_TAG

USER 0

WORKDIR /opt/gms

EXPOSE 8080

COPY signal-enhancement-configuration-application-LATEST.jar ./signal-enhancement-configuration-application/signal-enhancement-configuration-application-LATEST.jar

RUN set -ex && \
    chown -R gms:gms /opt/gms

# gms uid
USER 1001

WORKDIR signal-enhancement-configuration-application

# Define default command.
CMD exec java $JAVA_OPTS $IGNITE_OPTS -jar /opt/gms/signal-enhancement-configuration-application/signal-enhancement-configuration-application-LATEST.jar

