# Relazione Tecnica sull'Architettura dell'Applicazione: HorseCare

## 1. Introduzione
**HorseCare** è una piattaforma web progettata per la gestione sanitaria e operativa di scuderie equine. L'applicazione permette di monitorare scadenze critiche come ferrature, vaccinazioni, sverminamenti e visite veterinarie. L'architettura è stata progettata con un approccio **API-first**, garantendo prestazioni elevate, sicurezza e una predisposizione nativa alla scalabilità (passaggio da singolo utente a gestione multi-scuderia).

## 2. Stack Tecnologico
Il sistema si basa su un'architettura a tre livelli (Three-Tier Architecture) containerizzata tramite Docker:

*   **Livello Database**: PostgreSQL 16+.
*   **Livello API (Backend)**: PostgREST (Middleware per l'esposizione automatica di REST API).
*   **Livello Presentazione (Frontend)**: Angular 19+ (Standalone Components, RxJS, TypeScript).
*   **Infrastruttura**: Nginx (Reverse Proxy), Docker Compose.

## 3. Architettura del Database (Data Layer)
Il cuore dell'applicazione risiede in un database relazionale PostgreSQL, ottimizzato per l'integrità dei dati e la velocità di interrogazione.

### 3.1 Schema Logico
Le tabelle principali sono:
*   **`users`**: Gestione dell'autenticazione e dei ruoli (Admin, Manager, Owner).
*   **`stables`**: Entità organizzativa che permette di raggruppare i cavalli. Predisposta per il multi-tenancy.
*   **`horses`**: Anagrafica dettagliata dei cavalli, collegata a proprietari e scuderie.
*   **`event_types`**: Catalogo delle tipologie di attività (Ferratura, Vaccino, ecc.) con metadati estetici (codici colore hex).
*   **`events`**: Il registro storico e futuro delle attività, con stati di avanzamento (*scheduled, completed, cancelled*).

### 3.2 Scelte Progettuali Chiave
*   **Identificativi UUID**: Invece degli interi sequenziali, vengono utilizzati gli UUID per garantire l'unicità dei record in caso di future migrazioni o integrazioni tra database distribuiti.
*   **Automazione via Trigger**: Una funzione PL/pgSQL aggiorna automaticamente il timestamp `updated_at` ad ogni modifica dei record, garantendo la tracciabilità delle operazioni.
*   **Integrità Referenziale**: Vincoli di `FOREIGN KEY` con politiche di `ON DELETE CASCADE` o `SET NULL` per prevenire dati orfani.

## 4. Backend e Strato API
A differenza dei backend tradizionali, HorseCare utilizza **PostgREST**. Questa scelta offre diversi vantaggi:
1.  **Prestazioni**: PostgREST comunica direttamente con il catalogo di PostgreSQL, trasformando le richieste HTTP in SQL ottimizzato.
2.  **Standardizzazione**: Segue rigorosamente i principi RESTful.
3.  **Sicurezza**: La logica di autorizzazione è delegata al sistema di permessi (RBAC) nativo di PostgreSQL.

L'accesso alle API è mediato da un **Reverse Proxy Nginx**, che instrada le chiamate sulla porta `80/api` verso il servizio interno, garantendo un'unica origine per il frontend.

## 5. Architettura Frontend (Presentation Layer)
Il frontend è sviluppato in Angular, seguendo i più recenti standard di modularità e reattività.

### 5.1 Struttura del Codice
L'applicazione è organizzata in tre macro-aree:
*   **Core**: Singleton e servizi globali (es. `ApiService` per la comunicazione con PostgREST).
*   **Shared**: Componenti UI riutilizzabili, interfacce (Models) e utility.
*   **Features**: Moduli indipendenti caricati tramite Lazy Loading:
    *   *Dashboard*: Visualizzazione aggregata e statistiche.
    *   *Calendar*: Integrazione con **FullCalendar** per la pianificazione visiva.
    *   *Horses*: Gestione CRUD dell'anagrafica.
    *   *Events*: Form dinamici per la registrazione delle attività.

### 5.2 Design e UX (Responsività e Mobile)
L'interfaccia adotta un linguaggio visivo moderno definito **Glassmorphism**:
*   **Effetti Visivi**: Utilizzo di `backdrop-filter: blur`, ombre morbide e bordi arrotondati.
*   **Tipografia**: Utilizzo del font "Inter" per la massima leggibilità.
*   **Approccio Mobile-Adaptive**: L'app utilizza una **Bottom Navigation Bar** su schermi piccoli per una navigazione ottimizzata a una mano, mentre mantiene una sidebar/topbar su desktop. Tutti gli elementi touch sono dimensionati (min 44px) per l'uso immediato in scuderia.

## 6. Scalabilità e Futuri Sviluppi
L'architettura attuale è stata progettata per evolvere senza necessità di refactoring strutturale:

1.  **Multi-Scuderia**: La tabella `stables` permette già di isolare i dati di diversi centri ippici sotto un unico database.
2.  **Autenticazione e Autorizzazione (PostgREST)**: Implementazione di politiche di sicurezza a livello di riga (Row Level Security - RLS) in PostgreSQL per associare ogni cavallo al proprio proprietario, delegando a PostgREST la validazione dei JWT e il controllo degli accessi.
3.  **Internazionalizzazione (i18n)**: Aggiunta del supporto multi-lingua per l'interfaccia utente tramite librerie come `@ngx-translate` o Angular i18n, permettendo la localizzazione dell'app in diverse lingue.
4.  **Offline-First**: La separazione netta tra dati e interfaccia permette l'integrazione futura di Service Workers per l'utilizzo dell'app senza connessione internet.
5.  **App Mobile**: Grazie allo strato API standardizzato, è possibile sviluppare un'app nativa (Flutter o React Native) che consuma gli stessi servizi del frontend web.

---

*Documento redatto il 17 Marzo 2026*
*Versione 1.0 - Architettura di Riferimento*

