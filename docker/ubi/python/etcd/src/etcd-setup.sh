#!/bin/bash

# This script is run to set up etcd

set -eu

#-- Start etcd temporarily for configuration and loading
etcd &
etcdpid=$!

#-- Wait for etcd to fully initialize
until etcdctl endpoint health; do
    sleep 1
done

#-- Add 'root' user and enable authentication
etcdctl user add "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"
etcdctl auth enable

#-- Setup 'read-everything' and 'readwrite-everything' roles
etcdctl role add read-everything --user "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"
etcdctl role add readwrite-everything --user "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"
etcdctl role grant-permission --prefix read-everything read '' --user "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"
etcdctl role grant-permission --prefix readwrite-everything readwrite '' --user "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"

#-- Setup 'gmsadmin' user 
etcdctl user add "gmsadmin:fbe74cf8ecbdc818dea92d4d63a28a490ea7c65f" --user "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"
etcdctl user grant-role gmsadmin readwrite-everything --user "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"

#-- Load configuration as 'gmsadmin'
gms-sysconfig --username gmsadmin --password "fbe74cf8ecbdc818dea92d4d63a28a490ea7c65f" --endpoints localhost load /setup/config/system/gms-system-configuration.properties

#-- Setup 'gms' user
etcdctl --dial-timeout=6s user add "gms:f60ab3b67f137fd4c6724fb4bebcc66d191931b9" --user "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"
etcdctl --dial-timeout=6s user grant-role gms read-everything --user "root:3c7c0f333b592df8d3572ca882f62c44e2fb4f4b"
sleep 1

#-- Stop the now-configured etcd
kill ${etcdpid}


