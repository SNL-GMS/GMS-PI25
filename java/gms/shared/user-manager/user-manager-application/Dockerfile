ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
FROM $DOCKER_REGISTRY/gms-common/java:$DOCKER_IMAGE_TAG

USER 0

WORKDIR /opt/gms

EXPOSE 8080

COPY user-manager-application-LATEST.jar ./user-manager-application/user-manager-application-LATEST.jar

RUN set -ex && \
    chown -R gms:gms /opt/gms

# gms uid
USER 1001

WORKDIR user-manager-application

# Define default command.
CMD exec java $JAVA_OPTS -jar /opt/gms/user-manager-application/user-manager-application-LATEST.jar

