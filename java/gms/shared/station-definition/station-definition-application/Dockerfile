ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
FROM $DOCKER_REGISTRY/gms-common/java:$DOCKER_IMAGE_TAG

USER 0

WORKDIR /opt/gms

EXPOSE 8080

COPY station-definition-application-LATEST.jar ./station-definition-application/station-definition-application-LATEST.jar


RUN set -ex && \
    chown -R gms:gms /opt/gms

# gms uid
USER 1001

WORKDIR station-definition-application

# Define default command.
CMD exec java $JAVA_OPTS $IGNITE_OPTS -jar /opt/gms/station-definition-application/station-definition-application-LATEST.jar
