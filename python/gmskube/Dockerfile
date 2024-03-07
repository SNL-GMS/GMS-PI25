ARG DOCKER_REGISTRY
ARG DOCKER_IMAGE_TAG
ARG PROJECT_NAME

FROM ${DOCKER_REGISTRY}/${PROJECT_NAME}/python:${DOCKER_IMAGE_TAG}

ARG GOOGLEAPIS_URL
ARG KUBECTL_VERSIONS
ARG HELM_URL
ARG HELM_VERSIONS

# Run python with unbuffered stdout
ENV PYTHONUNBUFFERED=1
# Set the path to the CA bundle for python requests
ENV REQUESTS_CA_BUNDLE=/etc/pki/tls/certs/ca-bundle.crt
# Set the path to the kubeconfig used by kubectl
ENV KUBECONFIG=/kubeconfig/config

# gmskube initially runs as USER 0, updates the gms uid, then switches to the gms user
# in the entrypoint script
USER 0

RUN set -ex && \
    umask 007 && \
    mkdir -p /kubeconfig && \
    chown gms:gms /kubeconfig && \
    # Install kubectl versions
    for i in ${KUBECTL_VERSIONS}; do \
        curl -fOL ${GOOGLEAPIS_URL}/kubernetes-release/release/v${i}/bin/linux/amd64/kubectl && \
        mkdir -p /opt/kubectl_${i%.*} && \
        mv ./kubectl /opt/kubectl_${i%.*}/kubectl && \
        chmod -R a+rx /opt/kubectl_${i%.*} && \
        ln -sf /opt/kubectl_${i%.*}/kubectl /usr/local/bin/kubectl; \
    done && \
    # Install helm versions
    for i in ${HELM_VERSIONS}; do \
        curl -fOL ${HELM_URL}/helm-v${i}-linux-amd64.tar.gz && \
        mkdir -p /opt/helm_${i%.*} && \
        tar -xvf helm-v${i}-linux-amd64.tar.gz --no-same-owner && \
        mv ./linux-amd64/helm /opt/helm_${i%.*}/helm && \
        chmod -R a+rx /opt/helm_${i%.*} && \
        rm -rf helm-v${i}-linux-amd64.tar.gz ./linux-amd64 && \
        ln -sf /opt/helm_${i%.*}/helm /usr/local/bin/helm; \
    done

COPY ./gmskube /install/gmskube/gmskube
COPY ./setup.py /install/gmskube/setup.py
COPY ./environment.lock.yml /install/gmskube/environment.lock.yml

RUN set -ex && \
    umask 027 && \
    cd /install/gmskube && \
    micromamba install -y --name base --file environment.lock.yml && \
    pip install . && \
    micromamba clean --all -y

COPY --chown=gms:gms ./_deploy /deploy
COPY ./docker-entrypoint.sh /

WORKDIR /
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["--help"]
