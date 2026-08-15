# Google Sheets beállítás – Kívánságlista

Az alap kívánságlista működéséhez a Google-táblázatban hozz létre egy `Wishlist` nevű munkalapot. Az első sorba, egymás mellé másold be az alábbi fejléceket:

```text
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
>>>>>>> Stashed changes
ID	Author	Title	Original_Title	ISBN	Publisher	Publication_Date	Genre	URL	Priority	Note	Added_Date	Desired_Format	Purchase_Link	Bookline_URL	Libri_URL	Lira_URL	Alexandra_URL
```

Az alkalmazás az `ID` és `Added_Date` mezőket új könyvnél automatikusan kitölti. A `Priority` javasolt értékei: `Magas`, `Közepes`, `Alacsony`.
A négy kereskedői URL mező opcionális, de közvetlen terméklinkkel pontosabb és stabilabb az árlekérés.
<<<<<<< Updated upstream
=======
=======
ID	Author	Title	Original_Title	ISBN	Publisher	Publication_Date	Genre	URL	Priority	Note	Added_Date	Desired_Format	Purchase_Link
```

Az alkalmazás az `ID` és `Added_Date` mezőket új könyvnél automatikusan kitölti. A `Priority` javasolt értékei: `Magas`, `Közepes`, `Alacsony`.
>>>>>>> 7654f5bb8a3159357d04d2d9d70e8caaed1e181c
>>>>>>> Stashed changes

## Kereskedői ajánlatok

Az elérhetőség és az árak megjelenítéséhez hozz létre egy `WishlistOffers` nevű munkalapot ezzel a fejlécsorral:

```text
ID	Wishlist_ID	Retailer	Availability	Price	Shipping	Product_URL	Checked_At
```

- `ID`: az ajánlat egyedi azonosítója; kézi rögzítésnél tetszőleges egyedi érték.
- `Wishlist_ID`: a kapcsolódó könyv `Wishlist` lapon szereplő `ID` értéke.
- `Retailer`: például `Libri`, `Bookline`, `Líra`, `Alexandra`, `Kiadói webshop`, `Antikvárium.hu`.
- `Availability`: például `Raktáron`, `Rendelhető`, `Előrendelhető`, `Elfogyott`.
- `Price`: csak szám, például `4990`.
- `Shipping`: szöveg vagy összeg, például `1490 Ft`.
- `Product_URL`: közvetlen termékoldal.
- `Checked_At`: az ellenőrzés időpontja, például `2026-08-15 10:30`.

## Személyes kedvezmények

A kedvezményes ár számításához hozz létre egy `Discounts` nevű munkalapot ezzel a fejlécsorral:

```text
ID	Retailer	Publisher	Discount_Type	Discount_Value	Price_Base	Stackable	Min_Order	Valid_From	Valid_To	Note	Active
```

- `Retailer`: kereskedőhöz kötött kedvezménynél töltsd ki; egyébként maradhat üres.
- `Publisher`: kiadói kedvezménynél töltsd ki; egyébként maradhat üres.
- `Discount_Type`: `%` vagy `Fix`.
- `Discount_Value`: például `20` húsz százalékhoz, vagy `1000` ezer forint levonásához.
- `Price_Base`: tájékoztató mező, javasolt értéke `Online_Price`.
- `Stackable`: `x`, ha más illeszkedő kedvezménnyel összevonható.
- `Min_Order`: minimális könyvár; ha nincs ilyen feltétel, maradjon üres.
- `Valid_From`, `Valid_To`: `ÉÉÉÉ-HH-NN` formátum; üresen időkorlát nélkül érvényes.
- `Active`: `x` az aktív kedvezményhez.

<<<<<<< Updated upstream
A kereskedő és kiadó nevét minden lapon azonos írásmóddal add meg. A kívánságlista megnyitásakor az alkalmazás automatikusan lekéri a Bookline, Libri és Alexandra aktuális árait. A `WishlistOffers` lap továbbra is használható kézi ajánlatokhoz (például Líra vagy kiadói webshop); az élő találat azonos könyv és kereskedő esetén felülírja a kézi sort a megjelenítésben.
=======
<<<<<<< HEAD
A kereskedő és kiadó nevét minden lapon azonos írásmóddal add meg. A kívánságlista megnyitásakor az alkalmazás automatikusan lekéri a Bookline, Libri és Alexandra aktuális árait. A `WishlistOffers` lap továbbra is használható kézi ajánlatokhoz (például Líra vagy kiadói webshop); az élő találat azonos könyv és kereskedő esetén felülírja a kézi sort a megjelenítésben.
=======
A kereskedő és kiadó nevét minden lapon azonos írásmóddal add meg. A `WishlistOffers` és `Discounts` lap kézzel is tölthető; később az automatikus árfigyelés ugyanezeket a mezőket használhatja.
>>>>>>> 7654f5bb8a3159357d04d2d9d70e8caaed1e181c
>>>>>>> Stashed changes
