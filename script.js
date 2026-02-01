const csvUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQyYJT1wbXG7RO48tUyxCIcrXM45s_pl3Q-VRLzehz_zQV2UBBb9nCIUnCPDjtO8HhgublZihdiQlSd/pub?gid=914010777&single=true&output=tsv";

let data = [];
let groups = {};

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
  const quantiteIndex = headers.findIndex((h) =>
    h.includes("Combien de chocolats achetés"),
  );
  const giverIndex = headers.findIndex((h) => h.includes("acheteur"));
  const receiverIndex = headers.findIndex((h) => h.includes("destinataire"));
  const messageIndex = headers.findIndex((h) => h.includes("Demande spéciale"));
  const nbrosesIndex = headers.findIndex((h) => h.includes("nbroses"));
  const chocolatIndex = headers.findIndex((h) =>
    h.includes("entrez la sorte du chocolat acheté"),
  );
  const anonymousIndex = headers.findIndex((h) => h.includes("anonyme"));
  const instructionsIndex = headers.findIndex((h) =>
    h.includes("demande spéciale pour la livraison"),
  );
  const carteIndex = headers.findIndex((h) => h.includes("carte"));

  const valideeIndex = headers.findIndex((h) => h.includes("vérification"));

  console.log("Indices:", {
    localIndex,
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
  });

  if (localIndex === -1 || jourIndex === -1 || heureIndex === -1) {
    throw new Error("Colonnes requises non trouvées dans le CSV.");
  }

  return lines.slice(1).map((line) => {
    const cols = parseCSVLine(line, separator);

    const local = cols[localIndex]?.trim().toUpperCase() || "";
    const jour = cols[jourIndex]?.trim() || "";
    const heure = cols[heureIndex]?.trim() || "";

    const quantite =
      quantiteIndex !== -1 ? parseInt(cols[quantiteIndex]?.trim(), 10) || 1 : 1;

    const giver = giverIndex !== -1 ? cols[giverIndex]?.trim() || "N/A" : "N/A";
    const receiver =
      receiverIndex !== -1 ? cols[receiverIndex]?.trim() || "N/A" : "N/A";
    const message =
      messageIndex !== -1 ? cols[messageIndex]?.trim() || "N/A" : "N/A";

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

    return {
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
    };
  });
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
    const [aLetter, aNum] = a.split("-");
    const [bLetter, bNum] = b.split("-");
    if (aLetter !== bLetter) return aLetter.localeCompare(bLetter);
    return parseFloat(aNum) - parseFloat(bNum);
  });
}

// Grouper données
function groupData(data) {
  const groups = {};
  data.forEach((row) => {
    const pav = getPavillon(row.local);

    if (!groups[pav]) groups[pav] = {};
    if (!groups[pav][row.jour]) groups[pav][row.jour] = {};
    if (!groups[pav][row.jour][row.heure])
      groups[pav][row.jour][row.heure] = {};

    const local = normalizeLocal(row.local);

    if (!groups[pav][row.jour][row.heure][local]) {
      groups[pav][row.jour][row.heure][local] = { qty: 0, rows: [] };
    }

    groups[pav][row.jour][row.heure][local].qty += row.quantite;
    groups[pav][row.jour][row.heure][local].rows.push(row);
  });

  return groups;
}

// Charger données
async function loadData() {
  try {
    document.getElementById("error-message").style.display = "none";

    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("Erreur réseau");

    const csvText = await response.text();
    console.log("CSV Text:", csvText);

    data = parseCSV(csvText);
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

// Peupler select jour
function populateDaySelect(groups) {
  const select = document.getElementById("day-select");
  select.innerHTML = "";

  const days = Object.keys(groups[pavillon] || {}).sort();
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
    resumeDiv.className = "resume-slot";
    resumeDiv.innerHTML = `<p>${resumeTimeSlotData.nbroses} 🌹, ${resumeTimeSlotData.cartes} 🎴</p>
                            <p>${resumeTimeSlotData.chocolat.Amandes != 0 ? `${resumeTimeSlotData.chocolat.Amandes} Almond` : ""}
                            ${resumeTimeSlotData.chocolat.Lait != 0 ? `${resumeTimeSlotData.chocolat.Lait} Milk` : ""}</p>
                            <p>${resumeTimeSlotData.chocolat["Noir Queen"] != 0 ? `${resumeTimeSlotData.chocolat["Noir Queen"]} Noir Queen` : ""}
                            ${resumeTimeSlotData.chocolat["Sel de mer"] != 0 ? `${resumeTimeSlotData.chocolat["Sel de mer"]} Sel de mer` : ""}</p>`;

    const locals = Object.keys(dayData[slot]);
    const sortedLocals = sortLocals(locals);

    const list = sortedLocals
      .map((local) => {
        const d = dayData[slot][local];
        const qty = d.qty;
        return `<span class="local">${qty > 1 ? `${local} x${qty}` : local}</span>`;
      })
      .join(" ");

    slotDiv.innerHTML += `<p class="locals">${list}</p>`;
    parentDiv.appendChild(slotDiv);
    parentDiv.appendChild(resumeDiv);
    content.appendChild(parentDiv);
  });
}

function resumeTimeSlot(dayDataslot) {
  const output = {
    nbroses: 0,
    chocolat: { Lait: 0, "Noir Queen": 0, Amandes: 0, "Sel de mer": 0 },
    cartes: 0,
  };
  for (const [local, data] of Object.entries(dayDataslot)) {
    for (const row of data.rows) {
      const isCarte = row.carte;
      const isChocolat = row.chocolat;
      const nbChocolat = row.quantite;
      const nbRoses = row.nbroses;

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

      if (isCarte == "Oui") output.cartes += 1;
    }
  }
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
// Click sur local => modal
document.addEventListener("click", (e) => {
  if (e.target.classList && e.target.classList.contains("local")) {
    const localText = e.target.textContent;
    const local = localText.split(" x")[0];

    const slotElement = e.target.closest(".time-slot");
    const slot = slotElement.dataset.slot;
    console.log(pavillon, selectedDay, slot, local);
    const localData = groups[pavillon]?.[selectedDay]?.[slot]?.[local];
    if (localData) {
      const modalBody = document.getElementById("modal-body");
      modalBody.innerHTML = `<h2>Détails pour ${local}</h2>`;

      localData.rows.forEach((row) => {
        modalBody.innerHTML += `<div class="modal-div">
        <h3>Commande  ${row.validee == "oui" ? "✅" : "❌(Non payée)"}: ${row.nbroses}🌹  ${row.chocolat != "N/A" ? `, ${row.quantite} ${row.chocolat}` : ""} ${row.carte == "Oui" ? ", 1🎴" : ""} </h3>
          <p><strong>De:</strong> ${row.giver} ${row.anonymous == "Oui" ? "<strong style='color: red;'>(ANONYME)</strong>" : ""}</p>
          <p><strong>À:</strong> ${row.receiver}</p>
          <p><strong>Instructions:</strong> ${row.instructions}</p>
          <hr></div>
        `;
      });

      document.getElementById("modal").style.display = "block";
    }
  }
});

document.getElementById("close-modal").addEventListener("click", () => {
  document.getElementById("modal").style.display = "none";
});

// Chargement initial
loadData();
