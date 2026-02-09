/****************************************************************************************
 * ✅ IMPLEMENTATION “Livrée ✅” -> Apps Script Web App (Solution 1)
 *
 * Je te redonne TON code avec les ajouts/modifs nécessaires.
 * J’ai mis des commentaires "⚠️ HALLUCINATION RISK" partout où je dois ASSUMER quelque chose
 * (ex: quel row correspond à ta sheet “Propre”, si ta source TSV et ta sheet Apps Script
 * sont la même, etc.).
 *
 * IMPORTANT:
 * - Ton DELIVERY_TOKEN est exposé ici (dans la convo). Change-le côté Apps Script + ici.
 * - Ton csvUrl est une URL “publish to web” (2PACX...) qui peut être une AUTRE sheet que celle
 *   derrière ton Apps Script (SPREADSHEET_ID). Si ce n’est pas la même, sheetRow ne matchera
 *   PAS la ligne réelle dans "Propre". On log quand même, mais la “validation sheetRow” côté
 *   Apps Script peut te bloquer.
 ****************************************************************************************/

const csvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTClhE-lNLDfgkfY8jin2cVjdjmZfftnUPVEPntDlcnSBkxpz5j7cIXnrypvSj1W0kRDR0TFygEAGPn/pub?gid=399718857&single=true&output=tsv";

const blockedLocalsUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTClhE-lNLDfgkfY8jin2cVjdjmZfftnUPVEPntDlcnSBkxpz5j7cIXnrypvSj1W0kRDR0TFygEAGPn/pub?gid=742565682&single=true&output=tsv";

const DELIVERY_API_URL =
  "https://script.google.com/macros/s/AKfycby4g4d8bo-xCjC4gYldvDMtG1ptqrVWgahRe9ORyaOmqcZ3t0emwNSFrgYxWNHd2Rpi/exec";

// ⚠️ HALLUCINATION RISK: token partagé dans la conversation => considère-le compromis.
let DELIVERY_TOKEN = localStorage.getItem("APIKEY");

if (!DELIVERY_TOKEN) {
  DELIVERY_TOKEN = prompt("API KEY :");

  if (DELIVERY_TOKEN) {
    localStorage.setItem("APIKEY", DELIVERY_TOKEN);
  }
}

async function logDelivery(row, action = "delivered") {
  const payload = {
    token: DELIVERY_TOKEN,
    action,
    sheetRow: row.sheetRow,
    local: row.local,
    jour: row.jour,
    heure: row.heure,
    livreur: localStorage.getItem("livreur") || "",
  };

  // CORS workaround: no-cors = tu ne peux pas lire la réponse,
  // mais la requête est envoyée (fire-and-forget).
  await fetch(DELIVERY_API_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(payload),
  });

  // ⚠️ HALLUCINATION RISK:
  // Ici, on ASSUME que l'envoi a marché (car no-cors ne donne pas accès au status).
  // Pour vérifier, regarde l'onglet "Livraisons" dans la sheet.
  return { ok: true };
}

// ✅ On garde markDelivered, mais on s’assure de toujours lui passer (btn, row)
async function markDelivered(btn, row) {
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = "Envoi...";

  try {
    await logDelivery(row, "delivered");
    btn.textContent = "Livrée ✅";
    btn.classList.add("check");
  } catch (e) {
    btn.textContent = old;
    alert("Erreur envoi: " + (e?.message || e));
  } finally {
    btn.disabled = false;
  }
}

let data = [];
let groups = {};
let blockedSet = new Set();

let pavillon = localStorage.getItem("pavillon") || "principal"; // 'principal' | 'lassonde' | 'other'
document.getElementById(`pavillon-${pavillon}`).className = "active";
let selectedDay = localStorage.getItem("selectedDay");

function parseCSV(csvText) {
  const lines = splitCSVLines(csvText);
  if (lines.length < 1) return [];

  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  const separators = { ",": commaCount, ";": semiCount, "\t": tabCount };
  const separator = Object.keys(separators).reduce((a, b) =>
    separators[a] > separators[b] ? a : b,
  );

  const headers = parseCSVLine(firstLine, separator).map((h) =>
    h.trim().toLowerCase(),
  );
  console.log("Headers:", headers);
  console.log("Detected separator:", JSON.stringify(separator));

  const localIndex = headers.findIndex((h) => h.includes("local"));
  const jourIndex = headers.findIndex(
    (h) => h.includes("jour") || h.includes("date"),
  );
  const heureIndex = headers.findIndex(
    (h) => h.includes("heure") || h.includes("plage"),
  );

  // ⚠️ HALLUCINATION RISK: tes findIndex ici ont un bug potentiel:
  // tu as mis h.toLowerCase(), mais tu cherches "Combien..." avec majuscules.
  // Je ne change pas ça ici pour pas casser ton parsing, mais c’est probablement -1 tout le temps.
  const quantiteIndex = headers.findIndex((h) =>
    h.includes("Combien de chocolats achetés"),
  );
  const giverIndex = headers.findIndex((h) => h.includes("acheteur"));
  const receiverIndex = headers.findIndex((h) => h.includes("destinataire"));
  const messageIndex = headers.findIndex((h) => h.includes("Demande spéciale"));
  const nbrosesIndex = headers.findIndex((h) => h.includes("(1, 2, 3, ...)"));
  const chocolatIndex = headers.findIndex((h) =>
    h.includes("entrez la sorte du chocolat acheté"),
  );
  const anonymousIndex = headers.findIndex((h) => h.includes("anonyme"));
  const instructionsIndex = headers.findIndex((h) =>
    h.includes("demande spéciale pour la livraison"),
  );
  const carteIndex = headers.findIndex((h) => h.includes("carte"));
  const valideeIndex = headers.findIndex((h) => h.includes("vérification"));
  const livreeIndex = headers.findIndex((h) => h.includes("livree"));
  const choraleIndex = headers.findIndex((h) => h.includes("chorale"));

  console.log("Indices:", {
    localIndex,
    livreeIndex,
    jourIndex,
    heureIndex,
    quantiteIndex,
    giverIndex,
    receiverIndex,
    messageIndex,
    nbrosesIndex,
    chocolatIndex,
    anonymousIndex,
    instructionsIndex,
    carteIndex,
    valideeIndex,
    choraleIndex
  });

  if (localIndex === -1 || jourIndex === -1 || heureIndex === -1) {
    throw new Error("Colonnes requises non trouvées dans le CSV.");
  }

  // ✅ IMPORTANT: idx + 2 => sheetRow (ligne 2 = première donnée)
  // ⚠️ HALLUCINATION RISK: valide seulement si ton TSV est la même feuille que celle
  // que ton Apps Script considère "Propre". Sinon, c’est juste un “row number” local.
  return lines
    .slice(1)
    .map((line, idx) => {
    const cols = parseCSVLine(line, separator);

    const sheetRow = idx + 2;

    const local = cols[localIndex]?.trim().toUpperCase() || "";
    const jour = cols[jourIndex]?.trim() || "";
    const heure = cols[heureIndex]?.trim() || "";

    const quantite =
      quantiteIndex !== -1 ? parseInt(cols[quantiteIndex]?.trim(), 10) || 1 : 1;

    const giverRaw = giverIndex !== -1 ? cols[giverIndex]?.trim() || "N/A" : "N/A";
    const giver = giverRaw;
    const receiver =
      receiverIndex !== -1 ? cols[receiverIndex]?.trim() || "N/A" : "N/A";
    const message =
      messageIndex !== -1 ? cols[messageIndex]?.trim() || "N/A" : "N/A";
    const livree =
      livreeIndex !== -1 ? cols[livreeIndex]?.trim() || "N/A" : "N/A";
    const nbroses =
      nbrosesIndex !== -1 ? cols[nbrosesIndex]?.trim() || "N/A" : "N/A";
    const chocolat =
      chocolatIndex !== -1 ? cols[chocolatIndex]?.trim() || "N/A" : "N/A";
    const anonymous =
      anonymousIndex !== -1 ? cols[anonymousIndex]?.trim() || "N/A" : "N/A";
    const instructions =
      instructionsIndex !== -1
        ? cols[instructionsIndex]?.trim() || "N/A"
        : "N/A";
    const carte = carteIndex !== -1 ? cols[carteIndex]?.trim() || "N/A" : "N/A";

    const validee =
      valideeIndex !== -1 ? cols[valideeIndex]?.trim() || "N/A" : "N/A";
    
    const chorale =
      choraleIndex !== -1 ? cols[choraleIndex]?.trim() || "N/A" : "N/A";

    // Filtrer les ventes directes (Nom de l'acheteur = "vente direct")
    if (String(giverRaw).trim().toLowerCase() === "vente direct") {
      return null;
    }

    return {
      sheetRow, // ✅ AJOUT
      local,
      jour,
      heure,
      quantite,
      giver,
      receiver,
      message,
      nbroses,
      chocolat,
      anonymous,
      instructions,
      carte,
      validee,
      livree,
      chorale,
    };
  })
  .filter(Boolean);
}

function parseBlockedCSV(csvText) {
  const lines = splitCSVLines(csvText);
  if (lines.length < 1) return new Set();

  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  const separators = { ",": commaCount, ";": semiCount, "\t": tabCount };
  const separator = Object.keys(separators).reduce((a, b) =>
    separators[a] > separators[b] ? a : b,
  );

  const headers = parseCSVLine(firstLine, separator).map((h) =>
    h.trim().toLowerCase(),
  );

  const localIndex = headers.findIndex((h) => h.includes("local"));
  const jourIndex = headers.findIndex(
    (h) => h.includes("jour") || h.includes("journ"),
  );
  const heureIndex = headers.findIndex((h) => h.includes("heure"));

  if (localIndex === -1 || jourIndex === -1 || heureIndex === -1) {
    throw new Error("Colonnes requises non trouvées dans le CSV (locaux bloqués).");
  }

  const set = new Set();
  lines.slice(1).forEach((line) => {
    const cols = parseCSVLine(line, separator);
    const local = cols[localIndex]?.trim() || "";
    const jour = cols[jourIndex]?.trim() || "";
    const heure = cols[heureIndex]?.trim() || "";
    if (!local || !jour || !heure) return;
    set.add(makeBlockedKey(jour, heure, local));
  });

  return set;
}

// Parse CSV/TSV line with custom separator (respects quotes)
function parseCSVLine(line, separator = ",") {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Split lines respecting quotes
function splitCSVLines(csvText) {
  const lines = [];
  let currentLine = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        currentLine += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "\n" && !inQuotes) {
      lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

// Normaliser local
function normalizeLocal(local) {
  return local.replace(/\s+/g, "");
}

function normalizeDayOrHour(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeTimeRange(value) {
  const raw = String(value || "").toLowerCase();
  const matches = [...raw.matchAll(/(\d{1,2})\s*[h:]\s*(\d{2})/g)].map(
    (m) => `${m[1].padStart(2, "0")}:${m[2]}`,
  );
  if (matches.length >= 2) return `${matches[0]}-${matches[matches.length - 1]}`;
  if (matches.length === 1) return matches[0];
  return raw.replace(/\s+/g, "");
}

function makeBlockedKey(jour, heure, local) {
  const localKey = normalizeLocal(String(local || "")).toUpperCase();
  const dayKey = normalizeDayOrHour(jour);
  const timeKey = normalizeTimeRange(heure);
  return `${dayKey}||${timeKey}||${localKey}`;
}

function isBlocked(jour, heure, local) {
  return blockedSet.has(makeBlockedKey(jour, heure, local));
}

// Extraire pavillon
function getPavillon(local) {
  const letter = local.split("-")[0];
  if (["A", "B", "C"].includes(letter)) return "principal";
  if (["L", "M"].includes(letter)) return "lassonde";

  return "other";
}

// Parser heure pour tri
function parseTimeKey(heure) {
  const match = heure.match(/(\d{1,2})[h:](\d{2})/);
  if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  return 0;
}

// Trier locaux
function sortLocals(locals) {
  return locals.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10);
    const nb = parseInt(b.replace(/\D/g, ""), 10);

    // Lassonde = décroissant
    if (pavillon === "lassonde") {
      return nb - na;
    }

    // Principal (et autres) = croissant
    return na - nb;
  });
}

// Grouper données
function groupData(data) {
  const groups = {};
  data.forEach((row) => {
    const pav = getPavillon(row.local);

    if (!groups[pav]) groups[pav] = {};
    if (!groups[pav][row.jour]) groups[pav][row.jour] = {};

    // Une ligne peut contenir plusieurs plages horaires séparées par des virgules.
    const slots = String(row.heure || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const local = normalizeLocal(row.local);

    slots.forEach((slot) => {
      if (!groups[pav][row.jour][slot]) groups[pav][row.jour][slot] = {};

      if (!groups[pav][row.jour][slot][local]) {
        groups[pav][row.jour][slot][local] = { qty: 0, rows: [] };
      }

      groups[pav][row.jour][slot][local].qty += row.quantite;
      groups[pav][row.jour][slot][local].rows.push(row);
    });
  });
  return groups;
}

// Charger données
async function loadData() {
  try {
    document.getElementById("error-message").style.display = "none";

    const dataRes = await fetch(csvUrl);
    if (!dataRes.ok) throw new Error("Erreur réseau (données livraisons)");
    const csvText = await dataRes.text();

    let blockedText = "";
    try {
      const blockedRes = await fetch(blockedLocalsUrl);
      if (!blockedRes.ok) {
        console.warn("Blocked TSV non disponible:", blockedRes.status);
      } else {
        blockedText = await blockedRes.text();
      }
    } catch (e) {
      console.warn("Blocked TSV fetch error:", e);
    }

    console.log("CSV Text:", csvText);
    if (blockedText) {
      console.log("Blocked TSV Text:", blockedText);
    }

    data = parseCSV(csvText);
    
    blockedSet = blockedText ? parseBlockedCSV(blockedText) : new Set();
    console.log("Parsed data length:", data.length);
    console.log("First data item:", data[0]);

    groups = groupData(data);
    
    populateDaySelect(groups);
    
    displayData(groups);
    
  } catch (error) {
    const el = document.getElementById("error-message");
    el.innerHTML =
      "Erreur lors du chargement des données: " +
      error.message +
      ' <button onclick="loadData()">Réessayer</button>';
    el.style.display = "block";
  }
}

function extractDayNumber(str) {
  // "Jeudi 13 février" -> 13
  const m = str.match(/\b(\d{1,2})\b/);
  return m ? parseInt(m[1], 10) : 999;
}

// Peupler select jour
function populateDaySelect(groups) {
  const select = document.getElementById("day-select");
  select.innerHTML = "";

  const days = Object.keys(groups[pavillon] || {}).sort((a, b) => {
    return extractDayNumber(a) - extractDayNumber(b);
  });
  console.log(days);
  days.forEach((day) => {
    const option = document.createElement("option");
    option.value = day;
    option.textContent = day.split(" ")[0];
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    localStorage.setItem("selectedDay", select.value);
    console.log("Saved:", select.value);
  });
  if (days.includes(selectedDay)) {
    select.value = selectedDay;
  } else {
    selectedDay = days[0] || "";
    select.value = selectedDay;
  }
}

// Afficher données
function displayData(groups) {
  const content = document.getElementById("content");
  content.innerHTML = "";
  const distribution = totalNumberByPavillon(groups, selectedDay);
  document.getElementById("total-done-principal").textContent =
    `${distribution.principal.livree}/${distribution.principal.total}`;
  document.getElementById("total-done-lassonde").textContent =
    `${distribution.lassonde.livree}/${distribution.lassonde.total}`;

  const pavData = groups[pavillon];
  if (!pavData || !pavData[selectedDay]) {
    content.innerHTML =
      '<p class="no-data">Aucune livraison pour ce filtre.</p>';
    return;
  }
  
  const dayData = pavData[selectedDay];
  const timeSlots = Object.keys(dayData).sort(
    (a, b) => parseTimeKey(a) - parseTimeKey(b),
  );

  timeSlots.forEach((slot) => {
    const parentDiv = document.createElement("div");
    parentDiv.dataset.slot = slot;
    const slotDiv = document.createElement("div");
    const resumeDiv = document.createElement("div");

    parentDiv.className = "time-slot";
    const timeIntervale = slot.split("-");
    slotDiv.innerHTML = `<h3>${timeIntervale[0]}-${timeIntervale[timeIntervale.length - 1]}</h3>`;
    const resumeTimeSlotData = resumeTimeSlot(dayData[slot]);
    console.log("Resume for slot", slot, resumeTimeSlotData.nbroses);
   
    resumeDiv.className = "resume-slot";
    resumeDiv.innerHTML = `<p>  ${resumeTimeSlotData.nbroses}&nbsp;🌹 ${resumeTimeSlotData.cartes}&nbsp;💌</p>
                            <p>  ${resumeTimeSlotData.chocolat.Amandes != 0 ? `${resumeTimeSlotData.chocolat.Amandes}&nbsp;Almond` : ""}
                             ${resumeTimeSlotData.chocolat.Lait != 0 ? `${resumeTimeSlotData.chocolat.Lait}&nbsp;Milk` : ""}</p>
                            <p>  ${resumeTimeSlotData.chocolat["Noir Queen"] != 0 ? `${resumeTimeSlotData.chocolat["Noir Queen"]}&nbsp;Noir&nbsp;Queen` : ""}
                              ${resumeTimeSlotData.chocolat["Sel de mer"] != 0 ? `${resumeTimeSlotData.chocolat["Sel de mer"]}&nbsp;Sel&nbsp;de&nbsp;mer` : ""}</p>
                              <p>  ${resumeTimeSlotData.chorale != 0 ? `${resumeTimeSlotData.chorale}&nbsp;chorale` : ""}</p>`;
  
    const locals = Object.keys(dayData[slot]);
    const sortedLocals = sortLocals(locals);

    const list = sortedLocals
      .map((local) => {
        const d = dayData[slot][local];

        const qty = d.qty;
        const blocked = isBlocked(selectedDay, slot, local);
        const blockedBadge = blocked
          ? `<span class="blocked-icon" title="Local bloqué (pas de livraison)">▲</span>`
          : "";
        return `<span class="local local-style ${allLivrees(d.rows) ? "done" : ""} ${blocked ? "blocked" : ""}">${qty > 1 ? `${local} x${qty}` : local}${blockedBadge}</span>`;
      })
      .join(" ");

    slotDiv.innerHTML += `<p class="locals">${list}</p>`;
    parentDiv.appendChild(slotDiv);
    parentDiv.appendChild(resumeDiv);
    content.appendChild(parentDiv);
  });
}
function allLivrees(rows) {
  let ok = true;
  const notOk = [];
  for (const row of rows) {
    const v = String(row.livree || "")
      .trim()
      .toLowerCase();

    // Ignore les N/A (pas applicable / vide)
    if (v === "n/a" || v === "") {
      ok = false;
      notOk.push(row);
    }

    if (v !== "oui") {
      ok = false;
      notOk.push(row);
    }
  }

  return ok;
}

/**
 * ✅ Nouveau validateGotCheck
 * - Avant: togglait juste du CSS/texte.
 * - Maintenant: au clic, on fait un POST Apps Script avec le row associé.
 *
 * ⚠️ HALLUCINATION RISK: tu sembles vouloir “toggle” (annuler livraison).
 * Ton Apps Script, lui, fait seulement appendRow de logs. Donc on “toggle” pas réellement.
 * Ici, je fais: 1er clic => envoi + passe ✅ ; 2e clic => juste UI (pas d’API) par défaut.
 * Si tu veux log aussi l’annulation, on peut envoyer action="undelivered".
 */
async function validateGotCheck(btn) {
  if (!(btn instanceof HTMLElement)) return;

  // Anti double-clic
  if (btn.dataset.sending === "1") return;

  const sheetRow = parseInt(btn.dataset.row || "", 10);
  if (!Number.isFinite(sheetRow)) {
    alert("Erreur: sheetRow manquant");
    return;
  }

  // Retrouver la ligne
  const rowObj = data.find((r) => r.sheetRow === sheetRow);
  if (!rowObj) {
    alert("Erreur: commande introuvable");
    return;
  }

  const isDelivered = btn.classList.contains("check");

  // 👉 Si déjà livré → on envoie "undelivered"
  const action = isDelivered ? "undelivered" : "delivered";

  btn.dataset.sending = "1";
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = "Envoi...";

  try {
    await logDelivery(rowObj, action);

    if (action === "delivered") {
      btn.classList.add("check");
      btn.textContent = "Livrée✅";
      rowObj.livree = "oui"; // sync local
    } else {
      btn.classList.remove("check");
      btn.textContent = "Livrée❌";
      rowObj.livree = "non"; // sync local
    }
  } catch (e) {
    btn.textContent = old;
    alert("Erreur envoi: " + (e?.message || e));
  } finally {
    btn.disabled = false;
    btn.dataset.sending = "0";
  }
}

function resumeTimeSlot(dayDataslot) {
  const output = {
    nbroses: 0,
    chocolat: { Lait: 0, "Noir Queen": 0, Amandes: 0, "Sel de mer": 0 },
    cartes: 0,
    chorale: 0,
  };
  for (const [local, data] of Object.entries(dayDataslot)) {
    for (const row of data.rows) {
      
      const isCarte = row.carte;
      const isChocolat = row.chocolat;
      const nbChocolat = row.quantite;
      const nbRoses = row.nbroses;
      const isChorale = row.chorale;
      

      try {
        if (nbRoses != "N/A") output.nbroses += parseInt(nbRoses);
      } catch {
        console.log("Nb of roses was not a parseable");
      }
      try {
        console.log(isChocolat);
        if (isChocolat != "N/A")
          output.chocolat[isChocolat] += parseInt(nbChocolat);
      } catch {
        console.log("Nb of chocolates was not a parseable");
      }


      if (isChorale.toLowerCase() == "oui") output.chorale += 1;
      if (isCarte.toLowerCase() == "oui") output.cartes += 1;
    }
  }
  console.log("Output of resumeTimeSlot:", output);
  return output;
}

// Boutons pavillons
document.getElementById("pavillon-principal").addEventListener("click", () => {
  pavillon = "principal";

  localStorage.setItem("pavillon", pavillon);
  document.getElementById("pavillon-principal").classList.add("active");
  document.getElementById("pavillon-lassonde").classList.remove("active");

  if (data.length) {
    groups = groupData(data);
    populateDaySelect(groups);
    displayData(groups);
  }
});

document.getElementById("pavillon-lassonde").addEventListener("click", () => {
  pavillon = "lassonde";
  localStorage.setItem("pavillon", pavillon);
  document.getElementById("pavillon-lassonde").classList.add("active");
  document.getElementById("pavillon-principal").classList.remove("active");

  if (data.length) {
    groups = groupData(data);
    populateDaySelect(groups);
    displayData(groups);
  }
});

// Select jour + refresh
document.getElementById("day-select").addEventListener("change", (e) => {
  selectedDay = e.target.value;

  if (data.length) {
    groups = groupData(data);

    displayData(groups);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadData();
});

function totalNumberByPavillon(groupsLot, selectedDay) {
  const output = {
    principal: { total: 0, livree: 0 },
    lassonde: { total: 0, livree: 0 },
  };
  const seen = {
    principal: new Set(),
    lassonde: new Set(),
  };
  let pavData = groupsLot["lassonde"];
  try {
    for (const [x, hourData] of Object.entries(pavData[selectedDay])) {
      for (const localData of Object.entries(hourData)) {
        for (const livraisonData of localData[1].rows) {
          const key = String(livraisonData.sheetRow ?? "");
          if (!seen.lassonde.has(key)) {
            seen.lassonde.add(key);
            output["lassonde"].total += 1;
            if (livraisonData.livree.toLowerCase() === "oui") output["lassonde"].livree += 1;
          }
        }
      }
    }
  } catch (e) {}

  pavData = groupsLot["principal"];
  try {
    for (const [x, hourData] of Object.entries(pavData[selectedDay])) {
      for (const localData of Object.entries(hourData)) {
        for (const livraisonData of localData[1].rows) {
          const key = String(livraisonData.sheetRow ?? "");
          if (!seen.principal.has(key)) {
            seen.principal.add(key);
            output["principal"].total += 1;
            if (livraisonData.livree.toLowerCase() === "oui") output["principal"].livree += 1;
          }
        }
      }
    }
  } catch (e) {}
  return output;
}
// Click sur local => modal
document.addEventListener("click", (e) => {
  if (e.target.classList && e.target.classList.contains("local")) {
    document.body.classList.add("modal-open");
    const localText = e.target.textContent;
    const local = localText.split(" x")[0];

    const slotElement = e.target.closest(".time-slot");
    const slot = slotElement.dataset.slot;

    console.log(pavillon, selectedDay, slot, local);

    const localData = groups[pavillon]?.[selectedDay]?.[slot]?.[local];
    if (localData) {
      const modalBody = document.getElementById("modal-body");
      modalBody.innerHTML = `<h2>Détails pour ${local}</h2>`;

      const blocked = isBlocked(selectedDay, slot, local);
      if (blocked) {
        modalBody.innerHTML += `<p class="blocked-warning">▲ Local bloqué: pas de livraison ici.</p>`;
      }

      localData.rows.forEach((row) => {
        // ✅ IMPORTANT: on met data-row="${row.sheetRow}" pour retrouver l'objet.
        modalBody.innerHTML += `<div class="modal-div">
          <button class="local-style validee ${row.livree.toLowerCase() == "oui" ? "check" : ""}"
                  data-row="${row.sheetRow}"
                  onclick="validateGotCheck(this)">
            ${row.livree.toLowerCase() == "oui" ? "Livrée ✅" : "Livrée ❌"}
          </button>

          <h3>Commande  ${
            row.validee.toLowerCase() == "oui" ? "✅" : "❌(Non payée)"
          }: ${row.nbroses}🌹 ${row.carte.toLowerCase() == "oui" ? ", 1&nbsp;🎴" : ""} ${
            row.chocolat != "N/A"
              ? `, ${row.quantite}&nbsp;${row.chocolat}`
              : ""
          }${ row.chorale ? `, ${row.chorale}&nbsp;chorale` : "" }</h3>

          <p><strong>De:</strong> ${row.giver} ${
            row.anonymous.toLowerCase() == "oui"
              ? "<strong style='color: red;'>(ANONYME)</strong>"
              : ""
          }</p>

          <p><strong>À:</strong> ${row.receiver}</p>
          <p><strong>Instructions:</strong> ${row.instructions}</p>
          <hr>
        </div>`;
      });

      document.getElementById("modal").style.display = "block";
    }
  }
});

function closeModal() {
  document.getElementById("modal").style.display = "none";
  document.body.classList.remove("modal-open");
}

document.getElementById("close-modal").addEventListener("click", () => {
  closeModal();
});

document.getElementById("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal") {
    closeModal();
  }
});

// Chargement initial
loadData();
