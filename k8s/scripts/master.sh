# Initialize cluster
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# Copy kube config in home to use "kubectl" command
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

echo
read -s -r -p "Please join all the workers to the master, then press enter to continue..."
echo

# Label each node
for node in $(kubectl get nodes -o name); do
  if [[ ${node##*/} == $(uname -n) ]]; then
    continue
  fi
  kubectl label ${node} node-role.kubernetes.io/worker=worker
done

# Apply flannel
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml

# Apply longhorn storage local manifest
kubectl apply -f ../manifests/storage

# Apply app manifests
kubectl apply -f ../manifests/app