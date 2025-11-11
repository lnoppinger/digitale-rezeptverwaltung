# Mein Digitales Rezeptbuch
## API
### 1 Liste meiner Rezepte / Zutaten / Zwischenrezepte ansehen
```
GET /api/rezept/liste/:art

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