# Command-Line Utilities

The following GMS (Geophysical Monitoring System) command-line
utilities are [available here](../bin):

* [**gmskube**](#gmskube): Manage running instances of the GMS system on a Kubernetes cluster
* [**gms-css-to-coi**](#gms-css-to-coi): Convert CSS station reference data to OSD format usable by GMS

## gmskube

The **gmskube** command-line program is used to install and configure
*instances* of the GMS (Geophysical Monitoring System) system on
Kubernetes.

Each *instance* is an install of a multi-container application that is
managed as a single unit and runs on a Kubernetes cluster. Each
instance is contained within its own namespace in Kubernetes. Various
predefined types of instances are available. Some example instance types
would be **ian**, **logging**, or **sb**.

Multiple copies of instances may be run simultaneously. Each instance must be
given a unique name to identify it as well as distinguish it from other running
instances of the same type. For example, one instance of **ian** may be running
as 'ian-develop' while another instance of **ian** may be running as
'ian-integration'.

Different versions of a instance type may be available from the configured
Docker registry. Released versions of GMS are tagged with a specific version
number.

#### Configuration
Before you can run **gmskube**, there are some configuration steps you must
apply.

1. Confirm that **kubectl** is installed<br>
   If it is not installed, download and install it
2. Confirm that **docker** is installed<br>
   If it is not installed, download and install it
3. Confirm that your **.bashrc** file is sourcing \<full-path-to-gms-common\>/.bash_env
4. Confirm that the following environment variable is set<br>
   **CI_DOCKER_REGISTRY**:  should be set to the fully qualified domain name of
   your remote docker registry
5. Download a **Kubeconfig bundle** from the cluster and have the kubectl
   context set to the correct cluster.  **Note**:  The example provided below
   if for a Rancher Kubernetes cluster but these instructions could be
   generalized for any Kubernetes cluster.

   - Login to Rancher
   - Click the cluster name
   - In the upper right, click the blue Kubeconfig File button
   - Copy/Paste the contents into ~/.kube/\<cluster-name\>.config on your development machine
   - If you have kubectl installed, the KUBECONFIG environment variable should
     already be set.  If not, set KUBECONFIG=~/config
6. Connect to your cluster<br>
   ```bash
   kubeconfig <cluster-name>

   # Confirm you are connected
   kubeconfig

   # You should see an asterisk next to your cluster name
   ```
7. Confirm that a **Default Storage Class** is defined
   ```bash
   kubectl get storageclass`

   # Confirm that the output shows **(default)** next to one of your storage classes.
   # This is the storage class that will be used for persistent storage when not
   # explicitly specified. Default storage class can be set in the Rancher interface.
   ```
8. Create and Configure the **gms namespace**
   Prior to using `gmskube` to deploy GMS applications, you  must first create a
   **GMS Namespace**.  In additional, there is one required configuration and
   several optional configurations for this namespace.
   ```bash
   # Create the namespace
   kubectl create namespace gms

   # You should see "namespace/gms created"
   ```

   **REQUIRED:**  Create a secret containing your **default ingress SSL certificate**
   * Create a file named `ingress-default-cert.yaml`
   ```yaml
   # Create a file to define the secret
   apiVersion: v1
   kind: Secret
   name: ingress-default-cert
   namespace: gms
   data:
     tls.crt: <cert-data-goes-here>
     tls.key: <tls-key-goes-here>
   ```
   ```bash
   # Use kubectl to create the secret
   kubectl -n gms apply -f ingress-default-cert.yaml
   ```

   **OPTIONAL:**  Create an **Oracle wallet secret**<br>
   The oracle-wallet secret is used by the IAN application to connect to an Oracle database.
   It is automatically for IAN applications unless specifically overridden during installation.
   ```bash
   # Create the wallet secret
   kubectl -n gms create secret generic oracle-wallet --from-file=<path-to-your-oracle-wallet-directory>
   ```

   **OPTIONAL:**  Create an **LDAP Certificate Configmap** if you wish to use GMS logging<br>
   If you are running in a cloud environment, you probably already have a logging stack.
   But, if you'd like to deploy the GMS logging stack (elasticsearch/fluent-bit/kibana),
   you will need a configmap for your LDAP certificate.
   ```bash
   # Create the configmap
   kubectl -n gms create configmap ldap-ca-cert --from-file=<path-to-ldap-certificate-file>.crt
   ```

   **OPTIONAL:**  Create a **secret** for storing your **LDAP bind password**<br>
   Note:  This is only needed if you are deploying the GMS logging stack.
   ```bash
   # Create secret for storing the LDAP bind password
   kubectl -n gms create secret generic ldap-bindpass --from-literal=bindpass='password-goes-here'
   ```

   **OPTIONAL:**  Create a **configmap** for your **LDAP configuration settings**<br>
   * Note:  This is only needed if you are deploying the GMS logging stack.
   * Create a file named `logging-ldap-settings.yaml` and place the following content in the file
   * Fill in the values with your LDAP configuration
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: logging-ldap-config
     namespace: gms
   data:
   bind_dn: ""
   ldap_host: ""
   ldap_port: ""
   base_dn: ""
   attribute: ""
   filter: ""
   ldap_ca_pem_file: "/etc/config/<name-of-your-ldap-crt-file>.crt"
   proxied_url: "http://logging-kibana:5601"
   ```
   ```bash
   # Use kubectl to create the configmap
   kubectl -n gms apply -f logging-ldap-settings.yaml
   ```

9. **OPTIONAL** Install Helm<br>
   Installing Helm is not required (it is built into the container run by the
   gmskube script) but having it installed can help with troubleshooting.

#### Subcommands

Once you have completed the **requirements for gmskube** you can begin using it to
deploy GMS instances.  The command line interface is well documented.  Note that
you can obtain help for each level of commands.
* **gmskube --help** <br>
  List all available gmskube commands.
  ```bash
  gmskube --help
  ```

* **gmskube <command> --help** <br>
  List help for individual commands
  ```bash
  gmskube install --help
  gmskube upgrade --help
  gmskube uninstall --help
  gmskube reconfig --help
  gmskube list --help
  gmskube augment --help
  gmskube ingress --help
  ```

## gms-css-to-coi

To update station reference and station processing configuration, any files in
the native CSS specification must first be converted to the GMS Common Object
Interface (COI) format.  This conversion must be run before the config can
be ingested by the GMS system for either a **gmskube install** or
a **gmskube reconfig** when run with the **--config** argument.

By convention, the source CSS station-reference data is typically in
a **data** directory and the resulting COI data is generated to a
**stationdata* directory.

```bash
# convert the COI data directory to an OSD stationdata directory
gms-css-to-coi -s path-to-my-config/station-reference/data -d path-to-my-config/station-reference/stationdata
```
