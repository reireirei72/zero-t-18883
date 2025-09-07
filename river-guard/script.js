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
	+ '.' + addLeadZero(date.getMonth()+1)
	+ ' ' + addLeadZero(date.getHours())
	+ ':00'; 
}

$(document).ready(function() {
	var date = new Date();
	if (date.getDay() != 6) { // Суббота
		date.setDate(date.getDate() - date.getDay() - 1);
	}
	$('#date').val(dateToStr(date));

	$('#count').click(function() {
		date = new Date($('#date').val());
		var all_doz = [], present_patr = [], present_doz = [];
		const thisFri = new Date(date);
		$('#additional_output').val('');
		thisFri.setDate(thisFri.getDate() - 1);
		thisFri.setHours(23);
		const lastWeek = new Date(thisFri);
		lastWeek.setDate(lastWeek.getDate() - 6);
		lastWeek.setHours(0);
		while (lastWeek <= thisFri) {
			all_doz.push({
				year: lastWeek.getFullYear(),
				month: lastWeek.getMonth(),
				day: lastWeek.getDate(),
				hour: lastWeek.getHours()
			});
			if ([9, 11, 15, 18, 21, 23].includes(lastWeek.getHours())) {
				present_patr.push({
					year: lastWeek.getFullYear(),
					month: lastWeek.getMonth(),
					day: lastWeek.getDate(),
					hour: lastWeek.getHours(),
					type: "П1"
				});
				present_patr.push({
					year: lastWeek.getFullYear(),
					month: lastWeek.getMonth(),
					day: lastWeek.getDate(),
					hour: lastWeek.getHours(),
					type: "П2"
				});
			}
			lastWeek.setHours(lastWeek.getHours() + 1);
		};
		lastWeek.setDate(lastWeek.getDate() - 7);
		lastWeek.setHours(0);
		count = {
			"medals" : {
				"patr" : [],
				"doz" : [],
				"war" : [],
				"mzauvzhp" : {},
				"di" : {},
				"name" : {},
			},
			"patr" : [],
			"doz" : [],
			"totals" : [],
			"doz_leaver" : []
		};
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
		const places = {
            "Камышовые заросли": "КЗ",
            "Травянистый берег": "ТБ",
            "Редколесье": "РЛ",
            "Разрушенная ограда": "РО",
            "Расколотое дерево": "РД",
            "Лесной ручеёк": "ЛР",
            "Валежник": "ВЛ",
            "Мшистые земли": "МЗ",
            "Дубрава": "ДБ",
            "Илистая тропа": "ИТ",
            "Нагретые камни": "НК",
            "Одинокий склон": "ОС",
            "Главный туннель": "ГТ",
            "1 маршрут": "01",
            "2 маршрут": "02",
            "3 маршрут": "03",
            "4 маршрут": "04",
        };
		var comments = $('#comments').val().split('\n'), comment_date, pd_date = new Date(), d_end_date = new Date(), is_doz = false, patr_type, comment_num, comment_author, doz_place;

		for (const string_i in comments) {
			var string = comments[string_i];
			if (!string.length
				|| ['Участники', 'Ответить | Цитировать', 'Ответить', 'Цитировать'].includes(string)
				|| /^Собирающий/.test(string)
				|| /^Нет\.?/i.test(string)
				|| /^Самые активные/i.test(string)) {
				continue;
			}
			if (string[0] == '#') {
				let strdate = string.split(' @ ')[0].trim();
				comment_author = string.split(' @ ')[1].replace(/Удалить$/g, '').replace(/Жалоба \| $/g, '').trim();
				comment_num = string.match(/^#(\d+)/)[1];
				strdate = strdate.replace(/^#\d+ /, '');
				strdate = strdate.split(' в ');
				let strday = strdate[0], strtime = strdate[1];
				if (strday.indexOf('Сегодня') != -1) {
					const today = new Date();
					strday = dateToStr(today);
				} else if (strday.indexOf('Вчера') != -1) {
					let yesterday = new Date();
					yesterday.setDate(yesterday.getDate() - 1);
					strday = dateToStr(yesterday);
				} else {
					let today = new Date();
					let re = strday.match(/(\d+) ([а-я]+) ?(\d+)?/);
					today.setDate(1);
					today.setMonth(months[re[2]]);
					today.setDate(re[1]);
					if (re[3]) {
						today.setFullYear(re[3]);
					}
					strday = dateToStr(today);
				}
				strtime = strtime.split(':');
				comment_date = new Date(strday);
				comment_date.setHours(strtime[0]);
				comment_date.setMinutes(strtime[1]);
			} else if (/^Дозор/u.test(string)) {
				is_doz = true;
			} else if (/^Патруль/u.test(string)) {
				is_doz = false;
			} else if (is_doz && /^Дата и время начала:/u.test(string)) {
				pd_date = new Date();
				let re = string.match(/^Дата и время начала: ?(\d+)\.(\d+)\.?(\d+)?,? *(\d+):(\d+)/u);
				if (!re) {
					return error(`Вероятно, ошибка в датовремени начала дозора на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Регулярочка под "Дата и время начала: дд.мм чч:мм" не сработала.`);
				}
				pd_date.setDate(1);
				pd_date.setMonth(+(re[2]) - 1);
				pd_date.setDate(re[1]);
				if (re[3]) {
					pd_date.setFullYear(re[3]);
				}
				pd_date.setHours(re[4]);
				pd_date.setMinutes(re[5]);
				pd_date.setSeconds(0);
				if (comment_date.getFullYear() + 1 == pd_date.getFullYear()) { // поправочка на нг
					pd_date.setFullYear(comment_date.getFullYear());
				}
				if (comment_date - pd_date < 0) {
					error(`Вероятно, ошибка в датовремени начала дозора на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Дата комментария меньше даты отчёта`);
				}
				if (pd_date < lastWeek) {
					error(`Вероятно, ошибка в дате или старая отпись на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Начало недели: ${dt_format(lastWeek)}, отпись: ${dt_format(pd_date)}.`);
				}
			} else if (is_doz && /^Дата и время конца:/u.test(string)) {
				d_end_date = new Date();
				let re = string.match(/^Дата и время конца: ?(\d+)\.(\d+)\.?(\d+)?,? *(\d+):(\d+)/u);
				if (!re) {
					return error(`Вероятно, ошибка в датовремени конца дозора на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Регулярочка под "Дата и время конца: дд.мм чч:мм" не сработала.`);
				}
				d_end_date.setDate(1);
				d_end_date.setMonth(+(re[2]) - 1);
				d_end_date.setDate(re[1]);
				if (re[3]) {
					d_end_date.setFullYear(re[3]);
				}
				d_end_date.setHours(re[4]);
				d_end_date.setMinutes(re[5]);
				d_end_date.setSeconds(0);
				if (comment_date.getFullYear() + 1 == d_end_date.getFullYear()) { // поправочка на нг
					d_end_date.setFullYear(comment_date.getFullYear());
				}
				if (comment_date - d_end_date < 0) {
					error(`Вероятно, ошибка в датовремени конца дозора на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Дата комментария меньше даты отчёта`);
				}
				if (d_end_date - pd_date < 0) {
					error(`Вероятно, ошибка в датовремени конца дозора на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Дата начала отчёта меньше даты конца`);
				}
				if (comment_date - d_end_date > 1000 * 60 * 15) { // 15 минут разницы
					error(`${comment_author} отписал очень поздно дозор в комменте #${comment_num}, строчка выглядит как ${string}. Подозрительно`);
				}
				if (d_end_date < lastWeek) {
					error(`Вероятно, ошибка в дате или старая отпись на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Начало недели: ${dt_format(lastWeek)}, отпись: ${dt_format(d_end_date)}.`);
				}
			} else if (is_doz && /^Место дозора:/u.test(string)) {
				let s = string.split(':');
				if (s.length != 2) {
					return error(`Нет двоеточия на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
				}
				let doz_type = s[1].trim().replace(/[^А-Яа-яЁё \d]/g, "");;
				if (!places[doz_type]) {
					error(`Вероятно, ошибка в месте дозора на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Мы не нашли такое место это где...`);
				}
				doz_place = places[doz_type];
			} else if (is_doz && /^Участник:/u.test(string)) {
				let s = string.split(':');
				if (s.length != 2) {
					return error(`Нет двоеточия на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
				}
				let ids = s[1].match(/\d+/g);
				if (!ids[0]) {
					error(`Вероятно, ошибка в участнике дозора на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}.`);
				}
				count.doz.push({
					year: pd_date.getFullYear(),
					month: pd_date.getMonth(),
					day: pd_date.getDate(),
					hour: pd_date.getHours(),
					diff: Math.floor((d_end_date - pd_date) / 1000 / 60),
					type: doz_place,
					cat: +ids[0],
					comment_num: comment_num
				});
			} else if (is_doz && /^(Нарушения|Освобожд)/u.test(string)) {
				let s = string.split(':');
				if (s.length != 2) {
					return error(`Нет двоеточия на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
				}
				let del_type = (/^Наруш/u.test(s[0].trim()) ? "Нарушение" : "Освобождён");
				let ids = s[1].match(/\d+/g);
				for (const id_i in ids) {
					const id = ids[id_i];
					count.doz_leaver.push({
						year: pd_date.getFullYear(),
						month: pd_date.getMonth(),
						day: pd_date.getDate(),
						hour: pd_date.getHours(),
						type: del_type,
						cat: +id,
						comment_num: comment_num
					});
				}
			} else if (!is_doz && /^Дата и время:/u.test(string)) {
				let tmpdate = string.match(/(\d+)\.(\d+)/);
				let tmptime = string.match(/(\d+):(\d+)/);
				if (!tmpdate || !tmptime) {
					return error(`Какая-то хрень с датой-временем на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
				}
				pd_date.setDate(1);
				pd_date.setMonth(+(tmpdate[2]) - 1);
				pd_date.setDate(tmpdate[1]);
				pd_date.setHours(tmptime[1]);
				pd_date.setMinutes(0);
				pd_date.setSeconds(0);
				if (comment_date.getFullYear() + 1 == pd_date.getFullYear()) { // поправочка на нг
					pd_date.setFullYear(comment_date.getFullYear());
				}
				if (comment_date - pd_date < 0) {
					return error(`Вероятно, ошибка в дате на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
				}
				if (comment_date - pd_date > 1000 * 60 * 60 * 24 * 3) {
					error(`Патруль отписан ${Math.floor((comment_date - pd_date) / (1000 * 60 * 60 * 24))} лет спустя в комменте #${comment_num}`);
				}
				if (is_doz) {
					error(`Зачем-то отписали дозор через "Дата и время:" на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
				}
			} else if (!is_doz && /^Маршрут:/u.test(string)) {
				patr_type = string.replace(/\D+/g, '');
				patr_type = "П" + ((+patr_type == 1) ? "1" : "2");
			} else if (!is_doz && /^Участники:/u.test(string)) {
				let s = string.split(':');
				if (s.length != 2) {
					return error(`Нет двоеточия на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
				}
				let ids = s[1].match(/\d+/g);
				for (const id_i in ids) {
					const id = ids[id_i];
					count.patr.push({
						year: pd_date.getFullYear(),
						month: pd_date.getMonth(),
						day: pd_date.getDate(),
						hour: pd_date.getHours(),
						type: patr_type,
						cat: +id,
						comment_num: comment_num
					});
				}
			} else if (!is_doz && /^Ведущий:/u.test(string)) {
				let s = string.split(':');
				if (s.length != 2) {
					return error(`Нет двоеточия на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
				}
				let leader = string.replace(/\D+/g, '');
				count.patr.push({
					year: pd_date.getFullYear(),
					month: pd_date.getMonth(),
					day: pd_date.getDate(),
					hour: pd_date.getHours(),
					type: patr_type,
					cat: +leader,
					comment_num: comment_num
				});
			} else if (string.indexOf('медаль') != -1) {
				let medal = string.replace(/\D+/g, '');
				if (string.indexOf('жизни') != -1) {
					comment_date.setMinutes(0);
					comment_date.setSeconds(0);
					let end_date = new Date(comment_date);
					end_date.setDate(end_date.getDate() + 30);
					count.medals.mzauvzhp[+medal] = {
						start_patr: 0,
						start_doz: 0,
						from_year: comment_date.getFullYear(),
						from_month: comment_date.getMonth(),
						from_day: comment_date.getDate(),
						to_year: end_date.getFullYear(),
						to_month: end_date.getMonth(),
						to_day: end_date.getDate(),
					};
				} else if (string.indexOf('дозорах') != -1) {
					count.medals.doz.push(+medal);
				} else {
					count.medals.patr.push(+medal);
				}
			} else if (string.indexOf('таблицу воителей') != -1) {
				let add = string.replace(/\D+/g, '');
					count.medals.war.push(+add);
			} else if (string.indexOf('практику на ДИ') != -1) {
				let medal = string.replace(/\D+/g, '');
				comment_date.setMinutes(0);
				comment_date.setSeconds(0);
				count.medals.di[+medal] = {
					start_patr: 0,
					start_doz: 0,
					from_year: comment_date.getFullYear(),
					from_month: comment_date.getMonth(),
					from_day: comment_date.getDate(),
				};
			} else if (string.indexOf('практику на имя') != -1) {
				let medal = string.replace(/\D+/g, '');
				comment_date.setMinutes(0);
				comment_date.setSeconds(0);
				count.medals.name[+medal] = {
					start_patr: 0,
					start_doz: 0,
					from_year: comment_date.getFullYear(),
					from_month: comment_date.getMonth(),
					from_day: comment_date.getDate(),
				};
			} else if (string.toLowerCase().indexOf('север:') !== 0 && string.toLowerCase().indexOf('гроза:') !== 0) {
				return error(`Непонятно что происходит на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}`);
			}
		}

		// var missing_doz = [];
		// count.totals = count.doz.concat(count.patr);
		// for (const present_i in all_doz) {
		// 	let cur = all_doz[present_i];
		// 	let doz = _.filter(present_doz, {year: cur.year, month: cur.month, day: cur.day, hour: cur.hour});
		// 	if (!doz.length) {
		// 		missing_doz.push(cur);
		// 	}
		// 	let hush = [];
		// 	for (const doz_i in doz) {
		// 		const thisdoz = doz[doz_i];
		// 		let doubles = _.filter(count.doz, {year: cur.year, month: cur.month, day: cur.day, hour: cur.hour, cat: thisdoz.cat});
		// 		if (doubles.length > 1 && !hush.includes(thisdoz.cat)) {
		// 			let comments = [];
		// 			for (const doub_i in doubles) { comments.push(doubles[doub_i].comment_num); }
		// 			error(`Дубль дозора, комментарии номерами #${comments.join(', #')}. Массив дублей:\n` + JSON.stringify(doubles));
		// 			hush.push(thisdoz.cat);
		// 		}
		// 	}
		// };
		// error('Не собраны дозоры:');
		// for (const missing_i in missing_doz) {
		// 	let cur = missing_doz[missing_i];
		// 	let str = `${addLeadZero(cur.day)}.${addLeadZero(cur.month + 1)} ${addLeadZero(cur.hour)}`;
		// 	error(str)
		// }

		var missing_patr = [];
		for (const present_i in present_patr) {
			let cur = present_patr[present_i];
			let patr = _.filter(count.patr, {year: cur.year, month: cur.month, day: cur.day, type: cur.type, hour: cur.hour});
			if (!patr.length) {
				missing_patr.push(cur);
			}
			let hush = [];
			for (const patr_i in patr) {
				const thispatr = patr[patr_i];
				let doubles = _.filter(count.patr, {year: cur.year, month: cur.month, day: cur.day, hour: cur.hour, cat: thispatr.cat});
				if (doubles.length > 1 && !hush.includes(thispatr.cat)) {
					let comments = [];
					for (const doub_i in doubles) { comments.push(doubles[doub_i].comment_num); }
					error(`Дубль патруля, комментарии номерами #${comments.join(', #')}. Массив дублей:\n` + JSON.stringify(doubles));
					hush.push(thispatr.cat);
				}
			}
		}
		error('Не собраны патрули:');
		for (const missing_i in missing_patr) {
			let cur = missing_patr[missing_i];
			let str = `${addLeadZero(cur.day)}.${addLeadZero(cur.month + 1)} ${addLeadZero(cur.hour)} (${cur.type})`;
			error(str)
		}
		let hush = [];
		for (const totals_i in count.totals) {
			const cur = count.totals[totals_i];
			let doubles = _.filter(count.totals, {year: cur.year, month: cur.month, day: cur.day, hour: cur.hour, cat: cur.cat});
			if (doubles.length > 1 && !hush.includes(cur.cat)) {
				let comments = [];
				for (const doub_i in doubles) { comments.push(doubles[doub_i].comment_num); }
				error(`Дубль чего-то там, комментарии номерами #${comments.join(', #')}. Массив дублей:\n` + JSON.stringify(doubles));
				hush.push(cur.cat);
			}
		}

		let count_out = {};
		for (const doz_i in count.doz) {
			const doz = count.doz[doz_i];
			if (!count_out[doz.cat]) {
				count_out[doz.cat] = {patr: 0, doz: 0};
			}
			// const nar = _.find(count.doz_leaver, {year: doz.year, month: doz.month, day: doz.day, hour: doz.hour, cat: doz.cat});
			// if (!nar) {
			// 	count_out[doz.cat].doz++;
			// }
			let points = Math.floor(doz.diff / 30) * 0.5;
			count_out[doz.cat].doz += points;
			if (count.medals.mzauvzhp[doz.cat]) {
				const mzcat = count.medals.mzauvzhp[doz.cat];
				if (mzcat.from_year > doz.year
					|| mzcat.from_year == doz.year && mzcat.from_month > doz.month
					|| mzcat.from_year == doz.year && mzcat.from_month == doz.month && mzcat.from_day > doz.day) {
					count.medals.mzauvzhp[doz.cat].start_doz -= points;
				}
			}
			if (count.medals.di[doz.cat]) {
				const mzcat = count.medals.di[doz.cat];
				if (mzcat.from_year > doz.year
					|| mzcat.from_year == doz.year && mzcat.from_month > doz.month
					|| mzcat.from_year == doz.year && mzcat.from_month == doz.month && mzcat.from_day > doz.day) {
					count.medals.di[doz.cat].start_doz -= points;
				}
			}
			if (count.medals.name[doz.cat]) {
				const mzcat = count.medals.name[doz.cat];
				if (mzcat.from_year > doz.year
					|| mzcat.from_year == doz.year && mzcat.from_month > doz.month
					|| mzcat.from_year == doz.year && mzcat.from_month == doz.month && mzcat.from_day > doz.day) {
					count.medals.name[doz.cat].start_doz -= points;
				}
			}
		}
		for (const patr_i in count.patr) {
			const patr = count.patr[patr_i];
			if (!count_out[patr.cat]) {
				count_out[patr.cat] = {patr: 0, doz: 0};
			}
			count_out[patr.cat].patr++;
			if (count.medals.mzauvzhp[patr.cat]) {
				const mzcat = count.medals.mzauvzhp[patr.cat];
				if (mzcat.from_year > patr.year
					|| mzcat.from_year == patr.year && mzcat.from_month > patr.month
					|| mzcat.from_year == patr.year && mzcat.from_month == patr.month && mzcat.from_day > patr.day) {
					count.medals.mzauvzhp[patr.cat].start_patr--;
				}
			}
			if (count.medals.di[patr.cat]) {
				const mzcat = count.medals.di[patr.cat];
				if (mzcat.from_year > patr.year
					|| mzcat.from_year == patr.year && mzcat.from_month > patr.month
					|| mzcat.from_year == patr.year && mzcat.from_month == patr.month && mzcat.from_day > patr.day) {
					count.medals.di[patr.cat].start_patr--;
				}
			}
			if (count.medals.name[patr.cat]) {
				const mzcat = count.medals.name[patr.cat];
				if (mzcat.from_year > patr.year
					|| mzcat.from_year == patr.year && mzcat.from_month > patr.month
					|| mzcat.from_year == patr.year && mzcat.from_month == patr.month && mzcat.from_day > patr.day) {
					count.medals.name[patr.cat].start_patr--;
				}
			}
		}
		var val = '';
		if (count.medals.war.length) {
			val += 'Таблица воителей:\n';
			val += count.medals.war.join('\n');
			val += '\n\n';
		}
		if (Object.keys(count.medals.di).length) {
			val += 'Идущие на практику на ДИ:\n';
			for (const cat in count.medals.di) {
				const cur = count.medals.di[cat];
				val += `${addLeadZero(cur.from_day)}.${addLeadZero(cur.from_month+1)}	${cat}	${cur.start_patr}	${cur.start_doz}\n`;
			}
			val += '\n';
		}
		if (Object.keys(count.medals.name).length) {
			val += 'Идущие на практику на имя:\n';
			for (const cat in count.medals.name) {
				const cur = count.medals.name[cat];
				val += `${addLeadZero(cur.from_day)}.${addLeadZero(cur.from_month+1)}	${cat}	${cur.start_patr}	${cur.start_doz}\n`;
			}
			val += '\n';
		}
		count.medals.patr_and_doz = [];
		for (let i = 0; i < count.medals.patr.length; i++) {
			let thispatr = count.medals.patr[i];
			if (count.medals.doz.includes(thispatr)) {
				count.medals.patr_and_doz.push(thispatr);
			}
		}
		for (let i = 0; i < count.medals.patr_and_doz.length; i++) {
			let thismed = count.medals.patr_and_doz[i];
			let index = count.medals.patr.indexOf(thismed);
			if (index > -1) {
				count.medals.patr.splice(index, 1);
			}
			index = count.medals.doz.indexOf(thismed);
			if (index > -1) {
				count.medals.doz.splice(index, 1);
			}
			
		}
		if (count.medals.patr_and_doz.length) {
			val += 'Идущие на медаль за активное участие в патрулях и дозорах:\n';
			val += count.medals.patr_and_doz.join('\n');
			val += '\n\n';
		}
		if (count.medals.patr.length) {
			val += 'Идущие на медаль за активное участие в патрулях:\n';
			val += count.medals.patr.join('\n');
			val += '\n\n';
		}
		if (count.medals.doz.length) {
			val += 'Идущие на медаль за активное участие в дозорах:\n';
			val += count.medals.doz.join('\n');
			val += '\n\n';
		}
		if (Object.keys(count.medals.mzauvzhp).length) {
			val += 'Идущие на медаль за активное участие в жизни племени:\n';
			for (const cat in count.medals.mzauvzhp) {
				const cur = count.medals.mzauvzhp[cat];
				val += `${addLeadZero(cur.from_day)}.${addLeadZero(cur.from_month+1)}-${addLeadZero(cur.to_day)}.${addLeadZero(cur.to_month+1)}	${cat}	${cur.start_patr}	${cur.start_doz}\n`;
			}
			val += '\n';
		}
		val += `Патрули и дозоры [${addLeadZero(date.getDate())}.${addLeadZero(date.getMonth()+1)}]:\n`;
		let best_doz = 0, best_patr = 0, second_best_doz = 0, second_best_patr = 0;
		for (const cat in count_out) {
			const this_cat = count_out[cat];
			val += `${cat}	${this_cat.patr}	${this_cat.doz}\n`;
			if (this_cat.patr > best_patr) {
				best_patr = this_cat.patr;
			}
			if (this_cat.doz > best_doz) {
				best_doz = this_cat.doz;
			}
		}
		for (const cat in count_out) {
			const this_cat = count_out[cat];
			
			if (this_cat.patr > second_best_patr && this_cat.patr != best_patr) {
				second_best_patr = this_cat.patr;
			}
			if (this_cat.doz > second_best_doz && this_cat.doz != best_doz) {
				second_best_doz = this_cat.doz;
			}
		}
		let best_doz_id = _.keys(_.pickBy(count_out, function(value, key) { return value.doz == best_doz })).map(Number),
		second_best_doz_id = _.keys(_.pickBy(count_out, function(value, key) { return value.doz == second_best_doz })).map(Number),
		best_patr_id = _.keys(_.pickBy(count_out, function(value, key) { return value.patr == best_patr })).map(Number),
		second_best_patr_id = _.keys(_.pickBy(count_out, function(value, key) { return value.patr == second_best_patr })).map(Number);

		val += `[font=vrinda][size=14][b]Самые активные патрульные:[/b] ${(format(best_patr_id, '[cat%ID%]')).join(', ')} [I группа] и ${(format(second_best_patr_id, '[cat%ID%]')).join(', ')} [II группа].\n`;
		val += `[b]Самые активные дозорные:[/b] ${(format(best_doz_id, '[cat%ID%]')).join(', ')} [I группа] и ${(format(second_best_doz_id, '[cat%ID%]')).join(', ')} [II группа].[/size][/font]\n`;

		val += `Блог Охраняющих Границы  +\n`;
		val += `Патрульные:\n`;
		val += `I: ${(format(best_patr_id, '[cat%ID%] [%ID%]')).join(', ')}\n`;
		val += `II: ${(format(second_best_patr_id, '[cat%ID%] [%ID%]')).join(', ')}\n\n`;
		val += `Дозорные:\n`;
		val += `I: ${(format(best_doz_id, '[cat%ID%] [%ID%]')).join(', ')}\n`;
		val += `II: ${(format(second_best_doz_id, '[cat%ID%] [%ID%]')).join(', ')}`;
		$('#output').val(val);
	});
});

function format(array, mask) {
	let string = '', new_array = [];
	for (let i in array) {
		new_array.push(mask.replace(/%ID%/g, array[i]))
	}
	return new_array
}
