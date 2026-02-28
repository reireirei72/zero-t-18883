function addLeadZero(num) {
	return num < 10 ? '0' + num : num;
}
function error(message) {
	$('#additional_output').val($('#additional_output').val() + message + '\n');
}
function dateToStr(date) {
	return date.getFullYear() 
	+ '-' + addLeadZero(date.getMonth()+1) 
	+ '-' + addLeadZero(date.getDate());
}
function dt_format(date) {
	return addLeadZero(date.getDate())
	+ '.' + addLeadZero(date.getMonth()+1); 
}

function format(array, mask) {
	let string = '', new_array = [];
	for (let i in array) {
		new_array.push(mask.replace(/%ID%/g, array[i]))
	}
	return new_array
}

const months = {
	"января": 0, 
	"февраля": 1, 
	"марта": 2, 
	"апреля": 3, 
	"мая": 4, 
	"июня": 5, 
	"июля": 6, 
	"августа": 7, 
	"сентября": 8, 
	"октября": 9, 
	"ноября": 10, 
	"декабря": 11
};
const locDictionary = {
    "ВЛ" : "Валежник",
    "ГБ" : "Галечный берег",
    "ГТР" : "Главный туннель Реки",
    "ГТД" : "Грохочущая тропа Двуногих",
    "ДР" : "Дубрава",
    "ИТ" : "Илистая тропа",
    "ЛР" : "Лесной ручеёк",
    "МР" : "Междуречье",
    "МЗ" : "Мшистые земли",
    "НК" : "Нагретые камни",
    "ОТ" : "Остров туманов",
    "ПИ" : "Плакучая ива",
    "РО" : "Разрушенная ограда",
    "РД" : "Расколотое дерево",
    "СК" : "Скользкие камни",
    "ТФ" : "Торфяник",
    "ТБ" : "Травянистый берег",
    "ШТ" : "Шелестящий тростник",
};
$(document).ready(function() {
	var date = new Date();
	if (date.getDay() != 6) { // Суббота
		date.setDate(date.getDate() - date.getDay() - 1);
	}
	$('#date').val(dateToStr(date));
	$('#count').click(function() {
		var herbGathering = [];
		$('#additional_output').val('');
		date = new Date($('#date').val());
		const thisFri = new Date(date);
		thisFri.setDate(thisFri.getDate() - 1); thisFri.setHours(17);
		const lastWeek = new Date(thisFri);
		lastWeek.setDate(lastWeek.getDate() - 6); lastWeek.setHours(11);
		while (lastWeek <= thisFri) { // Заполняем неделю расписанием
			const hours_assoc = {
				'11': 'веточник',
				'16': 'травник',
				'17': 'мховник'
			};
			const cur = lastWeek.getHours();
			herbGathering.push({
				year: lastWeek.getFullYear(),
				month: lastWeek.getMonth(),
				day: lastWeek.getDate(),
				hour: lastWeek.getHours(),
				type: hours_assoc[cur],
				catsLocs: {},
			});
			if (cur == 11) {
				lastWeek.setHours(cur + 5);
			} else if (cur == 16) {
				lastWeek.setHours(cur + 1);
			} else {
				lastWeek.setHours(cur + 18);
			}
		}
		lastWeek.setDate(lastWeek.getDate() - 7);
		lastWeek.setHours(11);
		var comments = $('#comments').val().split('\n')
		var gathering_date = new Date(), gathering_type, comment_num;
		for (const string_i in comments) {
			var string = comments[string_i].trim();
			if (!string.length
				|| ['Ответить | Цитировать', 'Ответить', 'Цитировать'].includes(string)) { // Сраные моды
				continue;
			}
			if (string[0] == '#') {
				// #2 21 февраля в 12:23 @ ГадёнышЖалоба | Удалить
				const strdate = string.split(' @ ')[0].trim().replace(/^#\d+ /, '').split(' в ');
				comment_num = string.match(/^#(\d+)/)[1];
				let strday = strdate[0], strtime = strdate[1];
				if (strday.indexOf('Сегодня') !== -1) {
					const today = new Date();
					strday = dateToStr(today);
				} else if (strday.indexOf('Вчера') !== -1) {
					let yesterday = new Date();
					yesterday.setDate(yesterday.getDate() - 1);
					strday = dateToStr(yesterday);
				} else {
					let today = new Date();
					let re = strday.match(/(\d+) ([а-яё]+) ?(\d+)?/);
					today.setDate(1);
					today.setMonth(months[re[2]]); today.setDate(re[1]);
					if (re[3]) {
						today.setFullYear(re[3]);
					}
					strday = dateToStr(today);
				}
				strtime = strtime.split(':');
				gathering_date = new Date(strday);
				gathering_date.setHours(strtime[0]); gathering_date.setMinutes(strtime[1]);
			} else if (/^Тип травника:/u.test(string)) {
				let re = string.match(/^Тип травника: ?([А-яЁё]+);?/);
				if (!re || !re[1]) {
					return error(`Что-то не так с типом травника в комменте #${comment_num}. Строчка выглядит как "${string}".`);
				}
				gathering_type = re[1].trim().toLowerCase();
				if (!['веточник', 'травник', 'мховник'].includes(gathering_type)) {
					return error(`Что-то не так с типом травника в комменте #${comment_num}. Строчка выглядит как "${string}".`);
				}
			} else if (/^Дата:/u.test(string)) {
				let re = string.match(/^Дата: ?(\d+)\.(\d+)\.?(\d+)?/u);
				if (!re || !re[2]) {
					return error(`Вероятно, ошибка в дате на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Регулярочка под "Дата: дд.мм" не сработала.`);
				}
				gathering_date.setDate(1);
				gathering_date.setMonth(+(re[2]) - 1);
				gathering_date.setDate(re[1]);
				if (re[3]) {
					const year = +((re[3].length == 2) ? "20" + re[3] : re[3]);
					gathering_date.setFullYear(year);
				}
			} else if (/.*:.*/u.test(string)) {
				let re = string.match(/^(?<locs>[А-ЯЁа-яё ,]+): (?<cats>[А-ЯЁа-яё \[\]\d\(\),]+)/u);

				if (!re || !re.groups.locs || !re.groups.cats) {
					return error(`Что-то не так с участниками #${comment_num}. Строчка выглядит как "${string}". Мы нашли двоеточие в строке, но не поняли, что происходит`);
				}
                let locs = re.groups.locs.split(',').map(loc => {
                	loc = loc.trim();
                	loc = locDictionary[loc.toUpperCase()] || loc;
                	loc = loc.toLowerCase();
                	return loc;
                });
                locs.sort((a, b) => a - b);
                locs = locs.join(',');
                const instance = _.find(herbGathering, {
                	year: gathering_date.getFullYear(),
                	month: gathering_date.getMonth(),
                	day: gathering_date.getDate(),
                	type: gathering_type});
                if (!instance) {
					error(`Не нашли в расписании травник, коммент #${comment_num}.`);
					continue;
                }
                const catsLocs = instance.catsLocs;
                // Проверка есть ли такой кот уже где-то
                let existing = [];
                for (const existingLoc in catsLocs) {
                	existing = existing.concat(catsLocs[existingLoc]);
                }
                let cats = re.groups.cats.split(',').map(cat => {
                	cat = cat.trim();
                	let id = +(cat.replace(/\D/g, ''));
                	if (id < 1) {
                		error(`Неправильный/пустой ID у кота ${cat} в травнике, коммент #${comment_num}. Котик не засчитан`);
                	} else if (_.find(existing, {id})) {
                		error(`Уже записан кот ${id} в травник, коммент #${comment_num}.`);
                	}
                	let type = 'normal';
                	if (cat.indexOf('(') !== -1) {
                		let tmpType = cat.split('(')[1].split(')')[0].toLowerCase();
                		if (tmpType === 'север') {
                			type = 'north';
                		} else if (['дятел', 'д', 'наблюд', 'наблюдатель'].includes(tmpType)) {
                			type = 'watch';
                		} else {
                			type = 'unknown';
                		}
                	}
                	return {id, type};
                }).filter(({id}) => id > 0);
                if (catsLocs[locs] !== undefined) { // Надо добавить котиков к существующим
                	catsLocs[locs] = catsLocs[locs].concat(cats);
                } else { // Достаточно просто поставить котиков
                	catsLocs[locs] = cats;
                }
			} else {
				// Где я???
			}
		}
		var missing = [];
		for (const i in herbGathering) {
			const now = herbGathering[i];
			if (Object.keys(now.catsLocs).length < 1) {
				const date = new Date(now.year, now.month, now.day)
				missing.push({date: dt_format(date), type: now.type})
			}
		}
		if (missing.length) {
			error('Не отписаны/не собраны травники:');
			for (const i in missing) {
				const now = missing[i];
				let str = `${now.date} (${now.type})`;
				error(str);
			}
		}
		let count = [];
		const valueTable = {
			// за травники зависит от плодородности локации ([плодородность + 1])
			"нагретые камни": 6,
			"лесной ручеёк": 6,
			"междуречье": 6,
			"расколотое дерево": 5,
			"разрушенная ограда": 5,
			"травянистый берег": 3,
			"галечный берег": 3,
			// за мховники - от количества мха
			"дубрава" : 8,
			"остров туманов" : 7,
			"мшистые земли" : 4,
			"валежник" : 4,
			"илистая тропа" : 4,
			"торфяник" : 4,
			"скользкие камни" : 3,
			"плакучая ива" : 2,
			"шелестящий тростник" : 2,
			"главный туннель реки" : 1,
			"грохочущая тропа двуногих" : 1,
		};
		for (const i in herbGathering) {
			const now = herbGathering[i];
			for (let locs in now.catsLocs) {
				const nowCats = now.catsLocs[locs];
				console.log("Считаем локации [", locs, "] котикам", nowCats.map(({id, type}) => id + ' (' + type + ')').join(', '));
				locs = locs.split(',');
				let locValueTotal = 0;
				if (now.type === 'веточник') {
					locValueTotal = locs.length * 2; // Каждая локация веточника стоит 2
				} else {
					for (const loc of locs) {
						if (valueTable[loc] === undefined) {
							error(`Неизвестная локация [${loc}] в травнике за ${addLeadZero(now.day)}.${addLeadZero(now.month + 1)}. Скрипт в шоках и не засчитал баллы за ценность локаций в этих локах`);
						} else {
							locValueTotal += valueTable[loc];
						}
					}
				}
				locValueTotal = Math.floor(locValueTotal / 8 / nowCats.length) * 0.25;
				const hasFarLocs = locs.filter(v => ["нагретые камни", "лесной ручеёк", "расколотое дерево", "травянистый берег", "валежник"].includes(v)).length > 0;
				const hasVeryFarLocs = locs.filter(v => ["мшистые земли", "остров туманов"].includes(v)).length > 0;
				const points = 1
				+ (hasFarLocs ? 0.25 : 0)
				+ (hasVeryFarLocs ? 0.5 : 0)
				+ locValueTotal;
				console.log('+0.25 баллов за дальние локации?', hasFarLocs)
				console.log('+0.5 баллов за очень дальние локации?', hasVeryFarLocs)
				console.log('Баллов за ценность локаций:', locValueTotal)
				console.log('Итого баллов за эти локации каждому:', points)
				console.log('')
				for (const cat of nowCats) {
					if (cat.type !== 'normal') continue; // Скипаем дятлов и север
					const instance = _.find(count, {id: cat.id});
					if (!instance) {
						count.push({id: cat.id, points});
					} else {
						instance.points += points;
					}
				}
			}
		}
		count.sort((a, b) => b.points - a.points);

		// Ищем активистов
		let first = count[0], first_group = [first.id], 
		second = count[1], second_group = [],
		i = 1;
		while (second && first.points === second.points) { // Ищем вторую группу (те кто набрал второе место по баллам)
			first_group.push(second.id);
			second = count[++i];
		}
		if (second) {
			second_group.push(second.id);
		}
		let third = count[++i];
		while (third && second.points === third.points) {
			second_group.push(third.id);
			third = count[++i];
		}
		let val = `Подсчёт баллов [${addLeadZero(date.getDate())}.${addLeadZero(date.getMonth()+1)}]:\n`;
		for (const i in count) {
			const cat = count[i];
			val += `${cat.id}	${cat.points.toString().replace('.',',')}\n`;
		};

		val += `\n\nАктивисты:`;		
		val += `\nI группа: ${(format(first_group, '[cat%ID%] [%ID%]')).join(', ')};`;
		val += `\nII группа: ` + (second_group.length ? (format(second_group, '[cat%ID%] [%ID%]')).join(', ') : '-') + `.`;
		$('#output').val(val);
	});
});
