ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
FROM $DOCKER_REGISTRY/gms-common/java:$DOCKER_IMAGE_TAG

USER 0

WORKDIR /opt/gms

EXPOSE 8080

COPY feature-prediction-service-LATEST.jar ./feature-prediction-service/feature-prediction-service-LATEST.jar

RUN set -ex && \
    chown -R gms:gms /opt/gms

# gms uid
USER 1001

WORKDIR feature-prediction

# Define default command.
CMD exec java $JAVA_OPTS -jar /opt/gms/feature-prediction-service/feature-prediction-service-LATEST.jar

