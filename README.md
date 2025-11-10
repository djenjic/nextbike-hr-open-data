# Nextbike stanice i bicikli u Zagrebu

Ovaj skup podataka prikazuje javne Nextbike stanice i bicikle u gradu Zagrebu.  
Podaci uključuju lokacije stanica, kapacitete, trenutni broj dostupnih bicikala te osnovne informacije o samim biciklima.  
Skup podataka izrađen je u sklopu kolegija **Otvoreno računarstvo** na Fakultetu elektrotehnike i računarstva Sveučilišta u Zagrebu.

---

## 🧭 Opis skupa podataka

Cilj skupa podataka je omogućiti jednostavan pregled javnih Nextbike stanica u Zagrebu te povezati bicikle s pripadajućim stanicama.  
Svaka stanica može imati više bicikala, dok svaki bicikl pripada točno jednoj stanici.

---

## 🗂️ Metapodaci

| Ključ | Vrijednost |
|-------|-------------|
| **Naziv skupa podataka** | Nextbike stanice i bicikli u Zagrebu |
| **Autor** | Domagoj Jenjić |
| **Verzija** | 1.0 |
| **Jezik** | hrvatski |
| **Format datoteka** | CSV, JSON |
| **Baza podataka** | PostgreSQL |
| **Odnos entiteta** | 1:N (jedna stanica ima više bicikala) |
| **Licenca** | Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0) |
| **Izvor podataka** | Javne informacije o sustavu Nextbike Hrvatska (https://www.nextbike.hr) |

---

## 🧱 Struktura podataka

### Tablica **stanice**
| Atribut | Opis |
|----------|------|
| `id` | Jedinstveni identifikator stanice |
| `naziv` | Naziv stanice |
| `adresa` | Lokacija stanice |
| `kapacitet` | Maksimalni broj bicikala koje stanica može primiti |
| `geo_lat` | Geografska širina |
| `geo_lon` | Geografska dužina |
| `aktivna` | Status stanice (TRUE/FALSE) |
| `datum_posljednje_aktivnosti` | Datum zadnje provjere podataka |

### Tablica **bicikli**
| Atribut | Opis |
|----------|------|
| `id` | Jedinstveni identifikator bicikla |
| `status` | Trenutno stanje bicikla (dostupan, iznajmljen, servis, itd.) |
| `tip` | Vrsta bicikla (klasični, s dječjom sjedalicom) |
| `zadnje_korištenje` | Datum posljednje vožnje |
| `stanica_id` | ID stanice kojoj bicikl trenutno pripada |

---

## 🔗 Odnos entiteta

- Svaka **stanica** može imati više **bicikala**.  
- Svaki **bicikl** pripada točno jednoj stanici.  

---

## 💾 Formati datoteka

Podaci su dostupni u dva formata:

- **`nextbike-hr.csv`** – zapis stanica i bicikala u csv formatu 
- **`nextbike-hr.json`** – zapis stanica i bicikala u json formatu  


