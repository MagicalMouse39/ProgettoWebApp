# Guida al Deploy su Kubernetes (K8s): HorseCare

Questa guida descrive le procedure per il rilascio dell'applicazione HorseCare in un cluster Kubernetes utilizzando i manifesti forniti nella cartella `k8s/manifests/`.

---

## 1. Struttura dei Manifesti

I file di configurazione per Kubernetes sono suddivisi in due cartelle principali all'interno di `k8s/manifests/` per garantire il corretto ordine di esecuzione alfabetica:

*   **`0-storage/`**: Contiene il manifesto infrastrutturale per **Longhorn**:
    *   `longhorn.yaml`: Installa l'infrastruttura Longhorn per la gestione dinamica dello storage.
*   **`1-app/`**: Contiene tutti i componenti applicativi di HorseCare ordinati per applicazione:
    *   `0-namespace.yaml`: Crea il namespace `horsecare`.
    *   `1-secrets.yaml`: Credenziali del database e chiave JWT.
    *   `2-database.yaml`: ConfigMap di inizializzazione DB (`init.sql`), Servizio e StatefulSet per PostgreSQL (con volumi Longhorn).
    *   `3-postgrest.yaml`: Servizio e Deployment per PostgREST.
    *   `4-swagger.yaml`: Servizio (NodePort 30081) e Deployment per Swagger UI.
    *   `5-frontend.yaml`: Servizio e Deployment per il Frontend Angular.
    *   `6-revproxy.yaml`: ConfigMap di configurazione routing, Servizio (NodePort 30080) e Deployment per il Reverse Proxy Nginx.
    *   `7-ingress.yaml`: Ingress per l'esposizione in produzione.
    *   `8-cloudflare-tunnel.yaml`: Deployment e Secret del connettore Cloudflare Tunnel.

---

## 2. Prerequisiti

### 2.1 Storage (Open-iSCSI)
Longhorn richiede che il pacchetto `open-iscsi` sia installato e funzionante su tutti i nodi (master e worker) del cluster.
Sui sistemi basati su Debian/Ubuntu, puoi configurarlo tramite il file helper `k8s/scripts/common.sh` oppure manualmente:
```bash
sudo apt update && sudo apt install -y open-iscsi
sudo systemctl enable --now iscsid
```

### 2.2 Caricamento delle Immagini locali (Containerd)
Poiché l'immagine `horsecare/frontend:latest` non è ospitata su un registro pubblico, devi caricarla manualmente nello store di `containerd` su **tutti i nodi worker** del cluster.

1. **Esporta l'immagine sul tuo computer di sviluppo**:
   ```bash
   docker build -t horsecare/frontend:latest ./frontend
   docker save -o frontend.tar horsecare/frontend:latest
   ```

2. **Trasferisci l'immagine su tutti i nodi del cluster**:
   ```bash
   scp frontend.tar utente@<IP-NODO-K8S>:/tmp/
   ```

3. **Importa l'immagine in Containerd** (specificando il namespace di Kubernetes `k8s.io`):
   ```bash
   sudo ctr -n k8s.io images import /tmp/frontend.tar
   ```

---

## 3. Installazione e Deploy

### Passo 1: Installare Longhorn
Applica il manifesto per l'infrastruttura di storage:
```bash
kubectl apply -f k8s/manifests/0-storage/longhorn.yaml
```

Verifica lo stato dell'installazione attendendo che tutti i pod siano pronti:
```bash
kubectl get pods -n longhorn-system -w
```
Una volta completata l'installazione, Longhorn registrerà la StorageClass `longhorn` di default.

### Passo 2: Rilasciare l'Applicazione HorseCare
Applica l'intera cartella dei manifesti applicativi. Grazie alla numerazione sequenziale dei file, le risorse verranno create nell'ordine corretto (Namespace -> Secret -> Database -> PostgREST -> altri servizi):
```bash
kubectl apply -f k8s/manifests/1-app/
```

Verifica che tutti i componenti siano attivi e funzionanti:
```bash
kubectl get all -n horsecare
```

---

## 4. Accesso all'Applicazione

I servizi sono esposti tramite `NodePort` su tutte le macchine del cluster:

*   **Frontend & API**: Accessibile all'indirizzo `http://<IP-DI-UN-NODO-K8S>:30080`
*   **Swagger UI**: Accessibile all'indirizzo `http://<IP-DI-UN-NODO-K8S>:30081`

### Esposizione in Produzione (Ingress)
Se nel tuo cluster è installato un Ingress Controller (es. Nginx Ingress Controller), puoi configurare l'instradamento tramite il file [7-ingress.yaml](file:///home/magical/Desktop/Uni/ProgettoWebApp/k8s/manifests/1-app/7-ingress.yaml) per mappare l'applicazione su un dominio specifico con terminazione SSL.

### Esposizione via Cloudflare Tunnel
Per esporre l'applicazione in modo sicuro senza aprire porte sul tuo router/firewall, puoi utilizzare il manifesto [8-cloudflare-tunnel.yaml](file:///home/magical/Desktop/Uni/ProgettoWebApp/k8s/manifests/1-app/8-cloudflare-tunnel.yaml):

1. **Crea un Tunnel** nella dashboard di Cloudflare Zero Trust (Access -> Tunnels).
2. Scegli **Cloudflared** come connettore e ottieni il **Tunnel Token**.
3. Inserisci il token nel campo `stringData.tunnel-token` nel file [8-cloudflare-tunnel.yaml](file:///home/magical/Desktop/Uni/ProgettoWebApp/k8s/manifests/1-app/8-cloudflare-tunnel.yaml).
4. Applica il manifesto nel cluster:
   ```bash
   kubectl apply -f k8s/manifests/1-app/8-cloudflare-tunnel.yaml
   ```
5. Nella Dashboard di Cloudflare Zero Trust, crea un **Public Hostname** per il tuo tunnel (es. `horsecare.sawherd.com`):
   * **Service Type**: `HTTP`
   * **URL**: `revproxy.horsecare.svc.cluster.local:80` (oppure semplicemente `revproxy:80` se usi lo stesso namespace).

---

## 5. Manutenzione e Log

### Visualizzazione dei Log
Per controllare i log di un componente specifico (es. database):
```bash
kubectl logs -f statefulset/database -n horsecare
# oppure per il frontend
kubectl logs -f deployment/frontend -n horsecare
```

### Reset del Database (Attenzione: rimuove tutti i dati!)
Per ricreare lo stato iniziale del DB:
```bash
kubectl delete statefulset database -n horsecare
kubectl delete pvc database-data-database-0 -n horsecare
kubectl apply -f k8s/manifests/1-app/2-database.yaml
```

---

## 6. Rimozione dell'Applicazione

Per rimuovere completamente l'applicazione e lo storage dal cluster:

```bash
# Rimuove l'applicazione HorseCare e il suo namespace
kubectl delete -f k8s/manifests/1-app/
kubectl delete namespace horsecare

# Rimuove l'infrastruttura Longhorn
kubectl delete -f k8s/manifests/0-storage/longhorn.yaml
```
