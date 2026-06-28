document.addEventListener("DOMContentLoaded", () => {

  const STORAGE_KEY = "mealPlannerState";

  let selected = null;

  const palette = document.getElementById("palette");
  const board = document.getElementById("board");
  const editBtn = document.getElementById("editMealsBtn");

  const shopBox = document.getElementById("shoppingList");
  const copyBtn = document.getElementById("copyShop");

  if (!palette || !board || !editBtn || !shopBox || !copyBtn) {
    console.error("Missing DOM elements");
    return;
  }

  // ----------------------
  // DAYS
  // ----------------------

  let days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven"];

  // ----------------------
  // STATE
  // ----------------------

  function uid() {
    return Math.random().toString(36).slice(2, 11);
  }

  function defaultState() {
    return [
      { id: uid(), name: "taboulé", location: "palette" },
      { id: uid(), name: "haricots poulet riz", location: "palette" },
      { id: uid(), name: "poisson pané coquillettes", location: "palette" },
      { id: uid(), name: "nuggets chips", location: "palette" },
      { id: uid(), name: "pâtes knackis", location: "palette" },
      { id: uid(), name: "sandouiche", location: "palette" },
      { id: uid(), name: "repas boulot", location: "palette" },
      { id: uid(), name: "salade composée", location: "palette" },
    ];
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    try {
      return JSON.parse(raw);
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    refreshShoppingListFromGrid();
  }

  let state = loadState();

  // ----------------------
  // HELPERS
  // ----------------------

  function clearSelection() {
    document.querySelectorAll(".card").forEach(c =>
      c.classList.remove("selected")
    );
    selected = null;
  }

  function getItem(id) {
    return state.find(i => i.id === id);
  }

  // ----------------------
  // CARD
  // ----------------------

  function createCard(item) {

    const div = document.createElement("div");
    div.className = "card";
    div.textContent = item.name;
    div.dataset.id = item.id;

    let timer;
    let longPress = false;

    function openCardMenu() {

      const menu = document.createElement("div");
      menu.className = "card-menu";

      const renameBtn = document.createElement("button");
      renameBtn.textContent = "Rename";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";

      renameBtn.onclick = () => {
        const val = prompt("Rename :", div.textContent);
        if (val) {
          const it = state.find(i => i.id === div.dataset.id);
          if (it) it.name = val;

          saveState();
          render();
        }
        menu.remove();
      };

      deleteBtn.onclick = () => {
        state = state.filter(i => i.id !== div.dataset.id);
        saveState();
        render();
      };

      menu.appendChild(renameBtn);
      menu.appendChild(deleteBtn);

      document.body.appendChild(menu);

      menu.addEventListener("click", (e) => {
        if (e.target === menu) menu.remove();
      });
    }

    div.addEventListener("pointerdown", () => {
      longPress = false;

      timer = setTimeout(() => {
        longPress = true;
        openCardMenu();
      }, 600);
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach(evt =>
      div.addEventListener(evt, () => clearTimeout(timer))
    );

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      if (longPress) return;

      clearSelection();
      selected = div;
      div.classList.add("selected");
    });

    div.addEventListener("dblclick", (e) => {
      e.stopPropagation();

      const item = getItem(div.dataset.id);
      if (!item) return;

      item.location = "palette";
      item.dayIndex = null;
      item.slotIndex = null;

      saveState();
      render();
      clearSelection();
    });

    return div;
  }

  // ----------------------
  // RENDER GRID
  // ----------------------

  function render() {

    palette.innerHTML = "";
    board.innerHTML = "";

    state
      .filter(i => i.location === "palette")
      .forEach(i => palette.appendChild(createCard(i)));

    days.forEach((day, dayIndex) => {

      const row = document.createElement("div");
      row.className = "row";

      const dayCell = document.createElement("div");
      dayCell.className = "day";
      dayCell.textContent = day;

      row.appendChild(dayCell);

      for (let slotIndex = 0; slotIndex < 2; slotIndex++) {

        const slot = document.createElement("div");
        slot.className = "slot";

        const item = state.find(i =>
          i.location === "grid" &&
          i.dayIndex === dayIndex &&
          i.slotIndex === slotIndex
        );

        if (item) {
          slot.appendChild(createCard(item));
        }

        slot.addEventListener("click", (e) => {
          if (e.target !== slot) return;
          if (!selected) return;

          const id = selected.dataset.id;
          const it = getItem(id);

          it.location = "grid";
          it.dayIndex = dayIndex;
          it.slotIndex = slotIndex;

          slot.appendChild(selected);

          clearSelection();
          saveState();
        });

        row.appendChild(slot);
      }

      board.appendChild(row);
    });
  }

  // ----------------------
  // PALETTE DROP
  // ----------------------

  palette.addEventListener("click", (e) => {

    if (e.target !== palette) return;
    if (!selected) return;

    const id = selected.dataset.id;
    const item = getItem(id);

    item.location = "palette";
    item.dayIndex = null;
    item.slotIndex = null;

    palette.appendChild(selected);

    clearSelection();
    saveState();
  });

  // ----------------------
  // SHOPPING LIST
  // ----------------------

  function buildShoppingList() {

    const counts = {};

    state
      .filter(i => i.location === "grid")
      .forEach(i => {
        counts[i.name] = (counts[i.name] || 0) + 1;
      });

    return counts;
  }

  function renderShoppingList() {

    const counts = buildShoppingList();

    shopBox.value = Object.entries(counts)
      .map(([name, count]) =>
        count > 1 ? `${name} x ${count}` : name
      )
      .join("\n");
  }

  function refreshShoppingListFromGrid() {
    renderShoppingList();
  }

  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(shopBox.value);
  });

  shopBox.addEventListener("input", () => {
    // editable, no persistence
  });

  // ----------------------
  // INIT
  // ----------------------

  render();
  renderShoppingList();

});