
/********** API URL **********/
const API_URL = "https://script.google.com/macros/s/AKfycbzQj7_Ej-asAK6WrbOpChmYiIvAO2tSco7cKVGNIcMIe11XHfc3lnSuIYu8ucbB0Nngzw/exec";
// Frontend oldali Google Books API kulcs.
// Fontos: ez böngészőből látható, ezért Google Cloud Console-ban
// HTTP referrer korlátozással kell védeni.
// Nem azonos a backend Script Properties-ben tárolt kulccsal.
const FRONTEND_GOOGLE_BOOKS_API_KEY = "AIzaSyA-OgB7xZn15ITtZkzeaLO8k8gvxODyKtM";
const GOOGLE_BOOKS_MAX_RESULTS = 10;
/********** LOGIN ÁLLAPOT **********/
let currentUserEmail = null;
// ---------- VERZIÓ INFORMÁCIÓK ----------
const APP_VERSION = "2026-04-29 17:40";  // Ezt TE frissíted minden deploykor
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
    const pwDiv = document.getElementById("passwordSetup");
    const appDiv = document.getElementById("appContent");

    if (loginDiv) loginDiv.style.display = "block";
    if (pwDiv) pwDiv.style.display = "none";
    if (appDiv) appDiv.style.display = "none";
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
    } catch (e) { }
    // ↑↑↑ Böngésző jelszómentés aktiválása ↑↑↑
    const loginDiv = document.getElementById("loginScreen");
    const pwDiv = document.getElementById("passwordSetup");
    const appDiv = document.getElementById("appContent");

    if (loginDiv) loginDiv.style.display = "none";
    if (pwDiv) pwDiv.style.display = "none";
    if (appDiv) appDiv.style.display = "block";
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
    const pwd = (document.getElementById("loginPassword").value || "").trim();
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

    window[callbackName] = function (data) {

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
    const pwDiv = document.getElementById("passwordSetup");
    const appDiv = document.getElementById("appContent");

    if (loginDiv) loginDiv.style.display = "none";
    if (pwDiv) pwDiv.style.display = "block";
    if (appDiv) appDiv.style.display = "none";

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
    const msg = document.getElementById("passwordSetupMessage");

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

    window[callbackName] = function (data) {
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
    const msgPw = document.getElementById("passwordSetupMessage");

    const callbackName = "loginCallback_" + Date.now();

    window[callbackName] = function (data) {
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

    const raw = String(url).trim();
    if (!raw) return "";

    let parsed;
    try {
        parsed = new URL(raw);
    } catch (e) {
        return raw;
    }

    const host = (parsed.hostname || "").toLowerCase();

    // Csak valódi Google Drive / Docs linkeket alakítunk át
    const isGoogleDriveHost =
        host === "drive.google.com" ||
        host === "docs.google.com";

    if (!isGoogleDriveHost) {
        return raw;
    }

    // Ha eleve preview vagy direct view formátum, maradjon
    if (raw.includes("/file/d/") && raw.includes("/preview")) {
        return raw;
    }
    if (raw.includes("uc?export=view")) {
        return raw;
    }

    let id = "";

    const fileMatch = raw.match(/\/file\/d\/([^\/\?]+)/i);
    if (fileMatch) id = fileMatch[1];

    const openMatch = raw.match(/[?&]id=([^&]+)/i);
    if (!id && openMatch) id = openMatch[1];

    if (!id) {
        return raw;
    }

    return `https://drive.google.com/file/d/${id}/preview`;
}
function normalizeCoverUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";

    let result = raw;

    // Google Drive linkek egységesítése
    if (result.includes("drive.google.com/")) {
        result = convertDriveUrl(result);
    }

    // Google Books thumbnail URL-ek biztonságosabbá tétele
    result = result.replace(/^http:\/\//i, "https://");

    // Ha Google Books zoom paraméter van, nagyobb preview-t kérünk
    if (result.includes("books.google")) {
        result = result.replace(/([?&])zoom=\d+/i, "$1zoom=2");

        // edge=cssscan néha törékeny, inkább vegyük ki
        result = result.replace(/([?&])edge=curl\b/i, "$1");
        result = result.replace(/[?&]$/, "");
        result = result.replace(/\?&/, "?");
    }

    return result;
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
let selectedLookupResultIndex = -1;
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
        document.getElementById("bm_szerzo").value = item["Author"] || "";
        document.getElementById("bm_cim").value = item["Title"] || "";
        document.getElementById("bm_eredeti").value = item["Original_Title"] || "";
        document.getElementById("bm_korabbi").value = item["Previous_Title"] || "";
        document.getElementById("bm_sorozat").value = item["Series"] || "";
        document.getElementById("bm_ssz").value = item["Number"] || "";
        document.getElementById("bm_ev").value = item["Year"] || "";
        document.getElementById("bm_helyszin").value = item["Location"] || "";
        document.getElementById("bm_polc").value = item["Shelf"] || "";
        document.getElementById("bm_oldalszam").value = item["Page_Count"] || "";
        document.getElementById("bm_isbn").value = item["ISBN"] || "";
        document.getElementById("bm_kiado").value = item["Publisher"] || "";
        document.getElementById("bm_fordito").value = item["Translator"] || "";
        document.getElementById("bm_mufaj").value = item["Genre"] || "";
        document.getElementById("bm_url").value = item["URL"] || "";
        document.getElementById("bm_purchased").checked = (item["Purchased"] === "x");
        document.getElementById("bm_forsale").checked = (item["For_sale"] === "x");
        document.getElementById("bm_ar").value = item["Price"] || "";
        document.getElementById("bm_megjegy").value = item["Comment"] || "";

        const img = document.getElementById("bm_preview");
        if (item["URL"]) {
            img.src = convertDriveUrl(item["URL"]);
            img.style.display = "block";
        } else {
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
function closeLookupResultsModal() {
    document.getElementById("lookupResultsModal").style.display = "none";
    document.getElementById("lookupResultsList").innerHTML = "";
    selectedLookupResultIndex = -1;
}

function applyLookupResultByIndex(index) {
    const item = lastLookupResults[index];
    if (!item) {
        alert("A kiválasztott találat nem érhető el.");
        return;
    }

    selectedLookupResultIndex = index;
    applyLookupItemToModalEmptyFields(item);
    closeLookupResultsModal();

    alert("A kiválasztott találat kitöltötte az üres mezőket.");
    log("Lookup találat kiválasztva. Index: " + index);
}

function openLookupResultsModal(items) {
    const listEl = document.getElementById("lookupResultsList");
    listEl.innerHTML = "";

    items.forEach((item, index) => {
        const row = document.createElement("div");
        row.style.border = "1px solid rgba(0,0,0,0.12)";
        row.style.borderRadius = "10px";
        row.style.padding = "12px";

        const titleText = item.title || "Nincs cím";
        const authorText = item.authors || "Nincs szerző";
        const yearText = item.year ? " (" + item.year + ")" : "";
        const originalTitleText = item.originalTitle ? "<div><strong>Eredeti cím:</strong> " + item.originalTitle + "</div>" : "";
        const previousTitleText = item.previousTitle ? "<div><strong>Korábbi cím:</strong> " + item.previousTitle + "</div>" : "";
        const seriesText = item.series ? "<div><strong>Sorozat:</strong> " + item.series + "</div>" : "";
        const numberText = item.number ? "<div><strong>Sorszám:</strong> " + item.number + "</div>" : "";
        const yearFullText = item.year ? "<div><strong>Év:</strong> " + item.year + "</div>" : "";
        const locationText = item.location ? "<div><strong>Helyszín:</strong> " + item.location + "</div>" : "";
        const shelfText = item.shelf ? "<div><strong>Polc:</strong> " + item.shelf + "</div>" : "";
        const pageCountText = item.pageCount ? "<div><strong>Oldalszám:</strong> " + item.pageCount + "</div>" : "";
        const publisherText = item.publisher ? "<div><strong>Kiadó:</strong> " + item.publisher + "</div>" : "";
        const translatorText = item.translator ? "<div><strong>Fordító:</strong> " + item.translator + "</div>" : "";
        const genreText = item.genre ? "<div><strong>Műfaj:</strong> " + item.genre + "</div>" : "";
        const isbnText = item.isbn ? "<div><strong>ISBN:</strong> " + item.isbn + "</div>" : "";
        const coverUrlText = item.coverUrl ? "<div><strong>Borító URL:</strong> <span style=\"word-break:break-all;\">" + item.coverUrl + "</span></div>" : "";
        const sourceText = item.source ? "<div><strong>Forrás:</strong> " + item.source + "</div>" : "";
        const sourceIdText = item.sourceId ? "<div><strong>Forrás URL / ID:</strong> <span style=\"word-break:break-all;\">" + item.sourceId + "</span></div>" : "";

        const coverHtml = item.coverUrl
            ? `<div style="flex:0 0 72px;">
            <img
src="${normalizeCoverUrl(item.coverUrl)}"
                alt="Borító"
                style="width:72px;height:108px;object-fit:cover;border-radius:6px;border:1px solid rgba(0,0,0,0.12);background:#f5f5f5;"
                onerror="this.style.display='none'; this.parentElement.innerHTML='Nincs borító'; this.parentElement.style.display='flex'; this.parentElement.style.alignItems='center'; this.parentElement.style.justifyContent='center'; this.parentElement.style.fontSize='12px'; this.parentElement.style.textAlign='center'; this.parentElement.style.padding='6px';"
            >
       </div>`
            : `<div style="flex:0 0 72px;width:72px;height:108px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:12px;text-align:center;padding:6px;">
            Nincs borító
       </div>`;

        row.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start;">
        ${coverHtml}
        <div style="flex:1 1 auto;">
            <div style="font-weight:600;margin-bottom:6px;">${index + 1}. ${titleText}${yearText}</div>
<div style="margin-bottom:6px;"><strong>Szerző:</strong> ${authorText}</div>

${originalTitleText}
${previousTitleText}
${seriesText}
${numberText}
${yearFullText}
${locationText}
${shelfText}
${pageCountText}
${isbnText}
${publisherText}
${translatorText}
${genreText}
${coverUrlText}
${sourceText}
${sourceIdText}

<div style="margin-top:10px;">
    <button class="btn btn-primary" type="button">Ezt választom</button>
</div>
        </div>
    </div>
`;

        row.querySelector("button").addEventListener("click", function () {
            applyLookupResultByIndex(index);
        });

        listEl.appendChild(row);
    });

    document.getElementById("lookupResultsModal").style.display = "flex";
}
function buildGoogleBooksQuery({ isbn, title, author }) {
    if (isbn) {
        return `isbn:${isbn}`;
    }

    const parts = [];
    if (title) parts.push(`intitle:${title}`);
    if (author) parts.push(`inauthor:${author}`);
    return parts.join(" ");
}

function mapGoogleBookToLookupItem(item) {
    const info = (item && item.volumeInfo) ? item.volumeInfo : {};
    const ids = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];

    const isbn13 = ids.find(x => x && x.type === "ISBN_13" && x.identifier);
    const isbn10 = ids.find(x => x && x.type === "ISBN_10" && x.identifier);

    return {
        source: "google_books",
        sourceId: item && item.id ? String(item.id) : "",
        title: info.title || "",
        authors: Array.isArray(info.authors) ? info.authors.join(", ") : "",
        originalTitle: "",
        previousTitle: "",
        series: "",
        number: "",
        year: (info.publishedDate || "").match(/\b(1[0-9]{3}|20[0-9]{2}|2100)\b/)?.[1] || "",
        location: "",
        shelf: "",
        pageCount: info.pageCount ? String(info.pageCount) : "",
        isbn: (isbn13 && isbn13.identifier) || (isbn10 && isbn10.identifier) || "",
        publisher: info.publisher || "",
        translator: "",
        genre: Array.isArray(info.categories) ? info.categories.join(", ") : "",
        coverUrl: normalizeCoverUrl((info.imageLinks && (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail)) || ""), language: (info.language || "").toLowerCase()
    };
}
function setInputIfEmpty(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    const current = (el.value || "").trim();
    const next = String(value || "").trim();

    if (!current && next) {
        el.value = next;
    }
}

function pickGoogleBookBestAuthor(item) {
    return (item && item.authors) ? item.authors : "";
}

function pickGoogleBookBestCover(item) {
    return normalizeCoverUrl((item && item.coverUrl) ? item.coverUrl : "");
}
function pickGoogleBookOriginalTitle(item) {
    const apiTitle = String((item && item.title) || "").trim();
    const currentMainTitle = String((document.getElementById("bm_cim")?.value) || "").trim();

    if (!apiTitle) return "";

    if (currentMainTitle && apiTitle.toLowerCase() === currentMainTitle.toLowerCase()) {
        return "";
    }

    return apiTitle;
}
function applyLookupItemToModalEmptyFields(item) {
    if (!item) return;

    setInputIfEmpty("bm_cim", item.title || "");
    setInputIfEmpty("bm_szerzo", pickGoogleBookBestAuthor(item));
    setInputIfEmpty("bm_eredeti", item.originalTitle || pickGoogleBookOriginalTitle(item));
    setInputIfEmpty("bm_ev", item.year || "");
    setInputIfEmpty("bm_oldalszam", item.pageCount || "");
    setInputIfEmpty("bm_isbn", item.isbn || "");
    setInputIfEmpty("bm_kiado", item.publisher || "");
    setInputIfEmpty("bm_fordito", item.translator || "");
    setInputIfEmpty("bm_mufaj", item.genre || "");
    setInputIfEmpty("bm_url", pickGoogleBookBestCover(item));

    urlPreviewUpdate();
}
function normalizeLookupTextForFrontend(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizeLooseLookupTextForFrontend(value) {
    return normalizeLookupTextForFrontend(value)
        .replace(/[^a-z0-9]+/g, "");
}

function isRelevantFrontendLookupItem(item, wanted) {
    const wantedIsbn = normalizeIsbnForMerge(wanted && wanted.isbn);
    const wantedTitle = normalizeLookupTextForFrontend(wanted && wanted.title);
    const wantedAuthor = normalizeLookupTextForFrontend(wanted && wanted.author);

    const itemIsbn = normalizeIsbnForMerge(item && item.isbn);
    const itemTitle = normalizeLookupTextForFrontend(item && item.title);
    const itemAuthors = normalizeLookupTextForFrontend(item && item.authors);

    const wantedTitleLoose = normalizeLooseLookupTextForFrontend(wanted && wanted.title);
    const wantedAuthorLoose = normalizeLooseLookupTextForFrontend(wanted && wanted.author);

    const itemTitleLoose = normalizeLooseLookupTextForFrontend(item && item.title);
    const itemAuthorsLoose = normalizeLooseLookupTextForFrontend(item && item.authors);

    if (wantedIsbn) {
        return itemIsbn && itemIsbn === wantedIsbn;
    }

    let titleMatches = false;
    let authorMatches = false;

    if (wantedTitle) {
        titleMatches =
            itemTitle.includes(wantedTitle) ||
            wantedTitle.includes(itemTitle) ||
            itemTitleLoose.includes(wantedTitleLoose) ||
            wantedTitleLoose.includes(itemTitleLoose);
    }

    if (wantedAuthor) {
        authorMatches =
            itemAuthors.includes(wantedAuthor) ||
            wantedAuthor.includes(itemAuthors) ||
            itemAuthorsLoose.includes(wantedAuthorLoose) ||
            wantedAuthorLoose.includes(itemAuthorsLoose);
    }

    if (wantedTitle && wantedAuthor) {
        return titleMatches && authorMatches;
    }

    return titleMatches || authorMatches;
}
async function lookupGoogleBooksFromFrontend({ isbn, title, author }) {
    const q = buildGoogleBooksQuery({ isbn, title, author });

    if (!q) {
        return [];
    }

    const url =
        "https://www.googleapis.com/books/v1/volumes" +
        "?q=" + encodeURIComponent(q) +
        "&langRestrict=hu" +
        "&printType=books" +
        "&maxResults=" + GOOGLE_BOOKS_MAX_RESULTS +
        "&key=" + encodeURIComponent(FRONTEND_GOOGLE_BOOKS_API_KEY);

    const response = await fetch(url);

    if (!response.ok) {
        const text = await response.text();
        throw new Error("Google Books hiba: " + response.status + " - " + text);
    }

    const json = await response.json();
    const items = Array.isArray(json.items) ? json.items : [];

    return items
        .map(mapGoogleBookToLookupItem)
        .filter(item => isRelevantFrontendLookupItem(item, { isbn, title, author }));
}
async function lookupPublisherPagesFromBackend({ isbn, title, author }) {
    const cleanIsbn = String(isbn || "").trim();
    const cleanTitle = String(title || "").trim();
    const cleanAuthor = String(author || "").trim();

    if (!cleanIsbn && !cleanTitle && !cleanAuthor) {
        return [];
    }

    const callbackName = "lookupPublisherPagesCallback_" + Date.now();

    return await new Promise((resolve, reject) => {
        window[callbackName] = function (data) {
            try { delete window[callbackName]; } catch (e) { }

            if (!data || !data.success) {
                reject(new Error((data && data.error) ? data.error : "Publisher backend hiba"));
                return;
            }

            resolve(Array.isArray(data.items) ? data.items : []);
        };

        const s = document.createElement("script");
        s.src =
            API_URL +
            "?action=lookupPublisherPages" +
            "&isbn=" + encodeURIComponent(cleanIsbn) +
            "&title=" + encodeURIComponent(cleanTitle) +
            "&author=" + encodeURIComponent(cleanAuthor) +
            "&callback=" + callbackName +
            "&_=" + Date.now();

        s.onerror = function () {
            try { delete window[callbackName]; } catch (e) { }
            reject(new Error("Publisher script betöltési hiba"));
        };

        document.body.appendChild(s);
    });
}



function normalizeIsbnForMerge(value) {
    return String(value || "")
        .replace(/[^0-9Xx]/g, "")
        .toLowerCase();
}

function hasValueForMerge(value) {
    return String(value || "").trim() !== "";
}

function mergeLookupItemFields(base, incoming) {
    const result = Object.assign({}, base || {});
    const next = incoming || {};

    function fillIfEmpty(field) {
        if (!hasValueForMerge(result[field]) && hasValueForMerge(next[field])) {
            result[field] = next[field];
        }
    }

    [
        "title",
        "authors",
        "originalTitle",
        "previousTitle",
        "series",
        "number",
        "year",
        "location",
        "shelf",
        "pageCount",
        "isbn",
        "publisher",
        "translator",
        "genre",
        "coverUrl",
        "language"
    ].forEach(fillIfEmpty);

    const currentSources = String(result.source || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    const nextSources = String(next.source || "")
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);

    result.source = Array.from(new Set(currentSources.concat(nextSources))).join(", ");

    const currentSourceIds = String(result.sourceId || "")
        .split(" | ")
        .map(x => x.trim())
        .filter(Boolean);

    const nextSourceIds = String(next.sourceId || "")
        .split(" | ")
        .map(x => x.trim())
        .filter(Boolean);

    result.sourceId = Array.from(new Set(currentSourceIds.concat(nextSourceIds))).join(" | ");

    return result;
}

function mergeLookupResults(googleItems, publisherItems) {
    const merged = [];
    const byKey = new Map();

    function makeKey(item) {
        const isbn = normalizeIsbnForMerge(item && item.isbn);

        if (isbn) {
            return "isbn:" + isbn;
        }

        return [
            "text",
            String(item && item.title || "").trim().toLowerCase(),
            String(item && item.authors || "").trim().toLowerCase()
        ].join("|");
    }

    [...(googleItems || []), ...(publisherItems || [])].forEach(item => {
        if (!item) return;

        const key = makeKey(item);

        if (byKey.has(key)) {
            const existing = byKey.get(key);
            const mergedItem = mergeLookupItemFields(existing, item);

            byKey.set(key, mergedItem);

            const index = merged.indexOf(existing);
            if (index !== -1) {
                merged[index] = mergedItem;
            }
        } else {
            byKey.set(key, item);
            merged.push(item);
        }
    });

    return merged;
}
async function lookupBookMetadataFromModal() {
    // Új lookup indulásakor minden korábbi találati állapotot törlünk,
    // hogy régi keresésből származó eredmény ne jelenhessen meg újra.
    lastLookupResults = [];
    selectedLookupResultIndex = -1;

    const lookupResultsModal = document.getElementById("lookupResultsModal");
    if (lookupResultsModal) {
        lookupResultsModal.style.display = "none";
    }

    const lookupResultsList = document.getElementById("lookupResultsList");
    if (lookupResultsList) {
        lookupResultsList.innerHTML = "";
    }

    const isbn = (document.getElementById("bm_isbn").value || "").trim();
    const title = (document.getElementById("bm_cim").value || "").trim();
    const author = (document.getElementById("bm_szerzo").value || "").trim();
    if (!isbn && !title && !author) {
        alert("Adj meg legalább ISBN-t vagy címet/szerzőt a kereséshez.");
        return;
    }

    const lookupButton = document.getElementById("bm_lookup_btn");
    showLoading(lookupButton);

    try {
        const googleResults = await lookupGoogleBooksFromFrontend({ isbn, title, author });

        let publisherResults = [];
        if (isbn || title || author) {
            try {
                publisherResults = await lookupPublisherPagesFromBackend({
                    isbn,
                    title,
                    author
                });
            } catch (e) {
                log("Publisher lookup hiba: " + (e && e.message ? e.message : String(e)));
            }
        }

        lastLookupResults = mergeLookupResults(googleResults, publisherResults);
        if (!Array.isArray(lastLookupResults) || lastLookupResults.length === 0) {
            alert("Nem érkezett találat sem Google Booksból, sem kiadói/webshop forrásból.");
            log("Összesített lookup: nincs találat.");
            return;
        }

        openLookupResultsModal(lastLookupResults);
        log("Összesített lookup kész. Találatok száma: " + lastLookupResults.length);
    } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        alert("Google Books frontend hiba:\n" + msg);
        log("Google Books frontend hiba: " + msg);
    } finally {
        hideLoading(lookupButton);
    }
}
/********** MODAL – mentés logika **********/
function saveBookFromModal() {
    log("Könyv mentése modalból...");

    const szerzo = document.getElementById("bm_szerzo").value.trim();
    const cim = document.getElementById("bm_cim").value.trim();

    if (!szerzo || !cim) {
        alert("A Szerző és a Cím mező kitöltése kötelező.");
        return;
    }

    const bookData = {
        Author: szerzo,
        Title: document.getElementById("bm_cim").value.trim(),
        Original_Title: document.getElementById("bm_eredeti").value.trim(),
        Previous_Title: document.getElementById("bm_korabbi").value.trim(),
        Series: document.getElementById("bm_sorozat").value.trim(),
        Number: document.getElementById("bm_ssz").value.trim(),
        Year: document.getElementById("bm_ev").value.trim(),
        Location: document.getElementById("bm_helyszin").value.trim(),
        Shelf: document.getElementById("bm_polc").value.trim(),
        Page_Count: document.getElementById("bm_oldalszam").value.trim(),
        ISBN: document.getElementById("bm_isbn").value.trim(),
        Publisher: document.getElementById("bm_kiado").value.trim(),
        Translator: document.getElementById("bm_fordito").value.trim(),
        Genre: document.getElementById("bm_mufaj").value.trim(),
        Purchased: document.getElementById("bm_purchased").checked ? "x" : "",
        For_sale: document.getElementById("bm_forsale").checked ? "x" : "",
        Price: document.getElementById("bm_ar").value.trim(),
        Comment: document.getElementById("bm_megjegy").value.trim()
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
            "&szerzo=" + encodeURIComponent(d.Author) +
            "&cim=" + encodeURIComponent(d.Title) +
            "&eredeti_cim=" + encodeURIComponent(d.Original_Title) +
            "&korabbi_cim=" + encodeURIComponent(d.Previous_Title) +
            "&sorozat=" + encodeURIComponent(d.Series) +
            "&ssz=" + encodeURIComponent(d.Number) +
            "&url=" + encodeURIComponent(kepUrl) +
            "&ev=" + encodeURIComponent(d.Year) +
            "&helyszin=" + encodeURIComponent(d.Location) +
            "&polc=" + encodeURIComponent(d.Shelf) +
            "&oldalszam=" + encodeURIComponent(d.Page_Count) +
            "&isbn=" + encodeURIComponent(d.ISBN) +
            "&kiado=" + encodeURIComponent(d.Publisher) +
            "&fordito=" + encodeURIComponent(d.Translator) +
            "&mufaj=" + encodeURIComponent(d.Genre) +
            "&megv=" + encodeURIComponent(d.Purchased) +
            "&elado=" + encodeURIComponent(d.For_sale) +
            "&ar=" + encodeURIComponent(d.Price) +
            "&megjegy=" + encodeURIComponent(d.Comment) +
            "&callback=modalAddBookValasz";

        const s = document.createElement("script");
        s.src = url;
        document.body.appendChild(s);
    } else {
        // Szerkesztés
        const url = API_URL +
            "?action=updateLista" +
            "&ID=" + encodeURIComponent(id) +
            "&szerzo=" + encodeURIComponent(d.Author) +
            "&cim=" + encodeURIComponent(d.Title) +
            "&eredeti_cim=" + encodeURIComponent(d.Original_Title) +
            "&korabbi_cim=" + encodeURIComponent(d.Previous_Title) +
            "&sorozat=" + encodeURIComponent(d.Series) +
            "&ssz=" + encodeURIComponent(d.Number) +
            "&url=" + encodeURIComponent(kepUrl) +
            "&ev=" + encodeURIComponent(d.Year) +
            "&helyszin=" + encodeURIComponent(d.Location) +
            "&polc=" + encodeURIComponent(d.Shelf) +
            "&oldalszam=" + encodeURIComponent(d.Page_Count) +
            "&isbn=" + encodeURIComponent(d.ISBN) +
            "&kiado=" + encodeURIComponent(d.Publisher) +
            "&fordito=" + encodeURIComponent(d.Translator) +
            "&mufaj=" + encodeURIComponent(d.Genre) +
            "&megv=" + encodeURIComponent(d.Purchased) +
            "&elado=" + encodeURIComponent(d.For_sale) +
            "&ar=" + encodeURIComponent(d.Price) +
            "&megjegy=" + encodeURIComponent(d.Comment) +
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
    const fcim = (document.getElementById("ls_cim").value || "").toLowerCase();
    const fseries = (document.getElementById("ls_sorozat").value || "").toLowerCase();
    const minYear = parseInt(document.getElementById("ls_ev_min").value || "", 10);
    const maxYear = parseInt(document.getElementById("ls_ev_max").value || "", 10);

    // --- Lista szűrése a kártyás nézethez ---
    let filtered = lista.filter(item => {
        const author = String(item["Author"] || "").toLowerCase();
        const title = String(item["Title"] || "").toLowerCase();
        const series = String(item["Series"] || "").toLowerCase();
        const year = parseInt(item["Year"] || "", 10);
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
        const end = start + limit;

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

    reader.onload = function (e) {
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
        const expected = ["ID", "Author", "Title", "Original_Title", "Previous_Title", "Series", "Number", "URL", "Year", "Location", "Shelf", "Page_Count", "ISBN", "Publisher", "Translator", "Genre", "Purchased", "For_sale", "Price", "Comment"];
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

        const idxAuthor = header.indexOf("Author");
        const idxTitle = header.indexOf("Title");
        const idxOriginal_Title = header.indexOf("Original_Title");
        const idxPrevious_Title = header.indexOf("Previous_Title");
        const idxSeries = header.indexOf("Series");
        const idxNumber = header.indexOf("Number");
        const idxURL = header.indexOf("URL");
        const idxYear = header.indexOf("Year");
        const idxLocation = header.indexOf("Location");
        const idxShelf = header.indexOf("Shelf");
        const idxPageCount = header.indexOf("Page_Count");
        const idxISBN = header.indexOf("ISBN");
        const idxPublisher = header.indexOf("Publisher");
        const idxTranslator = header.indexOf("Translator");
        const idxGenre = header.indexOf("Genre");
        const idxForSale = header.indexOf("For_sale");
        const idxPurchased = header.indexOf("Purchased");
        const idxPrice = header.indexOf("Price");
        const idxComment = header.indexOf("Comment");

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
                            (idx + 1) + ". " +
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
                Author: (cols[idxAuthor] || "").trim(),
                Title: (cols[idxTitle] || "").trim(),
                Original_Title: (cols[idxOriginal_Title] || "").trim(),
                Previous_Title: (cols[idxPrevious_Title] || "").trim(),
                Series: (cols[idxSeries] || "").trim(),
                Number: (cols[idxNumber] || "").trim(),
                URL: (cols[idxURL] || "").trim(),
                Year: (cols[idxYear] || "").trim(),
                Location: (cols[idxLocation] || "").trim(),
                Shelf: (cols[idxShelf] || "").trim(),
                Page_Count: (cols[idxPageCount] || "").trim(),
                ISBN: (cols[idxISBN] || "").trim(),
                Publisher: (cols[idxPublisher] || "").trim(),
                Translator: (cols[idxTranslator] || "").trim(),
                Genre: (cols[idxGenre] || "").trim(),
                Purchased: (cols[idxPurchased] || "").trim(),
                For_sale: (cols[idxForSale] || "").trim(),
                Price: (cols[idxPrice] || "").trim(),
                Comment: (cols[idxComment] || "").trim()
            };
            log("DEBUG IMPORT: " + JSON.stringify(book));

            const callbackName = "importCsvCallback_" + i;
            window[callbackName] = function (data) {
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
                "&Author=" + encodeURIComponent(book.Author) +
                "&Title=" + encodeURIComponent(book.Title) +
                "&Original_Title=" + encodeURIComponent(book.Original_Title) +
                "&Previous_Title=" + encodeURIComponent(book.Previous_Title) +
                "&Series=" + encodeURIComponent(book.Series) +
                "&Number=" + encodeURIComponent(book.Number) +
                "&URL=" + encodeURIComponent(book.URL) +
                "&Year=" + encodeURIComponent(book.Year) +
                "&Location=" + encodeURIComponent(book.Location) +
                "&Shelf=" + encodeURIComponent(book.Shelf) +
                "&Page_Count=" + encodeURIComponent(book.Page_Count) +
                "&ISBN=" + encodeURIComponent(book.ISBN) +
                "&Publisher=" + encodeURIComponent(book.Publisher) +
                "&Translator=" + encodeURIComponent(book.Translator) +
                "&Genre=" + encodeURIComponent(book.Genre) +
                "&For_sale=" + encodeURIComponent(book.For_sale) +
                "&Purchased=" + encodeURIComponent(book.Purchased) +
                "&Price=" + encodeURIComponent(book.Price) +
                "&Comment=" + encodeURIComponent(book.Comment) +
                "&callback=" + callbackName;

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
    const fcim = (document.getElementById("ts_cim").value || "").toLowerCase();
    const fseries = (document.getElementById("ts_sorozat").value || "").toLowerCase();
    const minYear = parseInt(document.getElementById("ts_ev_min").value || "", 10);
    const maxYear = parseInt(document.getElementById("ts_ev_max").value || "", 10);

    // --- Lista szűrése ---
    let filtered = lista.filter(item => {

        const author = String(item["Author"] || "").toLowerCase();
        const title = String(item["Title"] || "").toLowerCase();
        const series = String(item["Series"] || "").toLowerCase();
        const year = parseInt(item["Year"] || "", 10);
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
window.onload = function () {
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
        const displayUrl = normalizeCoverUrl(rawUrl);

        previewImg.src = displayUrl;
        previewImg.style.display = "block";
        previewImg.onerror = function () {
            previewImg.style.display = "none";
            previewImg.src = "";
        };
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



