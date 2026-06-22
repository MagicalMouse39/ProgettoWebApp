# Setup apt and install common packages
### Add required keyrings
sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
echo 'deb [trusted=yes] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list

### Update, upgrade and then install required components
sudo apt update && sudo apt upgrade -y
sudo apt install -y containerd.io kubelet kubeadm kubectl

# Config containerd
sudo mkdir -p /etc/containerd
sudo containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i -e 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml
sudo systemctl restart containerd

# Config k8s
sudo systemctl enable --now kubelet
sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab
sudo modprobe br_netfilter
sudo sysctl -w net.ipv4.ip_forward=1

# Install lvm2 for Ceph
sudo apt install -y lvm2
