const sheetID = '1bJ5ikDJt5fChhXafUZTYVxqzFOLw3d5okEAsm8Uvvmw';
const sheetName = 'Sheet';
const url = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${sheetName}&tqx=out:json`;
const table = {};

const items = {}, recipes = {};
fetch(url)
    .then(res => res.text())
    .then(text => {
        const json = JSON.parse(
            text.substring(47).slice(0, -2)
        );
        const rows = json.table.rows.map(row =>
            row.c.map(cell => cell?.f || cell?.v || null)
        );
        for (const row of rows) {
            const itemsName = row[0];
            const itemsFinalStatusStr = row[1];
            const itemsFinalStatus = {
                "Да": 2,
                "Частично": 1,
                "Нет": 0,
            }[itemsFinalStatusStr] ?? 0;
            if (itemsName) {
                items[itemsName] = itemsFinalStatus;
            }
            const recipesName = row[3];
            const recipesAmount = row[4];
            const recipesIngredient = row[5];
            const recipesCount = row[6];
            if (recipesName && recipesAmount && recipesIngredient && recipesCount) {
                if (!recipes[recipesName]) {
                    recipes[recipesName] = {
                        amount: +recipesAmount,
                        ingredients: [],
                    };
                }
                recipes[recipesName].ingredients.push({
                    name: recipesIngredient,
                    count: +recipesCount
                });
            }
        }

        // =======================
        // AUTOCOMPLETE
        // =======================
        const datalist = document.getElementById("itemsList");
        for (const name in items) {
            if ((items[name] ?? 0) > 1) continue;
            const option = document.createElement("option");
            option.value = name;
            datalist.appendChild(option);
        }
    })
    .catch(err => {
        console.error(
            'Ошибка загрузки таблицы:',
            err
        );
    });


// =======================
// СПИСОК КРАФТА
// =======================

const craftQueue = [];

function addCraft(){
    const input = document.getElementById("itemInput");
    const name = input.value.trim();
    if (items[name] === undefined) {
        alert("Предмет не найден");
        return;
    }

    // Ищем предмет в очереди
    const existingItem = craftQueue.find(
        entry => entry.name === name
    );

    // Если уже есть — увеличиваем количество
    if (existingItem) {
        existingItem.count++;
        // Защита от превышения лимита
        if (existingItem.count > 100000) {
            existingItem.count = 100000;
        }

    } else {
        // Иначе создаём новую запись
        craftQueue.push({
            name,
            count: 1
        });
    }

    input.value = "";

    renderCraftList();
}

function removeCraft(index){
    craftQueue.splice(index, 1);
    renderCraftList();
}

function renderCraftList(){
    const container = document.getElementById("craftList");
    container.innerHTML = "";
    craftQueue.forEach((entry, index) => {
        const div = document.createElement("div");
        div.className = "craft-item";
        div.innerHTML = `
            <input
                type="number"
                min="1"
                max="100000"
                value="${entry.count}"
                style="width:90px"
                onchange="updateCount(${index}, this.value)"
            >
            <div>
                <div>${entry.name}</div>
                <div class="id">${entry.name}</div>
            </div>
            <button onclick="removeCraft(${index})">
                Удалить
            </button>
        `;
        container.appendChild(div);
    });
}

function updateCount(index, value){
    value = parseInt(value);
    if (isNaN(value)) {
        value = 1;
    }
    value = Math.max(1, Math.min(100000, value));
    craftQueue[index].count = value;
}

// =======================
// РЕКУРСИВНЫЙ РАЗБОР
// =======================

function isFinal(itemId, deepMode){
    const status = items[itemId] ?? 0;
    if (deepMode) {
        return status === 2;
    }
    return status === 1 || status === 2;
}

const MAX_DEPTH = 50;
let recursionDetected = false;
function processItem(itemName, count, result, deepMode, depth = 0){
    // Защита от бесконечной рекурсии
    if (depth >= MAX_DEPTH) {
        recursionDetected = true;
        console.error(
            "Обнаружена слишком глубокая рекурсия у предмета:",
            itemName
        );
        return;
    }
    // Если предмет конечный
    if (isFinal(itemName, deepMode)) {
        if (!result[itemName]) {
            result[itemName] = 0;
        }
        result[itemName] += count;
        return;
    }

    // Если рецепта нет
    if (!recipes[itemName]) {
        console.error(
            "Обнаружен отсутствующий рецепт у предмета:",
            itemName
        );
        if (!result[itemName]) {
            result[itemName] = 0;
        }
        result[itemName] += count;
        return;
    }
    const recipe = recipes[itemName];
    const recipeAmount = recipe.amount || 1;
    // Во сколько раз масштабируем рецепт
    const multiplier = count / recipeAmount;
    // Разбираем рецепт
    for (const ingredient of recipe.ingredients) {
        processItem(
            ingredient.name,
            (ingredient.count ?? 1) * multiplier,
            result,
            deepMode,
            depth + 1
        );
    }
}

// =======================
// ПОДСЧЁТ
// =======================

function calculate(){
    recursionDetected = false;
    const deepMode =
        document.getElementById("deepBreakdown").checked;

    const result = {};

    for (const entry of craftQueue) {
        processItem(
            entry.name,
            entry.count,
            result,
            deepMode
        );
    }
    renderResult(result);
    if (recursionDetected) {
        alert(
            "Обнаружена рекурсия или слишком глубокая цепочка рецептов."
        );
    }
}

// =======================
// ВЫВОД
// =======================

function renderResult(result){
    const container = document.getElementById("result");
    container.innerHTML = "";
    const sorted = Object.entries(result)
        .sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
        container.innerHTML = "Ничего не найдено";
        return;
    }

    for (const [id, count] of sorted) {
        const div = document.createElement("div");
        div.className = "result-item";
        div.innerHTML = `
            <b>${items[id]?.name || id}</b>
            x${count.toFixed(2).replace(/\.00$/, "")}
            <div class="id">${id}</div>
        `;
        container.appendChild(div);
    }
}
