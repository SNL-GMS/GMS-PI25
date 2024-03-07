#!/bin/bash

if [[ "$0" == "$BASH_SOURCE" ]]; then
    echo "This script must be sourced."
    exit 1
fi

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
ENV_FILE=${SCRIPT_DIR}/gms-test-environment.yml
ENV_LOCK_FILE=${SCRIPT_DIR}/gms-test-environment.lock.yml

if [ -z ${CONDA_SHLVL+x} ]; then
    echo -n "'conda' is not yet initialized for your shell.  Please run:  "
    echo -n "conda init bash > /dev/null && "
    echo -n "source ~/.bashrc && "
    echo "source ${SCRIPT_DIR}/${BASH_SOURCE}"
    return
fi

print_git_info() {
    cd ${SCRIPT_DIR}
    branch=$(git rev-parse --abbrev-ref HEAD)
    sha1=$(git rev-parse HEAD)
    echo "'gms-common' branch: ${branch}; commit: ${sha1}"
    cd - > /dev/null
}

gms_env_exists() {
    conda env list | grep "^gms\s" > /dev/null
}

gms_env_up_to_date() {
    conda compare --name gms ${ENV_FILE} > /dev/null
}

run_env_update_command() {
    local env_file=$1
    echo "Updating the 'gms' environment with '${env_file}'."
    conda activate gms
    conda env update --file ${env_file} --prune
}

run_env_create_command() {
    local env_file=$1
    echo "Creating the 'gms' environment with '${env_file}'."
    conda env create --name gms --file ${env_file}
}

run_env_remove_command() {
    echo "Removing your 'gms' conda environment."
    conda deactivate
    conda env remove --name gms
}

create_env_from_scratch() {
    if ! run_env_create_command ${ENV_LOCK_FILE}; then
        echo -n "Failed to create the 'gms' conda environment using "
        echo "'${ENV_LOCK_FILE}'.  Falling back to '${ENV_FILE}'."
        if ! run_env_create_command ${ENV_FILE}; then
            echo -n "Unable to create the 'gms' conda environment.  Please "
            echo "contact Platform for support."
            return 1
        fi
    fi
}

update_existing_env() {
    if gms_env_up_to_date; then
        echo "The 'gms' environment is up-to-date."
    else
        echo -n "The existing 'gms' conda environment doesn't match the "
        echo "approved specification."
        if ! run_env_update_command ${ENV_LOCK_FILE}; then
            echo -n "Failed to update your 'gms' conda environment using "
            echo "'${ENV_LOCK_FILE}'.  Falling back to '${ENV_FILE}'."
            if ! run_env_update_command ${ENV_FILE}; then
                echo -n "Failed to update your 'gms' conda environment using "
                echo -n "'${ENV_FILE}'.  Falling back to creating it from "
                echo "scratch."
                run_env_remove_command
                create_env_from_scratch
            fi
        fi
    fi
}

echo "Activating the 'gms' conda environment."
print_git_info
if gms_env_exists; then
    echo "The 'gms' conda environment already exists."
    update_existing_env
else
    echo "The 'gms' conda environment does not exists."
    create_env_from_scratch
fi
if conda activate gms; then
    echo "Activated the 'gms' conda environment."
else
    echo "Failed to activate the 'gms' conda environment."
    conda env list
    return 1
fi
