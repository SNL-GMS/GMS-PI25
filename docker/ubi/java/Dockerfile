ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
ARG PROJECT_NAME

FROM ${DOCKER_REGISTRY}/${PROJECT_NAME}/ubi:${DOCKER_IMAGE_TAG}

ARG GITHUB_URL
ARG JAVA_VERSION
ARG JAVA_MAJOR_VERSION
ENV JAVA_HOME /usr/local/openjdk-${JAVA_MAJOR_VERSION}
ENV PATH=${JAVA_HOME}/bin:${PATH}
ENV JAVA_TOOL_OPTIONS='-XX:MaxRAMPercentage=75.0'

ENV IGNITE_OPTS="-DIGNITE_QUIET=false \
            --add-opens=java.base/sun.reflect.annotation=ALL-UNNAMED \
            --add-opens=jdk.management/com.sun.management.internal=ALL-UNNAMED \
            --add-opens=java.base/jdk.internal.misc=ALL-UNNAMED \
            --add-opens=java.base/sun.nio.ch=ALL-UNNAMED \
            --add-opens=java.management/com.sun.jmx.mbeanserver=ALL-UNNAMED \
            --add-opens=jdk.internal.jvmstat/sun.jvmstat.monitor=ALL-UNNAMED \
            --add-opens=java.base/sun.reflect.generics.reflectiveObjects=ALL-UNNAMED \
            --add-opens=java.base/java.io=ALL-UNNAMED \
            --add-opens=java.base/java.nio=ALL-UNNAMED \
            --add-opens=java.base/java.util=ALL-UNNAMED \
            --add-opens=java.base/java.lang=ALL-UNNAMED \
            --add-opens=java.base/java.time=ALL-UNNAMED"

USER 0

COPY src/wait-for-config-load.sh /usr/local/bin
RUN set -ex && \
    # install java jre (steps are derived from the official adoptium dockerfile)
    # JAVA_VERSION is the full version number with update (i.e 11.0.4.1-1)
    # JAVA_VERSION%%-* is the version without update number (i.e 11.0.4.1)
    # JAVA_VERSION##*- is the update number after the dash (i.e 1)
    mkdir -p ${JAVA_HOME} && \
    curl -fOL $GITHUB_URL/adoptium/temurin${JAVA_MAJOR_VERSION}-binaries/releases/download/jdk-${JAVA_VERSION%%+*}+${JAVA_VERSION##*+}/OpenJDK${JAVA_MAJOR_VERSION}U-jre_x64_linux_hotspot_${JAVA_VERSION%%+*}_${JAVA_VERSION##*+}.tar.gz && \
    tar -xvf OpenJDK${JAVA_MAJOR_VERSION}U-jre_x64_linux_hotspot_${JAVA_VERSION%%+*}_${JAVA_VERSION##*+}.tar.gz --directory ${JAVA_HOME} --strip-components 1 --no-same-owner && \
    chmod a+rx ${JAVA_HOME} && \
    rm -f OpenJDK*.tar.gz ${JAVA_HOME}/src.zip && \
    java --version

# gms uid
USER 1001

ENTRYPOINT ["wait-for-config-load.sh"]
CMD ["/bin/bash"]
