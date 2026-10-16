# SPARTA 1888 — Het geheim van Het Kasteel

Mobiel teamspel voor een bedrijfsuitje in Het Kasteel. Teams scannen stations, spelen vier minigames, verzamelen aanwijzingen en kraken een eindcode. De organisatie beheert ruimtes, teams, punten en de finale.

Scores, hints en puzzeloplossingen worden gecontroleerd door de lokale server. De gegevens staan in `data/store.json` op deze computer. Er is geen externe account of omgevingsvariabele nodig.

## Starten

```bash
npm install
npm test
npm run dev
```

Open daarna [http://localhost:3000](http://localhost:3000).

1. Kies **Organisator** en maak een evenement. Kies zelf een toegangscode van minstens zes tekens. Die wordt versleuteld bewaard en daarna niet meer getoond.
2. Noteer het evenement-id in het beheer. Daarmee meld je je later opnieuw aan.
3. Kopieer per team de uitnodigingslink of teamcode.
4. Open die link op de telefoon van het team, start het evenement en laat de teams de QR-codes bij de stations scannen.

De knop **Vul een oefensessie in** zet twee teamnamen en een willekeurige toegangscode klaar. Die code is niet vast in de broncode gezet.

## Camera en telefoon

QR-scannen werkt op `localhost`. Op een telefoon in hetzelfde netwerk is voor de camera meestal HTTPS nodig. Zonder camera vult een team de stationcode met de hand in. Die code staat op de QR-kaart in het beheer.

## Standaardfinale

De meegeleverde eindcode is `ROOD1888`. De aanwijzingen van de stations wijzen daarheen. Pas je de code aan, pas dan ook de aanwijzingen aan. Het dossier, de code en het geheim zijn fictie voor het spel.
