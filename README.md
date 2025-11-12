# Meine digitale Rezeptverwaltung
Kinderleichtes erstellen, drucken, berechnen von komplexen Rezepten. <br>
Der Materialpreis und die Nährwertangaben eines Rezeptes lassen sich schnell mit nur einem klick über die einzelnen Zutaten berechnen. <br>
Zwischenrezepte: Manche Abläufe wiederholen sich einfach, z.B. wiederholt sich der Tortenboden bei manchen Torten. Dieser kann extra in einem Zwischenrezept "Tortenboden" angelegt werden und dann in den Rezepten der Torten wiederverwendet werden. Somit sparen Sie sich mühsame schreibarbeit und haben einen besseren Überblick über Ihre Rezepte. <br> 
Sie kaufen nicht immer das selbe Produkt? Sie können bei Zutaten mehrere Lieferanten hinzufügen inkl. des zugehörigen Einkaufspreises.

## Einfach ausprobieren
https://digitale-rezeptverwaltung.lnoppinger.de <br>
Nutername: demo <br>
Passwort:  demopasswort

## Installation
```
services:

  db:
    image: postgres:18
    restart: on-failure
    volumes:
      - ./digitale-rezeptverwalung-db:/var/lib/postgresql
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    
  digitale-rezeptverwalung:
    build:  https://github.com/lnoppinger/digitale-rezeptverwaltung.git#main
    ports:
      - 80:80
    restart: on-failure
    environment:
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DATABASE=postgres
      - OIDC_ISSUER_URL=https://<keycloak url>/auth/realms/master
      - OIDC_BASE_URL=http://localhost
      - OIDC_CLIENT_ID=digitale-rezeptverwaltung
      - OIDC_CLIENT_SECRET=supersecret
```

## Authentifizierung mit OIDC
Konfigurationsbeispiel für Keycloak: <br> <br>
1) Neue Rolle 'digitale-rezeptverwaltung' erstellen
2) Neuen Client hinzufügen
3) Access-Type zu 'confidential' ändern und unter Credentials, Client Secret notieren
4) Die url, über die die digitale Rezeptverwalung erreichbar sein soll (OIDC_BASE_URL) als Valid Redirect URIs (mit * am Ende) und Web Origin eintragen
5) Unter Client Scopes 'roles' zu Assigned Default Client Scopes hinzufügen
6) Unter Mappers (Add Builtin) 'realm roles' hinzufügen und Add to ID Token aktivieren
7) Allen Benutzern die Zugriff auf die digitale Rezeptverwaltung erhalten sollen, Rolle 'digitale-rezeptverwaltung' zuteilen
8) OIDC Umgebungsvariablen setzen

## API
### 1 Liste meiner Rezepte / Zutaten / Zwischenrezepte ansehen
```
GET /api/liste/:art

:art kann folgende Werte annehmen:
R = Rezepte
Z = Zutaten
W = Zwischenrezepte
A = Alle
```

### 2 Daten eines Rezeptes / Zutat / Zwischenrezept ansehen
```
GET /api/rezept/:id

:id ist dabei die UUID-v7 des jeweiligen Rezepts / Zutat / Zwischenrezept
Diese kann mit Punkt API-1 herausgefunden werden
```

### 3 Daten eines Rezeptes / Zutat / Zwischenrezept bearbeiten
```
POST /api/rezept
{
    id: ..., // Falls nicht vorhanden, wird eine neue generiert
    name: "Neues Rezept". // Max 60 Zeichen
    art: "R", // Möglichkeiten R | Z | W
    text: "Hier im Rezepttext können Zutaten eingebettet werden \n z.B. \n $0, $1",
    allergen: true // Standard: false
    menge: { // gesamtmenge des Rezepts / Zutat / Zwischenrezept
        g: 300,
        ml: 300,
        st: 6
    },
    naehrwerte: { // Nur bei art=Z berücksichtigt; in g pro menge.g
        kcal: 304,
        kj: 3,
        fett: 32, 
        gesfettsaeuren 2
        kohlenhydrate: 50,
        zucker: 48,
        salz: 3
    },
    lieferanten: [ // Nur bei art=Z berücksichtigt
        {
            name: "Neuer Lieferant",
            anteil: 1,
            preis: "10,00"      // In diesem Format; max 999,99,
            datum: "06.11.2025" // In diesem Format; Standard heutiges Datum
        },
        ...
    ],
    zutaten: [ // Nur bei art=R oder art=W berücksichtigt; Reihenfolge wichtig, diese werden im Rezepttext mit $0, $1, $2 referenziert.
        {
            id: ... // UUID-v7 einer Zutat; kann über API-1 herausgefunden werden,
            menge: 250,
            einheit: "g" // Möglichkeiten: KG | G | ST | ML | L
        }
    ]
}

```

### 4 Rezept / Zutat / Zwischenrezept löschen
```
DELETE /api/rezept/:id

:id ist dabei die UUID-v7 des jeweiligen Rezepts / Zutat / Zwischenrezept
Diese kann mit Punkt API-1 herausgefunden werden
```

### 5 Rezept Berechnen
```
GET /api/rezept/:id/berechnen/:typ

:id ist dabei die UUID-v7 des jeweiligen Rezepts
Diese kann mit Punkt API-1 herausgefunden werden

:typ kann folgende Werte annehmen:
zutaten          = Alle Zutaten auflisten
rezepte          = Alle Zwischenrezepte bis zu den Zutaten auflisten
preis            = Kalkulieren der einzelnen Zutaten mit Preisen der Lieferanten
naehrwertangaben = Berechnung der gesamten Nährwertangaben
```