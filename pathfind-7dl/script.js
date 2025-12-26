var ready = false;
var map, search;
(async () => {
    const mapFetch = await fetch('js/map.json');
    map = await mapFetch.json();
    const searchFetch = await fetch('js/search.json');
    search = await searchFetch.json();
    ready = true;
})();
$(document).ready(function(){
    const inputs = ['#inputLab', '#inputDirection', '#inputNum'];
    inputs.forEach(selector => {
        const el = $(selector);
        const key = 'input:' + el.attr('id');
        const saved = localStorage.getItem(key);

        if (saved !== null) {
            el.val(saved);
        }
    });
    $('#inputLab, #inputDirection').on('change', function () {
        localStorage.setItem('input:' + this.id, this.value);
    });
    $('#inputNum').on('input', function () {
        localStorage.setItem('input:' + this.id, this.value);
    });
    const getLabName = function(lab) {
        return (lab || $('#inputLab').val()).split('(')[0].trim();
    };
    const isLabUpper = function(lab) {
        return (lab || $('#inputLab').val()).indexOf('(верхний)') !== -1;
    };
    const getLocCount = function() {
        const lab = getLabName();
        const sign = $('#inputLab').val().indexOf('(верхний)') !== -1 ? -1 : 1;
        return Object.keys(map[lab]).filter(v => (sign > 0) ? +v > 0 : +v < 0).length;
    };
    $("#findWay").click(function() {
        const labFullName = $('#inputLab').val();
        const labName = getLabName();
        const isUpper = isLabUpper();
        const nameShort = labName.replace(/[^А-ЯЁ]/g, '') + " (" + (isUpper ? "в" : "н") + ")";
        const loc = +$("#inputNum").val();
        if (loc < 0 || loc > getLocCount()) {
            return alert(`В этом лабиринте (${labName}) нет столько локаций (${loc})`);
        }
        const drawCount = 10;
        const direction = !!(+$("#inputDirection").val());
        const shouldIncrement = !isUpper && direction || isUpper && !direction;
        const step = shouldIncrement ? 1 : -1;
        const end = loc + step * drawCount;
        let tableHtml = `<div><p class="mb-0 mx-2"><i>Синим цветом отмечены переходы, ведущую в Морскую параллель (домой для МВ/ВТ). Зелёным цветом - переходы, ведущие в Озёрную параллель (домой для ОВ). Жмякните стрелочку рядом с локацией, чтобы перейти в неё и продолжить путь!</i></p><p class="mb-1 mx-2"><i>Отсюда >>> Идём сюда</i></p></div>`;
        for (let i = loc; i !== end + step; i += step) {
            let locData = map[labName][i];
            if (!locData) {
                break;
            }
            tableHtml += `<div class="search p-2"><table class="path pathfind-table">`;
            for (let row = 0; row < 6; row++) {
                tableHtml += "<tr>";
                for (let col = 0; col < 10; col++) {
                    const data = locData[`${col + 1}x${row + 1}`];
                    let cl = "unlit";
                    if (data !== undefined) {
                        cl = "lit highlight-" + (data ? "blue" : "green");
                    }
                    tableHtml += `<td class="${cl}"></td>`;
                }
                tableHtml += "</tr>";
            }

            tableHtml += `</table><div><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" data-id="${i}" data-lab="${labFullName}" class="bi bi-arrow-up-square-fill locCopy" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" class="arrow-bg"/><path d="M2 16a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2zm6.5-4.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 1 0"/></svg>
<i>${nameShort} - ${i}</i></div></div>`;
        }
        $("#res").html(tableHtml);
    });
    $("#res").on("click", ".locCopy", function() {
        $("#inputLab").val($(this).data("lab"));
        $("#inputNum").val($(this).data("id"));
        $("#findWay").click();
    });
    $("#findNum").click(function() {
        if (!ready) return alert("Подождите, пока загрузятся карты (обычно это занимает не более 10 секунд)");
        const checkedCells = [];
        $('#f_tbl tr').each((r, tr) => {
            $('td', tr).each((c, td) => {
                if ($('input:checked', td).length) checkedCells.push(`${c+1}x${r}`);
            });
        });
        const key = checkedCells.join("|");
        const lab = $('#inputLab').val();
        const labName = getLabName();

        let locId = search[labName]?.[key];
        if (locId instanceof Array) { // Несколько локаций с такими переходами
            const isUpper = isLabUpper();
            locId = locId.filter(v => isUpper ? v < 0 : v > 0);
            if (locId.length > 1) {
                alert("Локаций с таким составом переходов несколько" + (locId.length >= 10 ? ` (${locId.length} штук)` : `: ${locId.map(v => Math.abs(v)).join(", ")}.`));
                return;
            }
            if (locId.length < 1) {
                alert("Локация с таким составом переходов не найдена в этом лабиринте");
                return;
            }
            locId = locId[0];
        }
        if (locId) {
            locId = Math.abs(locId);
            $("#inputNum").val(locId);
            localStorage.setItem('input:inputNum', locId);
            alert("Локация найдена! Номер сохранён в окошке справа");
        } else {
            alert("Локация с таким составом переходов не найдена в этом лабиринте");
        }
    });
});
