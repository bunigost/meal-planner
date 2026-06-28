document.addEventListener("DOMContentLoaded", () => {
	const STORAGE_KEY = "mealPlannerState";
	let selected = null;
	const palette = document.getElementById("palette");
	const board = document.getElementById("board");
	const editBtn = document.getElementById("editMealsBtn");
	if (!palette || !board || !editBtn) {
		console.error("Missing DOM elements");
		return;
	}
	const DB_KEY = "mealDatabase";

	function loadDB() {
		const raw = localStorage.getItem(DB_KEY);
		return raw ? JSON.parse(raw) : {};
	}

	function saveDB() {
		localStorage.setItem(DB_KEY, JSON.stringify(mealDB));
	}
	let mealDB = loadDB();
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
		return [{
				id: uid(),
				name: "taboulé",
				location: "palette"
			},
			{
				id: uid(),
				name: "haricots poulet riz",
				location: "palette"
			},
			{
				id: uid(),
				name: "poisson pané coquillettes",
				location: "palette"
			},
			{
				id: uid(),
				name: "nuggets chips",
				location: "palette"
			},
			{
				id: uid(),
				name: "pâtes knackis",
				location: "palette"
			},
			{
				id: uid(),
				name: "sandouiche",
				location: "palette"
			},
			{
				id: uid(),
				name: "repas boulot",
				location: "palette"
			},
			{
				id: uid(),
				name: "salade composée",
				location: "palette"
			},
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
		renderShoppingList();
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
					renderShoppingList(); // 👈 ADD THIS
				}
				menu.remove();
			};
			deleteBtn.onclick = () => {
				state = state.filter(i => i.id !== div.dataset.id);
				saveState();
				render();
				renderShoppingList(); // 👈 ADD THIS
				menu.remove();
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
			renderShoppingList();
			clearSelection();
		});
		return div;
	}
	// ----------------------
	// RENDER
	// ----------------------
	function render() {
		palette.innerHTML = "";
		board.innerHTML = "";
		// palette
		state
			.filter(i => i.location === "palette")
			.forEach(i => palette.appendChild(createCard(i)));
		// grid
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
					saveState();
          render();
					clearSelection();
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
		saveState();
		clearSelection();
	});
	// ----------------------
	// MEAL EDITOR
	// ----------------------
	function openMealEditor() {
		const modal = document.createElement("div");
		modal.className = "modal";
		const content = document.createElement("div");
		content.className = "modal-content";
		const rows = [];
		// ----------------------
		// GROUP ALL EXISTING CARDS (palette + grid)
		// ----------------------
		const existing = {};
		state.forEach(i => {
			if (i.location === "palette") {
				existing[i.name] = (existing[i.name] || 0) + 1;
			}
		});
		// ----------------------
		// CREATE ROWS FROM EXISTING DATA
		// ----------------------
		function addRow(name = "", count = 1) {
			const row = document.createElement("div");
			row.className = "meal-row";
			const input = document.createElement("input");
			input.placeholder = "Meal name";
			input.value = name;
			const qty = document.createElement("input");
			qty.type = "number";
			qty.min = "0";
			qty.value = count;
			qty.style.width = "80px";
			row.appendChild(input);
			row.appendChild(qty);
			rows.push({
				input,
				qty
			});
			content.appendChild(row);
		}
		Object.entries(existing).forEach(([name, count]) => {
			addRow(name, count);
		});
		// ensure minimum 5 lines
		while (rows.length < 5) addRow();
		// ----------------------
		// ADD LINE BUTTON
		// ----------------------
		const addBtn = document.createElement("button");
		addBtn.textContent = "+ Add line";
		addBtn.onclick = () => addRow();
		// ----------------------
		// SAVE BUTTON
		// ----------------------
		const saveBtn = document.createElement("button");
		saveBtn.textContent = "Save";
		saveBtn.onclick = () => {
			const newLibrary = [];
			// rebuild palette definition
			rows.forEach(r => {
				const name = r.input.value.trim();
				const count = parseInt(r.qty.value || "0", 10);
				if (!name || count <= 0) return;
				newLibrary.push({
					name,
					count
				});
			});
			// ----------------------
			// UPDATE ONLY PALETTE LOGIC
			// ----------------------
			const gridItems = state.filter(i => i.location === "grid");
			const paletteItems = [];
			newLibrary.forEach(item => {
				for (let i = 0; i < item.count; i++) {
					paletteItems.push({
						id: uid(),
						name: item.name,
						location: "palette"
					});
				}
			});
			// IMPORTANT: keep grid untouched
			state = [...gridItems, ...paletteItems];
			saveState();
			render();
			modal.remove();
		};
		// ----------------------
		// MODAL BUILD
		// ----------------------
		const actions = document.createElement("div");
		actions.className = "modal-actions";
		actions.appendChild(addBtn);
		actions.appendChild(saveBtn);
		content.appendChild(actions);
		modal.appendChild(content);
		modal.addEventListener("click", e => {
			if (e.target === modal) modal.remove();
		});
		document.body.appendChild(modal);
	}
	render();
	renderShoppingList();
	editBtn.addEventListener("click", openMealEditor);
	// ----------------------
	// SHOPPING LIST (GRID ONLY)
	// ----------------------
	function generateShoppingList() {
		const counts = {};
		state
			.filter(item => item.location === "grid")
			.forEach(item => {
				counts[item.name] = (counts[item.name] || 0) + 1;
			});
		return counts;
	}

	function renderShoppingList() {
		const box = document.getElementById("shoppingList");
		if (!box) return;
		const counts = generateShoppingList();
		box.value = Object.entries(counts)
			.map(([name, count]) =>
				count > 1 ? `${name} x${count}` : name
			)
			.join("\n");
	}
});