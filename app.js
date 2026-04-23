
/********** API URL **********/
const API_URL = "https://script.google.com/macros/s/AKfycbzkgbjfKuCVPjyXA4Ik02tnrUUqCvwvz2z4Nt4DTGbeUc-WqWbO4ILbMqrYaro3aGt08Q/exec";
/********** LOGIN ÁLLAPOT **********/
let currentUserEmail = null;
// ---------- VERZIÓ INFORMÁCIÓK ----------
const APP_VERSION = "2026-04-23 18:05";  // Ezt TE frissíted minden deploykor
const BUILD_TIMESTAMP = Date.now();       // automatikus, a JS fájl betöltési ideje
// -----------------------------------------

/********** OLDALVÁLTÁS **********/
function mutat(id) {
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    document.getElementById(id).style.display = "block";

    document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
    const tabBtn = document.getElementById("tab_" + id);
    if (tabBtn) tabBtn.classList.add("active");

    if (id === "lista") betoltesLista();
    if (id === "tabla") tablaMegjelenites();   // ← ÚJ SOR
}
/********** LOGIN – SEGÉDFÜGGVÉNYEK **********/

function showLoginScreen() {
    const loginDiv = document.getElementById("loginScreen");
    const pwDiv    = document.getElementById("passwordSetup");
    const appDiv   = document.getElementById("appContent");

    if (loginDiv)  loginDiv.style.display = "block";
    if (pwDiv)     pwDiv.style.display = "none";
    if (appDiv)    appDiv.style.display = "none";
    const savedEmail = localStorage.getItem("lastLoginEmail");
    if (savedEmail) {
        const emailInput = document.getElementById("loginEmail");
        if (emailInput) emailInput.value = savedEmail;
    }

        const msg = document.getElementById("loginMessage");
        if (msg) {
            msg.style.display = "none";
            msg.textContent = "";
        }
    
}

function onLoginSuccess() {
        // ↓↓↓ Böngésző jelszómentés aktiválása ↓↓↓
    try {
        document.getElementById("loginForm").dispatchEvent(
            new Event("submit", { cancelable: true })
        );
    } catch (e) {}
    // ↑↑↑ Böngésző jelszómentés aktiválása ↑↑↑
    const loginDiv = document.getElementById("loginScreen");
    const pwDiv    = document.getElementById("passwordSetup");
    const appDiv   = document.getElementById("appContent");

    if (loginDiv)  loginDiv.style.display = "none";
    if (pwDiv)     pwDiv.style.display = "none";
    if (appDiv)    appDiv.style.display = "block";
    // Szűrőmezők datalist-jének betöltése oldalbetöltéskor
    loadDropdownLists();
    // Scroll-shadow figyelés a táblázathoz
    document.addEventListener("DOMContentLoaded", () => {
        const scrollAreas = document.querySelectorAll(".table-scroll");

        scrollAreas.forEach(area => {
            function updateShadows() {
                if (area.scrollLeft <= 0) {
                    area.classList.add("scrolled-left");
                } else {
                    area.classList.remove("scrolled-left");
                }

                if (area.scrollLeft + area.clientWidth >= area.scrollWidth - 1) {
                    area.classList.add("scrolled-right");
                } else {
                    area.classList.remove("scrolled-right");
                }
            }

            area.addEventListener("scroll", updateShadows);
            updateShadows(); // inicializálás
        });
    });

    // Az eredeti alkalmazás indulása
    mutat("lista");
    // Session mentése
    localStorage.setItem("loggedInUserEmail", currentUserEmail);

}

/**
 * 1. Email ellenőrzése (checkUser)
 * 2. Ha nincs jelszó → passwordSetup
 * 3. Ha van jelszó → login(email, password)
 */
function startLogin() {

    // LOGIN GOMB VISSZAJELZÉS
    const loginButton = document.querySelector("#loginScreen button.btn-primary");
    showLoading(loginButton);

    const email = (document.getElementById("loginEmail").value || "").trim();
    const pwd   = (document.getElementById("loginPassword").value || "").trim();
    const msgEl = document.getElementById("loginMessage");

    // Legutóbbi email eltárolása
    localStorage.setItem("lastLoginEmail", email);

    if (!email) {
        if (msgEl) {
            msgEl.textContent = "Kérlek, add meg az e-mail címedet.";
            msgEl.style.display = "block";
        }
        return;
    }

    currentUserEmail = email;

    const callbackName = "checkUserCallback_" + Date.now();

    window[callbackName] = function(data) {

        hideLoading(loginButton);

        delete window[callbackName];

        if (!data || !data.exists) {
            if (msgEl) {
                msgEl.textContent = "Nincs jogosultságod belépni.";
                msgEl.style.display = "block";
            }
            return;
        }

        if (data.needsPasswordSetup) {
            // Első belépés
            showPasswordSetupScreen(email);
        } else {
            // Már van jelszó
            if (!pwd) {
                if (msgEl) {
                    msgEl.textContent = "Kérlek, add meg a jelszavadat is.";
                    msgEl.style.display = "block";
                }
                return;
            }
            loginWithPassword(email, pwd);
        }
    };

    const url = API_URL +
        "?action=checkUser" +
        "&email=" + encodeURIComponent(email) +
        "&callback=" + callbackName +
        "&_=" + Date.now();

    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}

function showPasswordSetupScreen(email) {
    const loginDiv = document.getElementById("loginScreen");
    const pwDiv    = document.getElementById("passwordSetup");
    const appDiv   = document.getElementById("appContent");

    if (loginDiv)  loginDiv.style.display = "none";
    if (pwDiv)     pwDiv.style.display = "block";
    if (appDiv)    appDiv.style.display = "none";

    const info = document.getElementById("passwordSetupEmailInfo");
    if (info) info.textContent = "E-mail cím: " + email;

    const msg = document.getElementById("passwordSetupMessage");
    if (msg) {
        msg.textContent = "";
        msg.style.display = "none";
    }

    document.getElementById("newPassword").value = "";
    document.getElementById("newPassword2").value = "";
}

function cancelPasswordSetup() {
    showLoginScreen();
}

function saveFirstPassword() {
    const pwd1 = (document.getElementById("newPassword").value || "").trim();
    const pwd2 = (document.getElementById("newPassword2").value || "").trim();
    const msg  = document.getElementById("passwordSetupMessage");

    if (!pwd1 || !pwd2) {
        msg.textContent = "Tölts ki minden mezőt.";
        msg.style.display = "block";
        return;
    }

    if (pwd1.length < 8) {
        msg.textContent = "A jelszónak legalább 8 karakter hosszúnak kell lennie.";
        msg.style.display = "block";
        return;
    }

    if (pwd1 !== pwd2) {
        msg.textContent = "A két jelszó nem egyezik.";
        msg.style.display = "block";
        return;
    }

    const callbackName = "setPasswordCallback_" + Date.now();

    window[callbackName] = function(data) {
        delete window[callbackName];

        if (!data || !data.success) {
            msg.textContent = "Nem sikerült a jelszó mentése.";
            msg.style.display = "block";
            return;
        }

        // Siker → automatikus login
        loginWithPassword(currentUserEmail, pwd1);
    };

    const url = API_URL +
        "?action=setPassword" +
        "&email=" + encodeURIComponent(currentUserEmail) +
        "&password=" + encodeURIComponent(pwd1) +
        "&callback=" + callbackName +
        "&_=" + Date.now();

    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}

function loginWithPassword(email, password) {
    const msgLogin = document.getElementById("loginMessage");
    const msgPw    = document.getElementById("passwordSetupMessage");

    const callbackName = "loginCallback_" + Date.now();

    window[callbackName] = function(data) {
        delete window[callbackName];

        if (data && data.success) {
            onLoginSuccess();
        } else {
            const err = (data && data.error) ? data.error : "Hibás e-mail vagy jelszó.";

            if (document.getElementById("passwordSetup").style.display === "block") {
                msgPw.textContent = err;
                msgPw.style.display = "block";
            } else {
                msgLogin.textContent = err;
                msgLogin.style.display = "block";
            }
        }
    };

    const url = API_URL +
        "?action=login" +
        "&email=" + encodeURIComponent(email) +
        "&password=" + encodeURIComponent(password) +
        "&callback=" + callbackName +
        "&_=" + Date.now();

    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}
/********** LOADING VISSZAJELZÉS **********/

function showLoading(btn) {
    if (btn) {
        btn.dataset.originalText = btn.innerText;
        btn.innerText = "Betöltés…";
        btn.disabled = true;
    }
    document.body.style.cursor = "wait";
}

function hideLoading(btn) {
    if (btn && btn.dataset.originalText) {
        btn.innerText = btn.dataset.originalText;
        btn.disabled = false;
    }
    document.body.style.cursor = "default";
}

function logout() {
    // Bejelentkezési adatok törlése
    localStorage.removeItem("loggedInUserEmail");

    // Email mezőt is töröljük a biztonság kedvéért
    const emailInput = document.getElementById("loginEmail");
    if (emailInput) emailInput.value = "";

    // Visszatérés a login képernyőre
    showLoginScreen();
}

/********** LOG **********/
function log(msg) {
    const l = document.getElementById("log");
    const now = new Date().toLocaleTimeString();
    l.innerHTML += "[" + now + "] " + msg + "<br>";
    l.scrollTop = l.scrollHeight;
}
/********** DRIVE LINK ÁTALAKÍTÁS **********/
function convertDriveUrl(url) {
    if (!url) return "";

    // 1) Ha a link eleve működő Drive formátum (file/d/.../view), NE konvertáljuk!
    if (url.includes("drive.google.com/file/d/")) {
        return url;
    }

    // 2) Ha már uc?export=view formában van, NE konvertáljuk!
    if (url.includes("uc?export=view")) {
        return url;
    }

    // 3) Minden más esetben kinyerjük az ID-t
    let id = "";

    // /file/d/<id>/view
    const fileMatch = url.match(/\/file\/d\/([^\/\?]+)\//);
    if (fileMatch) id = fileMatch[1];

    // open?id=<id>
    const openMatch = url.match(/open\?id=([^&]+)/);
    if (openMatch) id = openMatch[1];

    // id=<id>
    const ucMatch = url.match(/id=([^&]+)/);
    if (!id && ucMatch) id = ucMatch[1];

    // 4) Ha nincs ID, visszaadjuk eredetileg
    if (!id) return url;

    // 5) Ha van ID, megpróbáljuk UC linket építeni
    return `https://drive.google.com/uc?export=view&id=${id}`;
}



/********** PRICE FORMAT **********/
function formatPrice(value) {
    if (value === undefined || value === null) return "";
    
    let cleaned = value.toString().trim();
    if (cleaned === "") return "";

    // Minden szóköz, pont, vessző normalizálása
    cleaned = cleaned.replace(/\s/g, "");     // összes whitespace ki
    cleaned = cleaned.replace(",", ".");      // vessző → pont

    // Szétválasztjuk az egész és a tizedes részt
    let [intPart, decPart] = cleaned.split(".");

    // Csak számjegyeket hagyunk az egész részben
    intPart = (intPart || "").replace(/\D/g, "");

    if (!intPart) return value + " Ft";  // ha még így sem értelmezhető

    // EZRES TAGOLÁS: 1234567 → 1 234 567
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    let formatted = intPart;

    // Ha volt tizedes rész, magyar formátummal (vesszővel) visszatesszük
    if (decPart && decPart.length > 0) {
        formatted += "," + decPart;
    }

    return formatted + " Ft";
}

/********** DATALIST TÖLTÉS BACKENDBŐL **********/
function loadDropdownLists() {
    const url = API_URL +
        "?action=getUniqueLists" +
        "&callback=dropdownListsCallback&_=" + Date.now();

    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}

function dropdownListsCallback(data) {
    fillDatalist(document.getElementById("authors_list_modal"), data.authors, "Author");
    fillDatalist(document.getElementById("series_list_modal"), data.series, "Series");

    // Szűrőmezők datalist feltöltése
    fillDatalist(document.getElementById("authors_list_filter"), data.authors, "Author");
    fillDatalist(document.getElementById("series_list_filter"), data.series, "Series");
        // Táblázatos nézet datalist-jei
    fillDatalist(document.getElementById("authors_list_filter_tabla"), data.authors, "Author");
    fillDatalist(document.getElementById("series_list_filter_tabla"), data.series, "Series");
    // fuzzy keresés modal mezőkben
    enableFuzzyDatalist("bm_szerzo", "authors_list_modal");
    enableFuzzyDatalist("bm_sorozat", "series_list_modal");

    // pulse animáció
    document.getElementById("bm_szerzo").classList.add("pulse");
    document.getElementById("bm_sorozat").classList.add("pulse");

    setTimeout(() => {
        document.getElementById("bm_szerzo").classList.remove("pulse");
        document.getElementById("bm_sorozat").classList.remove("pulse");
    }, 700);

    // 🔥 Fuzzy keresés a SZŰRŐ mezőkre
    enableFuzzyDatalist("ls_szerzo", "authors_list_filter");
    enableFuzzyDatalist("ls_sorozat", "series_list_filter");

    // ÚJ: táblázatos nézet fuzzy támogatás
    enableFuzzyDatalist("ts_szerzo", "authors_list_filter_tabla");
    enableFuzzyDatalist("ts_sorozat", "series_list_filter_tabla");

}


function fillDatalist(dl, list, key) {
    dl.innerHTML = "";

    // Értékek kigyűjtése
    let values = (list || [])
        .map(item => item[key])
        .filter(v => v && v.trim() !== "");

    // Duplikátumok eltávolítása
    values = [...new Set(values)];

    // ABC sorrend ékezethelyesen (magyar szabályok)
    values.sort((a, b) =>
        a.localeCompare(b, "hu", { sensitivity: "accent" })
    );

    // Datalist feltöltése
    values.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        dl.appendChild(opt);
    });
}

/********** MODAL – közös űrlap **********/
let modalMode = "new";      // "new" vagy "edit"
let modalPending = null;    // { bookData, manualUrl }
let lastLookupResults = [];

function openBookModal(mode, id) {
    setTimeout(loadDropdownLists, 50);
    modalMode = mode || "new";
    modalPending = null;
    
    if (modalMode === "new") {
        document.getElementById("modalTitle").textContent = "Új könyv felvétele";
        document.getElementById("bm_id").value = "";
        document.getElementById("bm_szerzo").value = "";
        document.getElementById("bm_cim").value = "";
        document.getElementById("bm_eredeti").value = "";
        document.getElementById("bm_korabbi").value = "";
        document.getElementById("bm_sorozat").value = "";
        document.getElementById("bm_ssz").value = "";
document.getElementById("bm_ev").value = "";
document.getElementById("bm_helyszin").value = "";
document.getElementById("bm_polc").value = "";
document.getElementById("bm_oldalszam").value = "";
document.getElementById("bm_isbn").value = "";
document.getElementById("bm_kiado").value = "";
document.getElementById("bm_fordito").value = "";
document.getElementById("bm_mufaj").value = "";
document.getElementById("bm_url").value = "";
document.getElementById("bm_purchased").checked = false;
document.getElementById("bm_forsale").checked = false;
document.getElementById("bm_ar").value = "";
document.getElementById("bm_megjegy").value = "";


        const img = document.getElementById("bm_preview");
        img.style.display = "none";
        img.src = "";
    } else {
        document.getElementById("modalTitle").textContent = "Könyv szerkesztése";

        const item = lista.find(x => x["ID"] === id);
        if (!item) {
            alert("A rekord nem található.");
            return;
        }

        document.getElementById("bm_id").value = item["ID"] || "";
        document.getElementById("bm_szerzo").value   = item["Author"] || "";
        document.getElementById("bm_cim").value      = item["Title"] || "";
        document.getElementById("bm_eredeti").value  = item["Original_Title"] || "";
        document.getElementById("bm_korabbi").value  = item["Previous_Title"] || "";
        document.getElementById("bm_sorozat").value  = item["Series"] || "";
        document.getElementById("bm_ssz").value      = item["Number"] || "";
document.getElementById("bm_ev").value       = item["Year"] || "";
document.getElementById("bm_helyszin").value = item["Location"] || "";
document.getElementById("bm_polc").value     = item["Shelf"] || "";
document.getElementById("bm_oldalszam").value = item["Page_Count"] || "";
document.getElementById("bm_isbn").value     = item["ISBN"] || "";
document.getElementById("bm_kiado").value    = item["Publisher"] || "";
document.getElementById("bm_fordito").value  = item["Translator"] || "";
document.getElementById("bm_mufaj").value    = item["Genre"] || "";
document.getElementById("bm_url").value = item["URL"] || "";
document.getElementById("bm_purchased").checked = (item["Purchased"] === "x");
document.getElementById("bm_forsale").checked   = (item["For_sale"] === "x");
document.getElementById("bm_ar").value      = item["Price"] || "";
document.getElementById("bm_megjegy").value = item["Comment"] || "";

        const img = document.getElementById("bm_preview");
        if (item["URL"]) {
            img.src = item["URL"];
            img.style.display = "block";
        }
        else {
            img.style.display = "none";
            img.src = "";
        }
    }

    document.getElementById("bookModal").style.display = "flex";
    urlPreviewUpdate();

}

function closeBookModal() {
    document.getElementById("bookModal").style.display = "none";
}
function lookupBookMetadataFromModal() {
    const isbn = (document.getElementById("bm_isbn").value || "").trim();
    const title = (document.getElementById("bm_cim").value || "").trim();
    const author = (document.getElementById("bm_szerzo").value || "").trim();

    if (!isbn && !title && !author) {
        alert("Adj meg legalább ISBN-t vagy címet/szerzőt a kereséshez.");
        return;
    }

    const lookupButton = document.getElementById("bm_lookup_btn");
    showLoading(lookupButton);

    const callbackName = "lookupBookMetadataCallback_" + Date.now();

    window[callbackName] = function(data) {
        hideLoading(lookupButton);
        delete window[callbackName];

        if (!data || !data.success) {
            alert((data && data.error) ? data.error : "Nem sikerült lekérdezni a könyvadatokat.");
            log("Lookup hiba: " + JSON.stringify(data || {}));
            return;
        }

        lastLookupResults = Array.isArray(data.items) ? data.items : [];

        if (lastLookupResults.length === 0) {
            const debugText = data.debug
                ? "\n\nDebug:\n" + JSON.stringify(data.debug, null, 2)
                : "";
            alert("Nem érkezett találat." + debugText);
            log("Lookup sikeres, de nincs találat. Debug: " + JSON.stringify(data.debug || {}));
            return;
        }

        const previewText = lastLookupResults
            .slice(0, 5)
            .map((item, index) => {
                const titleText = item.title || "Nincs cím";
                const authorText = item.authors || "Nincs szerző";
                const yearText = item.year ? " (" + item.year + ")" : "";
                const sourceText = item.source ? " [" + item.source + "]" : "";
                return (index + 1) + ". " + titleText + " – " + authorText + yearText + sourceText;
            })
            .join("\n");

        alert("Találatok:\n\n" + previewText);
        log("Könyv metaadat lookup kész. Találatok száma: " + lastLookupResults.length);
    };

    const url = API_URL +
        "?action=lookupBookMetadata" +
        "&isbn=" + encodeURIComponent(isbn) +
        "&title=" + encodeURIComponent(title) +
        "&author=" + encodeURIComponent(author) +
        "&callback=" + callbackName +
        "&_=" + Date.now();

    const s = document.createElement("script");
    s.src = url;

    s.onerror = function() {
        hideLoading(lookupButton);
        delete window[callbackName];
        alert("A lookup kérés nem töltődött be. Ellenőrizd a deployolt Apps Script URL-t és a friss deployt.");
        log("Lookup script betöltési hiba: " + url);
    };

    document.body.appendChild(s);
}
/********** MODAL – mentés logika **********/
function saveBookFromModal() {
    log("Könyv mentése modalból...");

    const szerzo = document.getElementById("bm_szerzo").value.trim();
    const cim    = document.getElementById("bm_cim").value.trim();

    if (!szerzo || !cim) {
        alert("A Szerző és a Cím mező kitöltése kötelező.");
        return;
    }

const bookData = {
    Author:         szerzo,
    Title:          document.getElementById("bm_cim").value.trim(),
    Original_Title: document.getElementById("bm_eredeti").value.trim(),
    Previous_Title: document.getElementById("bm_korabbi").value.trim(),
    Series:         document.getElementById("bm_sorozat").value.trim(),
    Number:         document.getElementById("bm_ssz").value.trim(),
    Year:           document.getElementById("bm_ev").value.trim(),
    Location:       document.getElementById("bm_helyszin").value.trim(),
    Shelf:          document.getElementById("bm_polc").value.trim(),
    Page_Count:     document.getElementById("bm_oldalszam").value.trim(),
    ISBN:           document.getElementById("bm_isbn").value.trim(),
    Publisher:      document.getElementById("bm_kiado").value.trim(),
    Translator:     document.getElementById("bm_fordito").value.trim(),
    Genre:          document.getElementById("bm_mufaj").value.trim(),
    Purchased:      document.getElementById("bm_purchased").checked ? "x" : "",
    For_sale:       document.getElementById("bm_forsale").checked ? "x" : "",
    Price:          document.getElementById("bm_ar").value.trim(),
    Comment:        document.getElementById("bm_megjegy").value.trim()
};

    const manualUrl = document.getElementById("bm_url").value.trim();
    modalPending = { bookData, manualUrl };

    // Mindig csak az URL-t használjuk, fájlfeltöltés NINCS
    finalizeSaveBook(manualUrl);
}

function finalizeSaveBook(kepUrl) {
    kepUrl = convertDriveUrl(kepUrl);
    if (!modalPending) return;

    const d = modalPending.bookData;
    const id = document.getElementById("bm_id").value;

    // URL mező beírása
    d.URL = kepUrl;

    // előnézeti kép frissítése
    const img = document.getElementById("bm_preview");
    if (kepUrl) {
        img.src = convertDriveUrl(kepUrl);
        img.style.display = "block";
    } else {
        img.style.display = "none";
        img.src = "";
    }


    if (modalMode === "new") {
        // Új könyv
const url = API_URL +
    "?action=addBookOnly" +
    "&szerzo="       + encodeURIComponent(d.Author) +
    "&cim="          + encodeURIComponent(d.Title) +
    "&eredeti_cim="  + encodeURIComponent(d.Original_Title) +
    "&korabbi_cim="  + encodeURIComponent(d.Previous_Title) +
    "&sorozat="      + encodeURIComponent(d.Series) +
    "&ssz="          + encodeURIComponent(d.Number) +
    "&url="          + encodeURIComponent(kepUrl) +
    "&ev="           + encodeURIComponent(d.Year) +
    "&helyszin="     + encodeURIComponent(d.Location) +
    "&polc="         + encodeURIComponent(d.Shelf) +
    "&oldalszam="    + encodeURIComponent(d.Page_Count) +
    "&isbn="         + encodeURIComponent(d.ISBN) +
    "&kiado="        + encodeURIComponent(d.Publisher) +
    "&fordito="      + encodeURIComponent(d.Translator) +
    "&mufaj="        + encodeURIComponent(d.Genre) +
    "&megv="         + encodeURIComponent(d.Purchased) +
    "&elado="        + encodeURIComponent(d.For_sale) +
    "&ar="           + encodeURIComponent(d.Price) +
    "&megjegy="      + encodeURIComponent(d.Comment) +
    "&callback=modalAddBookValasz";

        const s = document.createElement("script");
        s.src = url;
        document.body.appendChild(s);
    } else {
        // Szerkesztés
const url = API_URL +
    "?action=updateLista" +
    "&ID="           + encodeURIComponent(id) +
    "&szerzo="       + encodeURIComponent(d.Author) +
    "&cim="          + encodeURIComponent(d.Title) +
    "&eredeti_cim="  + encodeURIComponent(d.Original_Title) +
    "&korabbi_cim="  + encodeURIComponent(d.Previous_Title) +
    "&sorozat="      + encodeURIComponent(d.Series) +
    "&ssz="          + encodeURIComponent(d.Number) +
    "&url="          + encodeURIComponent(kepUrl) +
    "&ev="           + encodeURIComponent(d.Year) +
    "&helyszin="     + encodeURIComponent(d.Location) +
    "&polc="         + encodeURIComponent(d.Shelf) +
    "&oldalszam="    + encodeURIComponent(d.Page_Count) +
    "&isbn="         + encodeURIComponent(d.ISBN) +
    "&kiado="        + encodeURIComponent(d.Publisher) +
    "&fordito="      + encodeURIComponent(d.Translator) +
    "&mufaj="        + encodeURIComponent(d.Genre) +
    "&megv="         + encodeURIComponent(d.Purchased) +
    "&elado="        + encodeURIComponent(d.For_sale) +
    "&ar="           + encodeURIComponent(d.Price) +
    "&megjegy="      + encodeURIComponent(d.Comment) +
    "&callback=modalUpdateBookValasz";

        const s = document.createElement("script");
        s.src = url;
        document.body.appendChild(s);
    }
}

function modalAddBookValasz(data) {
    if (data && data.success) {
        log("✔ Új könyv elmentve (modal)");
        alert("Könyv sikeresen rögzítve.");
        closeBookModal();
        betoltesLista();
    } else if (data && data.error && data.error.indexOf("Duplikált") !== -1) {
        let msg = "Ez a könyv már szerepel a listában.";
        if (data.duplicate) {
            const d = data.duplicate;
            msg += "\n\nLétező rekord:\n" +
                   (d.Author || "") + " – " +
                   (d.Title || "") +
                   (d.Year ? " (" + d.Year + ")" : "");
        }
        alert(msg);
        log("❌ Duplikált rekord (modal új könyv).");
    } else {
        alert("Hiba történt mentés közben.");
        log("❌ Hiba (modal új könyv): " + (data && data.error ? data.error : "Ismeretlen hiba"));
    }
}

function modalUpdateBookValasz(data) {
    if (data && data.success) {
        log("✔ Rekord frissítve (modal)");
        alert("Rekord sikeresen frissítve.");
        closeBookModal();
        betoltesLista();
    } else {
        alert("Hiba történt mentés közben!");
        log("❌ Hiba (modal szerkesztés): " + (data && data.error ? data.error : "Ismeretlen hiba"));
    }
}

/********** FUZZY DATALIST SZŰRÉS **********/
function enableFuzzyDatalist(inputId, datalistId) {
    const input = document.getElementById(inputId);
    const dl = document.getElementById(datalistId);

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase();
        const options = [...dl.options];

        options.forEach(opt => {
            const text = opt.value.toLowerCase();

            const normalize = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const match =
                text.includes(query) ||
                normalize(text).includes(normalize(query));

            opt.style.display = match ? "block" : "none";
        });
    });
}

/********** ÉV MEZŐ VALIDÁCIÓ **********
 * csak 1–9999 közötti egész évszámot enged
 ****************************************/
function validateYearFilter(input) {
    let v = input.value;

    // csak számjegyeket engedünk
    if (!/^\d*$/.test(v)) {
        input.value = "";
        return;
    }

    v = parseInt(v, 10);

    if (isNaN(v)) {
        input.value = "";
        return;
    }

    if (v < 1) v = 1;
    if (v > 9999) v = 9999;

    input.value = v;
}

/********** LISTA **********/
let lista = [];
// Pagináció
let currentPage = 1;
let limit = Infinity;      // "Összes" induláskor
let filteredList = [];

function betoltesLista() {
    const url = API_URL + "?action=getLista&callback=listaValasz&_=" + Date.now();
    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}

function listaValasz(data) {

    if (!data || !Array.isArray(data.items)) {
        log("Hiba: A backend hibás adatot küldött:", data);
        lista = [];
        listaMegjelenites();
        return;
    }

    // MINDEN BEJÖVŐ MEZŐT STRINGGÉ ALAKÍTUNK
    lista = data.items.map(item => {
        const norm = {};
        for (const key in item) {
            // null / undefined → ""
            // minden más → String()
            norm[key] = (item[key] === null || item[key] === undefined)
                ? ""
                : String(item[key]);
        }
        return norm;
    });

    listaMegjelenites();
}


let currentSort = { field: "Author", dir: "asc" };

function setSort(field) {
    if (currentSort.field === field) {
        currentSort.dir = currentSort.dir === "asc" ? "desc" : "asc";
    } else {
        currentSort.field = field;
        currentSort.dir = "asc";
    }
    listaMegjelenites();
}

function listaMegjelenites() {

    const fszerzo = (document.getElementById("ls_szerzo").value || "").toLowerCase();
    const fcim    = (document.getElementById("ls_cim").value || "").toLowerCase();
    const fseries = (document.getElementById("ls_sorozat").value || "").toLowerCase();
    const minYear = parseInt(document.getElementById("ls_ev_min").value || "", 10);
    const maxYear = parseInt(document.getElementById("ls_ev_max").value || "", 10);

    // --- Lista szűrése a kártyás nézethez ---
    let filtered = lista.filter(item => {
        const author = String(item["Author"] || "").toLowerCase();
        const title  = String(item["Title"]  || "").toLowerCase();
        const series = String(item["Series"] || "").toLowerCase();
        const year   = parseInt(item["Year"] || "", 10);
        const purchased = item["Purchased"] || "";

        if (fszerzo && !author.includes(fszerzo)) return false;
        if (fcim && !title.includes(fcim)) return false;
        if (fseries && !series.includes(fseries)) return false;

        if (!isNaN(minYear)) {
            if (isNaN(year) || year < minYear) return false;
        }
        if (!isNaN(maxYear)) {
            if (isNaN(year) || year > maxYear) return false;
        }

// Vásárlási státusz szűrés
// Megvásárolva tri-state szűrés
if (purchaseFilterState === 1 && purchased !== "x") return false; // csak megvásárolt
if (purchaseFilterState === 2 && purchased === "x") return false; // csak nincs meg

// ELADÓ (For_sale) háromállapotú szűrés
const fsale = item["For_sale"] || "";

if (saleFilterState === 1 && fsale !== "x") return false;   // csak eladó
if (saleFilterState === 2 && fsale === "x") return false;   // csak nem eladó

        return true;
    });
// Találatok számának kiírása (szűrt / összes)
document.getElementById("itemCount").textContent =
    "Találatok: " + filtered.length + " / " + lista.length;


    // Rendezés (ugyanúgy, mint eddig)
    filtered.sort((a, b) => {
        const f = currentSort.field;
        let av = a[f] || "";
        let bv = b[f] || "";

        if (f === "Year" || f === "Number" || f === "Price" || f === "Page_Count") {
            av = parseFloat(av); if (isNaN(av)) av = 0;
            bv = parseFloat(bv); if (isNaN(bv)) bv = 0;
        } else if (f === "Purchased" || f === "For_sale") {
            av = av === "x" ? 1 : 0;
            bv = bv === "x" ? 1 : 0;
        } else {
            av = String(av).toLowerCase();
            bv = String(bv).toLowerCase();
        }

        if (av < bv) return currentSort.dir === "asc" ? -1 : 1;
        if (av > bv) return currentSort.dir === "asc" ? 1 : -1;
        return 0;
    });

    // Paginációs alap
    filteredList = filtered;
    let pageItems = [];
    const pageInfoEl = document.getElementById("pageInfo");

    if (!Number.isFinite(limit)) {
        // Összes
        currentPage = 1;
        pageItems = filteredList;
        if (pageInfoEl) pageInfoEl.textContent = "1 / 1";
    } else {
        const totalPages = Math.max(1, Math.ceil(filteredList.length / limit));
        if (currentPage > totalPages) currentPage = totalPages;

        const start = (currentPage - 1) * limit;
        const end   = start + limit;

        pageItems = filteredList.slice(start, end);

        if (pageInfoEl) {
            pageInfoEl.textContent = currentPage + " / " + totalPages;
        }
    }

    // Statisztikák (teljes lista alapján)
    const total = lista.length;
    const purchasedCount = lista.filter(i => i["Purchased"] === "x").length;
    const missingCount = total - purchasedCount;
    document.getElementById("stat_total").textContent = total;
    document.getElementById("stat_purchased").textContent = purchasedCount;
    document.getElementById("stat_missing").textContent = missingCount;

    // --- KÁRTYÁS NÉZET RENDERELÉSE ---
    const cardContainer = document.getElementById("cardContainer");
    if (cardContainer) {
        cardContainer.innerHTML = "";

        let startIndex = Number.isFinite(limit)
            ? (currentPage - 1) * limit
            : 0;

        pageItems.forEach((item) => {
            const card = document.createElement("div");
            card.className = "book-card";
            card.innerHTML = `
                ${item["URL"] ? `
                    <div class="card-image-wrapper">
                        <img src="${item["URL"]}" alt="Borító" class="card-image">
                    </div>
                ` : ""}

                <div class="card-row">
                    <span class="label">Szerző:</span>
                    <span class="value">${item["Author"] || ""}</span>
                </div>


                <div class="card-row">
                    <span class="label">Cím:</span>
                    <span class="value">${item["Title"] || ""}</span>
                </div>

                <div class="card-row">
                    <span class="label">Sorozat:</span>
                    <span class="value">${item["Series"] || ""}</span>
                </div>

                <div class="card-row">
                    <span class="label">Év:</span>
                    <span class="value">${item["Year"] || ""}</span>
                </div>
                <div class="card-row">
    <span class="label">Helyszín:</span>
    <span class="value">${item["Location"] || ""}</span>
</div>

<div class="card-row">
    <span class="label">Polc:</span>
    <span class="value">${item["Shelf"] || ""}</span>
</div>

<div class="card-row">
    <span class="label">Oldalszám:</span>
    <span class="value">${item["Page_Count"] || ""}</span>
</div>

<div class="card-row">
    <span class="label">ISBN:</span>
    <span class="value">${item["ISBN"] || ""}</span>
</div>

<div class="card-row">
    <span class="label">Kiadó:</span>
    <span class="value">${item["Publisher"] || ""}</span>
</div>

<div class="card-row">
    <span class="label">Fordító:</span>
    <span class="value">${item["Translator"] || ""}</span>
</div>

<div class="card-row">
    <span class="label">Műfaj:</span>
    <span class="value">${item["Genre"] || ""}</span>
</div>
                <div class="card-row">
                    <span class="label">Megvásárolva:</span>
                    <span class="value">
                        <input
                            type="checkbox"
                            disabled
                            ${item["Purchased"] === "x" ? "checked" : ""}
                        >
                    </span>
                </div>

                <div class="card-row">
                    <span class="label">Eladó:</span>
                    <span class="value">
                        <input
                            type="checkbox"
                            disabled
                            ${item["For_sale"] === "x" ? "checked" : ""}
                        >
                    </span>
                </div>
                <div class="card-row">
                    <span class="label">Ár:</span>
                    <span class="value">${formatPrice(item["Price"] || "")}</span>
                </div>


                <div class="card-actions">
                    <button class="btn btn-secondary" onclick="editRecord('${item["ID"]}')">✏️ Szerkeszt</button>
                    <button class="btn btn-danger" onclick="deleteRecord('${item["ID"]}')">🗑️ Törlés</button>
                </div>
            `;

            cardContainer.appendChild(card);
        });
    }
}
;
 
  // ITT A HELYE A KÁRTYA-NÉZETNEK

function clearListaFilters() {
    document.getElementById("ls_szerzo").value = "";
    document.getElementById("ls_cim").value = "";
    document.getElementById("ls_sorozat").value = "";
    document.getElementById("ls_ev_min").value = "";
    document.getElementById("ls_ev_max").value = "";

    currentPage = 1;   
    listaMegjelenites();
}


function listaSzures() {
    currentPage = 1;
    listaMegjelenites();
}


/********** SZERKESZTÉS – most már MODAL **********/
function editRecord(id) {
    openBookModal("edit", id);
}

/********** TÖRLÉS **********/
function deleteRecord(id) {
    if (!confirm("Biztosan törlöd ezt a rekordot?")) return;

    const url = API_URL +
        "?action=deleteLista" +
        "&ID=" + encodeURIComponent(id) +
        "&callback=deleteRecordValasz";

    const s = document.createElement("script");
    s.src = url;
    document.body.appendChild(s);
}

function deleteRecordValasz(data) {
    if (data && data.success) {
        log("✔ Rekord törölve");
        alert("A rekord sikeresen törölve!");
        betoltesLista();
    } else {
        log("❌ Törlés hiba: " + (data && data.error ? data.error : "Ismeretlen hiba"));
        alert("Nem sikerült törölni a rekordot.");
    }
}

/********** CSV/TSV IMPORT **********/
function importCsv() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    let duplicateRows = [];

    if (!file) {
        alert("Válassz ki egy CSV/TSV fájlt!");
        return;
    }

    log("CSV/TSV import indítása...");
    document.getElementById("importResult").innerHTML = "Import indul...";

    const reader = new FileReader();

    reader.onload = function(e) {
        const text = e.target.result;

        let delimiter = ",";
        if (text.indexOf("\t") !== -1) delimiter = "\t";
        else if (text.indexOf(";") !== -1) delimiter = ";";

        function parseLine(line) {
            const result = [];
            let current = "";
            let insideQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const c = line[i];
                if (c === '"') {
                    insideQuotes = !insideQuotes;
                } else if (c === delimiter && !insideQuotes) {
                    result.push(current);
                    current = "";
                } else {
                    current += c;
                }
            }
            result.push(current);
            return result;
        }

        const rows = text.split(/\r?\n/).filter(r => r.trim() !== "");
        if (rows.length < 2) {
            document.getElementById("importResult").innerHTML = "Nincs importálható sor.";
            log("Import megszakítva: nincs adat.");
            return;
        }

        const header = parseLine(rows[0]).map(h => h.trim());
const expected = ["ID","Author","Title","Original_Title","Previous_Title","Series","Number","URL","Year","Location","Shelf","Page_Count","ISBN","Publisher","Translator","Genre","Purchased","For_sale","Price","Comment"];
        let headerOk = (header.length === expected.length);
        if (headerOk) {
            for (let i = 0; i < expected.length; i++) {
                if (header[i] !== expected[i]) {
                    headerOk = false;
                    break;
                }
            }
        }

        if (!headerOk) {
            const msg = "HIBA: A CSV/TSV fejléc nem egyezik a List fül szerkezetével!<br>" +
                        "Elvárt fejléc:<br>" +
                        expected.join(", ");
            document.getElementById("importResult").innerHTML = msg;
            log("Import leállt: hibás fejléc.");
            return;
        }

const idxAuthor         = header.indexOf("Author");
const idxTitle          = header.indexOf("Title");
const idxOriginal_Title = header.indexOf("Original_Title");
const idxPrevious_Title = header.indexOf("Previous_Title");
const idxSeries         = header.indexOf("Series");
const idxNumber         = header.indexOf("Number");
const idxURL            = header.indexOf("URL");
const idxYear           = header.indexOf("Year");
const idxLocation       = header.indexOf("Location");
const idxShelf          = header.indexOf("Shelf");
const idxPageCount      = header.indexOf("Page_Count");
const idxISBN           = header.indexOf("ISBN");
const idxPublisher      = header.indexOf("Publisher");
const idxTranslator     = header.indexOf("Translator");
const idxGenre          = header.indexOf("Genre");
const idxForSale        = header.indexOf("For_sale");
const idxPurchased      = header.indexOf("Purchased");
const idxPrice          = header.indexOf("Price");
const idxComment        = header.indexOf("Comment");
 
        let imported = 0;
        const resDiv = document.getElementById("importResult");
        resDiv.innerHTML = "";

        function sendNext(i) {
            if (i >= rows.length) {
                const summary = "✔ Import kész. Összesen " + imported + " sor beszúrva.";
                resDiv.innerHTML += "<br><b>" + summary + "</b>";
                log(summary);

                if (duplicateRows.length > 0) {
                    resDiv.innerHTML += "<br><h4>Kihagyott (duplikált) sorok:</h4>";
                    duplicateRows.forEach((d, idx) => {
                        resDiv.innerHTML +=
                            (idx+1) + ". " +
                            "'" + d.Author + "' – '" + d.Title + "'" +
                            (d.Original_Title ? " (" + d.Original_Title + ")" : "") +
                            (d.Year ? ", " + d.Year : "") +
                            "<br>";
                    });
                }
                return;
            }

            const line = rows[i];
            const cols = parseLine(line);

            if (cols.every(c => c.trim() === "")) {
                sendNext(i + 1);
                return;
            }

const book = {
    Author:         (cols[idxAuthor]         || "").trim(),
    Title:          (cols[idxTitle]          || "").trim(),
    Original_Title: (cols[idxOriginal_Title] || "").trim(),
    Previous_Title: (cols[idxPrevious_Title] || "").trim(),
    Series:         (cols[idxSeries]         || "").trim(),
    Number:         (cols[idxNumber]         || "").trim(),
    URL:            (cols[idxURL]            || "").trim(),
    Year:           (cols[idxYear]           || "").trim(),
    Location:       (cols[idxLocation]       || "").trim(),
    Shelf:          (cols[idxShelf]          || "").trim(),
    Page_Count:     (cols[idxPageCount]      || "").trim(),
    ISBN:           (cols[idxISBN]           || "").trim(),
    Publisher:      (cols[idxPublisher]      || "").trim(),
    Translator:     (cols[idxTranslator]     || "").trim(),
    Genre:          (cols[idxGenre]          || "").trim(),
    Purchased:      (cols[idxPurchased]      || "").trim(),
    For_sale:       (cols[idxForSale]        || "").trim(),
    Price:          (cols[idxPrice]          || "").trim(),
    Comment:        (cols[idxComment]        || "").trim()
};
            log("DEBUG IMPORT: " + JSON.stringify(book));

            const callbackName = "importCsvCallback_" + i;
            window[callbackName] = function(data) {
                if (data && data.success) {
                    imported++;
                    const b = data.inserted || book;

                    const lineMsg =
                        "✔ Sor betöltve: Author='" + (b.Author || "") +
                        "', Title='" + (b.Title || "") +
                        "', Series='" + (b.Series || "") +
                        "', Year='" + (b.Year || "") + "'";

                    resDiv.innerHTML += lineMsg + "<br>";
                    log(lineMsg);

                } else if (data && data.error &&
                           data.error.indexOf("Duplikált rekord") !== -1) {

                    const warn =
                        "❌ Duplikáció (" + i + "): A könyv már szerepel → kihagyva.";

                    resDiv.innerHTML += warn + "<br>";
                    log(warn);

                    duplicateRows.push(book);

                } else {
                    const errMsg =
                        "❌ Sor hiba (" + i + "): " +
                        (data && data.error ? data.error : "ismeretlen hiba");

                    resDiv.innerHTML += errMsg + "<br>";
                    log(errMsg);
                }

                delete window[callbackName];
                sendNext(i + 1);
            };

const url = API_URL +
    "?action=importCsvRow" +
    "&Author="         + encodeURIComponent(book.Author) +
    "&Title="          + encodeURIComponent(book.Title) +
    "&Original_Title=" + encodeURIComponent(book.Original_Title) +
    "&Previous_Title=" + encodeURIComponent(book.Previous_Title) +
    "&Series="         + encodeURIComponent(book.Series) +
    "&Number="         + encodeURIComponent(book.Number) +
    "&URL="            + encodeURIComponent(book.URL) +
    "&Year="           + encodeURIComponent(book.Year) +
    "&Location="       + encodeURIComponent(book.Location) +
    "&Shelf="          + encodeURIComponent(book.Shelf) +
    "&Page_Count="     + encodeURIComponent(book.Page_Count) +
    "&ISBN="           + encodeURIComponent(book.ISBN) +
    "&Publisher="      + encodeURIComponent(book.Publisher) +
    "&Translator="     + encodeURIComponent(book.Translator) +
    "&Genre="          + encodeURIComponent(book.Genre) +
    "&For_sale="       + encodeURIComponent(book.For_sale) +
    "&Purchased="      + encodeURIComponent(book.Purchased) +
    "&Price="          + encodeURIComponent(book.Price) +
    "&Comment="        + encodeURIComponent(book.Comment) +
    "&callback="       + callbackName;

            const s = document.createElement("script");
            s.src = url;
            document.body.appendChild(s);
        }

        sendNext(1);
    };

    reader.readAsText(file);
}
function changeLimit() {
    const val = document.getElementById("limitSelect").value;

    if (val === "all") {
        limit = Infinity;
    } else {
        limit = parseInt(val, 10);
        if (isNaN(limit) || limit <= 0) {
            limit = Infinity;
        }
    }

    currentPage = 1;
    listaMegjelenites();
}

function firstPage() {
    currentPage = 1;
    listaMegjelenites();
}

function prevPage() {
    if (!Number.isFinite(limit)) return;

    const totalPages = Math.max(1, Math.ceil(filteredList.length / limit));
    if (currentPage > 1) {
        currentPage--;
        listaMegjelenites();
    }
}

function nextPage() {
    if (!Number.isFinite(limit)) return;

    const totalPages = Math.max(1, Math.ceil(filteredList.length / limit));
    if (currentPage < totalPages) {
        currentPage++;
        listaMegjelenites();
    }
}

function lastPage() {
    if (!Number.isFinite(limit)) return;

    const totalPages = Math.max(1, Math.ceil(filteredList.length / limit));
    currentPage = totalPages;
    listaMegjelenites();
}
function tablaMegjelenites() {

    const tbody = document.querySelector("#tabla_lista tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    // --- Szűrési mezők ---
    const fszerzo = (document.getElementById("ts_szerzo").value || "").toLowerCase();
    const fcim    = (document.getElementById("ts_cim").value || "").toLowerCase();
    const fseries = (document.getElementById("ts_sorozat").value || "").toLowerCase();
    const minYear = parseInt(document.getElementById("ts_ev_min").value || "", 10);
    const maxYear = parseInt(document.getElementById("ts_ev_max").value || "", 10);

    // --- Lista szűrése ---
    let filtered = lista.filter(item => {

        const author = String(item["Author"] || "").toLowerCase();
        const title  = String(item["Title"]  || "").toLowerCase();
        const series = String(item["Series"] || "").toLowerCase();
        const year   = parseInt(item["Year"] || "", 10);
        const purchased = item["Purchased"] || "";

        if (fszerzo && !author.includes(fszerzo)) return false;
        if (fcim && !title.includes(fcim)) return false;
        if (fseries && !series.includes(fseries)) return false;

        if (!isNaN(minYear)) {
            if (isNaN(year) || year < minYear) return false;
        }
        if (!isNaN(maxYear)) {
            if (isNaN(year) || year > maxYear) return false;
        }

    // Vásárlási státusz szűrés
// Vásárlási státusz szűrés – tri-state alapján
if (purchaseFilterState === 1 && purchased !== "x") return false; // csak megvásárolt
if (purchaseFilterState === 2 && purchased === "x") return false; // csak nincs meg

        // ELADÓ (For_sale) háromállapotú szűrés
    const fsale = item["For_sale"] || "";

    if (saleFilterState === 1 && fsale !== "x") return false; // csak eladó
    if (saleFilterState === 2 && fsale === "x") return false; // csak nem eladó

        return true;
    });
    
    // --- Sorok kiírása ---
    filtered.forEach((item, index) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td data-label="Ssz." class="ssz">${index + 1}</td>
            <td data-label="Szerző">${item["Author"] || ""}</td>
            <td data-label="Cím">${item["Title"] || ""}</td>
            <td data-label="Sorozat">${item["Series"] || ""}</td>
<td data-label="Év">${item["Year"] || ""}</td>
<td data-label="Helyszín">${item["Location"] || ""}</td>
<td data-label="Polc">${item["Shelf"] || ""}</td>
<td data-label="Oldalszám">${item["Page_Count"] || ""}</td>
<td data-label="ISBN">${item["ISBN"] || ""}</td>
<td data-label="Kiadó">${item["Publisher"] || ""}</td>
<td data-label="Fordító">${item["Translator"] || ""}</td>
<td data-label="Műfaj">${item["Genre"] || ""}</td>

<td data-label="Megvásárolva" style="text-align:center;">
                <input type="checkbox" disabled ${item["Purchased"] === "x" ? "checked" : ""}>
            </td>

            <td data-label="Eladó" style="text-align:center;">
                <input type="checkbox" disabled ${item["For_sale"] === "x" ? "checked" : ""}>
            </td>
            <td data-label="Ár">${formatPrice(item["Price"] || "")}</td>
            <td data-label="Művelet">
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button class="btn btn-secondary" onclick="editRecord('${item["ID"]}')">✏️ Szerkeszt</button>
                    <button class="btn btn-danger" style="background:#f8d7da;color:#8a1c1c;"> 🗑️ Törlés </button>
                </div>
            </td>
        `;


        tbody.appendChild(tr);
    });
}
function tablaSzures() {
    tablaMegjelenites();
}
function clearTablaFilters() {
    document.getElementById("ts_szerzo").value = "";
    document.getElementById("ts_cim").value = "";
    document.getElementById("ts_sorozat").value = "";
    document.getElementById("ts_ev_min").value = "";
    document.getElementById("ts_ev_max").value = "";

    tablaMegjelenites();
}

/********** INDULÁS **********/
window.onload = function() {
    const savedEmail = localStorage.getItem("loggedInUserEmail");

    if (savedEmail) {
        currentUserEmail = savedEmail;
        onLoginSuccess();
    } else {
        showLoginScreen();
    }
};
// ---------- SERVICE WORKER VERZIÓ LEKÉRÉSE ----------
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(reg => {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage("GET_SW_VERSION");
        }
    });

    navigator.serviceWorker.addEventListener("message", event => {
        if (event.data && event.data.swVersion) {
            const el = document.getElementById("swVersion");
            if (el) el.textContent = event.data.swVersion;
        }
    });
}
// ------------------------------------------------------


// Datalisták betöltése maradhat itt, ez nem zavarja a loginfolyamatot
loadDropdownLists();


function urlPreviewUpdate() {
    const urlInput = document.getElementById("bm_url");
    const previewImg = document.getElementById("bm_preview");

    if (!urlInput || !previewImg) return;

    const rawUrl = urlInput.value.trim();
    previewImg.style.display = "none"; // Először elrejtjük

    if (rawUrl) {
        let displayUrl = rawUrl;

        // Drive linket átalakítjuk DIREKT KÉP formátumra
        if (rawUrl.includes("drive.google.com/")) {
            // Reguláris kifejezés a FILE_ID kinyerésére a leggyakoribb formátumokból
            const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/);

            if (match && (match[1] || match[2])) {
                const fileId = match[1] || match[2];
                // HASZNÁLD EZT A FORMÁTUMOT:
                displayUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                console.log("Átalakított Drive URL (preview):", displayUrl);
            } else {
                console.warn("Nem sikerült kinyerni a Drive fájlazonosítót (File ID). Az eredeti URL marad.");
            }
        }
        
        // Előnézeti kép beállítása
        previewImg.src = displayUrl;
        previewImg.style.display = "block";
    } else {
        previewImg.src = ""; 
    }
}
// Stabil login form submit kötés (mobilon is mindig működik)
window.addEventListener("load", function () {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        startLogin();
    });
});
// ---------- VERZIÓK KIÍRÁSA ----------
window.addEventListener("load", () => {
    const v1 = document.getElementById("appVersion");
    const v2 = document.getElementById("buildTime");

    if (v1) v1.textContent = APP_VERSION;
    if (v2) v2.textContent = new Date(BUILD_TIMESTAMP).toLocaleString("hu-HU");
});
// --------------------------------------

// ============================
// BETŰMÉRET VÁLTÓ
// ============================
function setFontSize(size) {
    document.documentElement.classList.remove("font-medium", "font-small");

    if (size === "medium") {
        document.documentElement.classList.add("font-medium");
    } else if (size === "small") {
        document.documentElement.classList.add("font-small");
    }

    localStorage.setItem("fontSize", size);
}

// Betöltéskor alkalmazzuk a korábbi választást
window.addEventListener("load", () => {
    const saved = localStorage.getItem("fontSize") || "large";
    setFontSize(saved);
});
let saleFilterState = 0;
// 0 = mindegy, 1 = csak eladó, 2 = nem eladó

function toggleSaleFilter() {
    saleFilterState = (saleFilterState + 1) % 3;

    const symbols = ["⬜", "☑️", "🚫"];

    // Kártyanézet ikon (Könyvlista szűrősáv)
    const elList = document.getElementById("saleFilter");
    if (elList) {
        elList.textContent = symbols[saleFilterState];
    }

    // Táblázatnézet ikon (Táblázatos lista szűrősáv)
    const elTable = document.getElementById("saleFilterTable");
    if (elTable) {
        elTable.textContent = symbols[saleFilterState];
    }

    // Mindkét nézet újraszűrése
listaSzures();
tablaSzures();
}
let purchaseFilterState = 0;
// 0 = mindegy
// 1 = csak megvásárolt (Purchased == "x")
// 2 = csak nincs meg (Purchased == "")

function togglePurchaseFilter() {
    purchaseFilterState = (purchaseFilterState + 1) % 3;

    const symbols = ["⬜", "☑️", "🚫"];

    // Lista nézet ikon
    const elList = document.getElementById("purchaseFilter");
    if (elList) {
        elList.textContent = symbols[purchaseFilterState];
    }

    // Táblázatnézet ikon
    const elTable = document.getElementById("purchaseFilterTable");
    if (elTable) {
        elTable.textContent = symbols[purchaseFilterState];
    }

    // Mindkét nézet újraszűrése
listaSzures();
tablaSzures();
}



