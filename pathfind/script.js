var whereFrom = "dush";
$(document).ready(function(){
    async function drawing(pathNum) {
        let pathFetch = await fetch('js/path_'+whereFrom+'.json')
        , pathArr = await pathFetch.json()
        , respStr = ""
        , thisLoc = pathArr[pathNum] // Для быстроты сокращаем массив из 700 лок до 1 локи
        , thisLocXY = {}; // Для массива вида "07" : 265, "31" : 524
    
        for (var elem in thisLoc) {
            thisLocXY[thisLoc[elem].x + '' + thisLoc[elem].y] = thisLoc[elem].to;
        }
        respStr += "<table class=\"path pathfind-table\" style=\"margin:auto;margin-top: -1px;\">";
        for (let row = 0; row < 6; row++) {
            respStr += "<tr>";
            for (let col = 0; col < 10; col++) {
                let cell = col + '' + row;
                respStr += "<td class=\"";
                respStr += (thisLocXY[cell] === undefined) ? " unlit" : " lit";
                respStr += "\">";
                if (thisLocXY[cell] !== undefined) {
                   respStr += "<div class=\"loc_num\">в "+thisLocXY[cell]+"</div>";
                }
                respStr += "</td>";
            }
            respStr += "</tr>";
        }
        respStr += "</table> <i>- "+((whereFrom=="dush")?"Душ":"Степи")+" - "+pathNum+" -</i>";
        $("#show_res").html(respStr);
    }
    async function pathing(fromStr, toStr, fromNum, toNum) {// FROM (str), TO (str), FROM (number), TO (number)
        let pathFetch = await fetch('js/path_'+whereFrom+'.json')
        , pathArr = await pathFetch.json()
        , concatFetch = await fetch('js/concat_'+whereFrom+'.json')
        , concatArr = await concatFetch.json()
        , respStr = "<hr>"
        , paths = [];
        if (fromNum === null) {
            fromNum = concatArr[fromStr];
        }
        if (toNum === null) {
            toNum = concatArr[toStr];
        }
        if (fromNum === undefined || isNaN(parseInt(fromNum))) {
            $("#search_res").html("<hr>В "+((whereFrom=="dush")?"Душе":"Степях")+" не найдена такая начальная локация.");
            return;
        }
        if (toNum === undefined || isNaN(parseInt(toNum))) {
            $("#search_res").html("<hr>В "+((whereFrom=="dush")?"Душе":"Степях")+" не найдена такая конечная локация.");
            return;
        }
        console.log(toNum)
        if (!Array.isArray(fromNum)) {
            fromNum = [parseInt(fromNum)];
            //console.log('fromNum was not an array')
        } // to array
        if (!Array.isArray(toNum)) {
            toNum = [parseInt(toNum)];
            //console.log('toNum was not an array')
        }
        if (toNum == fromNum && toNum.length == 1) {
            $("#search_res").html("<hr>Вы уже находитесь в этой локации.");
            return;
        }
        // gucchi
        if (fromNum.length > 1 || toNum.length > 1) {
            respStr = "<i>Минимум одна из локаций здесь дублируется (т.е. в "+((whereFrom=="dush")?"Душе":"Степях")+" больше одной локации с такими переходами).</i><br>";
        }
        fromNum.forEach(function callback(valFrom) { // Все возможные пути
            toNum.forEach(function callback(valTo) {
                if (valFrom != valTo) {
                    paths.push({"from" : valFrom, "to" : valTo});
                }
            });
        });
        paths.forEach(function callback(path, pathIndex) {
            let ended = false // Конец, путей больше нет. НА ВСЯКИЙ СЛУЧАЙ. Я ЖЕ ЗНАЮ, ВЫ НАЙДЕТЕ КАК СЛОМАТЬ.
            , tree = [] // Дерево найденных путей
            , treeLvl = 0 // Текущий ярус дерева
            , went = [path.from] // Какие локации мы уже просмотрели
            , completePath = []; // Готовый путь
            tree[0] = {[path.from] : -1}; // Новый ярус. Нулевой ярус - стартовая лока
            respStr += "<div>"; // Начало контейнера пути
            respStr += "<p align=center><b>[ "+(whereFrom=="dush"?"Душевая":"Степи")+" ] Путь №"+(pathIndex+1)+": из локации "+path.from+" в локацию "+path.to+"</b></p>";
            pathingLoop:
                while (!ended) {
                    tree[treeLvl+1] = []; // Создать новый ярус
                    for (var lookedLoc in tree[treeLvl]) { // Для каждой найденной локации на данном ярусе
                        for (var moveID in pathArr[lookedLoc]) { // Для каждого перехода на этой локации
                            let foundMove = pathArr[lookedLoc][moveID].to; // Найденный переход
                            if (went.indexOf(foundMove) === -1) { // Ещё не смотрели в этот переход
                                tree[treeLvl+1][foundMove] = parseInt(lookedLoc); // Добавить переход на следующий ярус. Выглядит как "индекс текущей локации" : индекс локации-родителя
                                went.push(foundMove); // Добавить переход в просмотренные
                                if (foundMove == path.to) { // Найденный переход - нужный нам
                                    break pathingLoop;
                                }
                            }
                        }
                    }
                    treeLvl++;
                    if (!tree[treeLvl].length) {// Если следующего яруса просто нет
                        ended = true; // fuck
                        respStr += "<br>Не надо так. Я даже не знаю, как это получилось.";
                    }
                }
            if (!ended) { // gucci
                completePath[treeLvl+1] = path.to; // Последняя, финальная локация
                completePath[treeLvl] = tree[treeLvl+1][path.to];
                let curr = completePath[treeLvl];
                while (treeLvl > 1) {
                    completePath[treeLvl-1] = tree[treeLvl][curr];
                    curr = completePath[treeLvl-1];
                    treeLvl--;
                }
                completePath[0] = path.from; // Первая, стартовая локация
            }
            for (let i = 0; i < completePath.length; i++) {
                let thisLoc = pathArr[completePath[i]] // Для быстроты сокращаем массив из 700 лок до 1 локи
                , thisLocXY = {}; // Для массива вида "07" : 265, "31" : 524
                for (var elem in thisLoc) {
                    thisLocXY[thisLoc[elem].x + '' + thisLoc[elem].y] = thisLoc[elem].to;
                }
                respStr += "<div class=\"search\">"; // Открыть блок с таблицей локации
                respStr += (i != completePath.length - 1) ? "Из "+completePath[i]+" в "+completePath[i+1] : "Локация "+completePath[i];
                respStr += "<br>";
                respStr += "<table class=\"path pathfind-table\">";
                for (let row = 0; row < 6; row++) {
                    respStr += "<tr>";
                    for (let col = 0; col < 10; col++) {
                        let cell = col + '' + row;
                        respStr += "<td class=\"";
                        respStr += (thisLocXY[cell] === undefined) ? " unlit" : " lit";
                        if (i != completePath.length - 1 && thisLocXY[cell] == completePath[i+1]) {
                            respStr += " dawey";
                        }
                        respStr += "\">";
                        if (thisLocXY[cell] !== undefined) {
                           respStr += "<div class=\"loc_num\">в "+thisLocXY[cell]+"</div>";
                        }
                        respStr += "</td>";
                    }
                    respStr += "</tr>";
                }
                respStr += "</table></div>";
            }
            respStr += "</div>"; // Конец контейнера пути
        });
        $("#search_res").html(respStr);
    }
	$('#sFind').click(function(){
		let f_num = $("#from_chk").prop("checked")?$("#from_num").val():null
		, t_num = $("#to_chk").prop("checked")?$("#to_num").val():null
		, f_str = $("#f_id").val()
		, t_str = $("#t_id").val();
		pathing(f_str, t_str, f_num, t_num);
		
		if ($(document).width()<=1000) {
             $("html, body").animate({scrollTop:$("#search_res").offset().top}, "slow");
 		}
		return false;
	});
	$('#sShow').click(function(){
		drawing($("#sh_loc").val())
		return false;
	});
	$('.search input').on('change', function() {
		let $lit = $("#"+$(this).attr('id')[0]+"_tbl input:checked"),
		val = "";
		$.each($lit, function() {
			val += $(this).attr('id').replace(/\D/, "");
		});
		$('#'+$(this).attr('id')[0]+"_id").val(val);
	});
	$('input[name="c1"]').on('change', function() {
		whereFrom = $(this).attr('id');
		let val = (whereFrom=="dush") ? 699 : 100;
		$('#sh_loc, #from_num, #to_num').attr({
		       "max" : val,
		       "placeholder" : val,
	    	}).val("");
	});
	$('.clear').on('click', function() {
		$("#"+$(this).attr('clear')+" input:checked").prop("checked", false);
	});
	$('#sh_loc').on('input', function(e) {
	});
	$("#switch").click(function(e) {
	    e.preventDefault();
	    let f_arr = [];
	    $("#f_tbl").find("input[type=checkbox]:checked").each(function(index,value) {
	        f_arr.push($(this).attr("id").substring(1));
	    });
	    let t_arr = [];
	    $("#t_tbl").find("input[type=checkbox]:checked").each(function(index,value) {
	        t_arr.push($(this).attr("id").substring(1));
	    });
	    let tmp = $("#t_id").val();
	    $("#t_id").val($("#f_id").val());
	    $("#f_id").val(tmp);
	    $(".clear").click();
	    tmp = $("#from_num").val();
	    $("#from_num").val($("#to_num").val());
	    $("#to_num").val(tmp);
	    $.each(f_arr, function(index,value) {$("#t"+value).prop("checked", true);});
	    $.each(t_arr, function(index,value) {$("#f"+value).prop("checked", true);});
	});
	$("body").on("change paste keyup", "#from_num, #to_num", function() {
	    let id = "#"+$(this).attr("id").split("_")[0]+"_chk"
	    , state = $(this).val()?true:false;
	    $(id).prop("checked", state);
	});
});
