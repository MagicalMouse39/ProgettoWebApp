# Guida al Deploy: HorseCare

Questa guida descrive le procedure per il rilascio dell'applicazione HorseCare, partendo dall'attuale configurazione basata su **Docker Compose** fino alla futura espansione su **Kubernetes (K8s)**.

---

## 1. Deploy Attuale: Docker Compose

La soluzione attuale è ideale per ambienti di sviluppo e piccoli server standalone.

### 1.1 Prerequisiti
- Docker e Docker Compose installati sul server.
- File `.env` configurato correttamente (vedi esempio sotto).

### 1.2 Configurazione Ambiente
Crea un file `.env` nella root del progetto:
```env
PG_USER=admin
PG_PASS=una-password-sicura-123
PG_DB=horsecare
PGRST_JWT_SECRET=una-chiave-lunga-almeno-32-caratteri-per-i-token-jwt
```

### 1.3 Avvio Applicazione
Per compilare le immagini e avviare tutti i servizi in background:
```bash
docker compose up -d --build
```

I servizi saranno accessibili ai seguenti indirizzi:
- **Frontend/API (Nginx)**: `http://localhost:80`
- **Swagger UI**: `http://localhost:8081`

---

## 2. Backup e Persistenza

La persistenza dei dati è garantita dal volume Docker `pg_data`.

### 2.1 Strategia WAL (Write-Ahead Logging)
Per garantire l'integrità dei dati e permettere il recupero "point-in-time", PostgreSQL utilizza il WAL.
In produzione, si raccomanda di:
1. Configurare `archive_mode = on` in PostgreSQL.
2. Usare strumenti come **Barman** o **Wal-G** per inviare i file WAL a uno storage esterno (es. S3, MinIO).

---

## 3. Roadmap Futura: High Availability su Kubernetes

Per gestire carichi elevati e garantire la massima disponibilità (HA), l'architettura è pronta per migrare su K8s.

### 3.1 Componenti del Cluster
- **Database**: Invece di un singolo container, si utilizzerà un operatore come **CloudNativePG** o **Zalando Postgres Operator** per gestire repliche (Primary/Standby) e backup automatici via WAL.
- **Backend (PostgREST)**: Deploy come `Deployment` con HPA (Horizontal Pod Autoscaler) per scalare in base alle richieste HTTP.
- **Frontend**: Servito via Nginx Ingress Controller con terminazione TLS gestita da **cert-manager**.

### 3.2 Vantaggi del passaggio a K8s
- **Auto-healing**: Riavvio automatico dei container in caso di crash.
- **Rolling Updates**: Aggiornamenti dell'app senza tempi di inattività.
- **Gestione Segreti**: Uso di `K8s Secrets` o integrazione con HashiCorp Vault.

---

## 4. Manutenzione Ordinaria

### Visualizzazione Log
```bash
docker compose logs -f [nome-servizio]
```

### Reset del Database (Attenzione: cancella tutti i dati!)
```bash
docker compose down -v
docker compose up -d
```
