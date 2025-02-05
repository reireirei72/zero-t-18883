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
function addCat(patr_arr, cat, date, type, mark_filled = false) {
	const instance = _.find(patr_arr, {year: date.getFullYear(), month: date.getMonth(), day: date.getDate(), type: type});
	const date_str = `${addLeadZero(date.getDate())}.${addLeadZero(date.getMonth() + 1)}.${date.getFullYear()} (${type})`;
	let entry = cat.trim().match(/[А-яЁё ]+ \[(\d+)\] \(([\d\.,]+)\)/i);
	if (!entry) {
		return true;
	}
	cat = {
		id: +(entry[1]),
		herbs: +(entry[2].replace(",", "."))
	};
	if (!instance) {
		error(`Попытался запихнуть ${cat.id} в патруль ${date_str}, но подходящий патруль не был найден. Некорректная дата комментария, наверное слишком поздно или слишком рано отпись.`);
	} else if (instance.cats_filled) {
		error(`Попытался запихнуть ${cat.id} в патруль ${date_str}, но на этот патруль коты уже заполнялись. Где-то подвох (видимо, косяк с датой).`);
	} else if (_.find(instance.cats, {id: cat.id})) {
		error(`Попытался запихнуть ${cat.id} в патруль ${date_str}, но он уже в нём состоит.`);
	} else {
		instance.cats.push(cat);
		if (mark_filled) {
			instance.cats_filled = true;
		}
	}
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
$(document).ready(function() {
	var date = new Date();
	if (date.getDay() != 6) { // Суббота
		date.setDate(date.getDate() - date.getDay() - 1);
	}
	$('#date').val(dateToStr(date));

	$('#count').click(function() {
		date = new Date($('#date').val());
		var patr = [];
		const thisFri = new Date(date);
		$('#additional_output').val('');
		thisFri.setDate(thisFri.getDate() - 1);
		thisFri.setHours(17);
		const lastWeek = new Date(thisFri);
		lastWeek.setDate(lastWeek.getDate() - 6);
		lastWeek.setHours(11);
		while (lastWeek <= thisFri) {
			const hours_assoc = {
				'11': 'веточник',
				'16': 'травник',
				'17': 'мховник'
			};
			const cur = lastWeek.getHours();
			patr.push({
				year: lastWeek.getFullYear(),
				month: lastWeek.getMonth(),
				day: lastWeek.getDate(),
				hour: lastWeek.getHours(),
				type: hours_assoc[cur],
				cats: [],
				cats_filled: false,
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
		var comments = $('#comments').val().split('\n'), patr_date = new Date(), patr_type, comment_num;
		for (const string_i in comments) {
			var string = comments[string_i];
			if (!string.length
				|| ['Ответить | Цитировать', 'Ответить', 'Цитировать'].includes(string)
				|| /^Особые происшествия/i.test(string)) {
				continue;
			}
			if (string[0] == '#') {
				let strdate = string.split(' @ ')[0].trim();
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
				patr_date = new Date(strday);
				patr_date.setHours(strtime[0]);
				patr_date.setMinutes(strtime[1]);
			} else if (/^Тип травника:/u.test(string)) {
				let re = string.match(/^Тип травника: ?([А-яЁё]+);?/);
				if (!re || !re[1]) {
					return error(`Что-то не так с типом травника в комменте #${comment_num}. Строчка выглядит как "${string}".`);
				}
				patr_type = re[1].trim().toLowerCase();
				if (!['веточник', 'травник', 'мховник'].includes(patr_type)) {
					error(`Что-то не так с типом травника в комменте #${comment_num}. Строчка выглядит как "${string}".`);
				}
			} else if (/^Дата:/u.test(string)) {
				let re = string.match(/^Дата: ?(\d+)\.(\d+)\.?(\d+)?/u);
				if (!re || !re[2]) {
					error(`Вероятно, ошибка в дате на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Регулярочка под "Дата: дд.мм" не сработала.`);
				}
				patr_date.setDate(1);
				patr_date.setMonth(+(re[2]) - 1);
				patr_date.setDate(re[1]);
				if (re[3]) {
					const year = +((re[3].length == 2) ? "20" + re[3] : re[3]);
					patr_date.setFullYear(year);
				}
			} else if (/^Ведущий/u.test(string)) {
				let leader = string.replace(String.fromCharCode(173), "").trim().split(':')[1];
				const haveErr = addCat(patr, leader, patr_date, patr_type);
				if (haveErr) {
					return error(`Ошибка в ведущем на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Регулярочка под "Имя [айди] (травы)" не сработала.`);
				}
			} else if (/^Участники/u.test(string)) {
				let cats = string.replace(String.fromCharCode(173), "").replace(/\((\d+),(\d+)\)/g, '($1.$2)').trim().split(',');
				for (const i in cats) {
					const cat = cats[i];
					const haveErr = addCat(patr, cat, patr_date, patr_type, (cats.length == +i + 1));
					if (haveErr) {
						return error(`Ошибка в участнике на ${string_i} (коммент #${comment_num}), строчка выглядит как ${string}. Регулярочка под "Имя [айди] (травы)" не сработала.`);
					}
				}
			}
		}
		var missing = [];
		for (const i in patr) {
			const cur = patr[i];
			if (cur.cats.length == 0) {
				const date = new Date(cur.year, cur.month, cur.day)
				missing.push({date: dt_format(date), type: cur.type})
			}
		}
		if (missing.length) {
			error('Не отписаны/не собраны патрули:');
			for (const i in missing) {
				const cur = missing[i];
				let str = `${cur.date} (${cur.type})`;
				error(str);
			}
		}
		let count = [];
		for (const i in patr) {
			const cur = patr[i];
			const points = (cur.type == 'травник') ? 1.5 : 1;
			for (const c_i in cur.cats) {
				const now = cur.cats[c_i];
				const instance = _.find(count, {id: now.id});
				if (!instance) {
					count.push({id: now.id, points, count: 1});
				} else {
					instance.points += points;
					instance.count++;
				}
			}
		}
		count.sort(function(a, b) {return b.points - a.points});

		let first = count[0], first_gr = [first.id], i = 1, second = count[i], second_gr = [];
		while (second && first.points == second.points) {
			first_gr.push(second.id);
			second = count[++i];
		}
		if (second) {
			second_gr.push(second.id);
		}
		let third = count[++i];
		while (third && second.points == third.points) {
			second_gr.push(third.id);
			third = count[++i];
		}
		
		let val = `Подсчёт баллов [${addLeadZero(date.getDate())}.${addLeadZero(date.getMonth()+1)}]:\n`;
		for (const i in count) {
			const cat = count[i];
			val += `${cat.id}	${cat.points.toString().replace('.',',')}\n`;
		};

// 		val += `\n\nПодсчёт травников на ДИ [${addLeadZero(date.getDate())}.${addLeadZero(date.getMonth()+1)}]:\n`;
// 		for (const i in count) {
// 			const cat = count[i];
// 			val += `${cat.id}	${cat.count.toString().replace('.',',')}\n`;
// 		};
		
		count = [];
		for (const i in patr) {
			const cur = patr[i];
			for (const c_i in cur.cats) {
				const now = cur.cats[c_i];
				const instance = _.find(count, {id: now.id});
				if (!instance) {
					count.push({id: now.id, herbs: now.herbs});
				} else {
					instance.herbs += now.herbs;
				}
			}
		}
		count.sort(function(a, b) {return b.herbs - a.herbs});
		val += `\n\nПодсчёт трав [${addLeadZero(date.getDate())}.${addLeadZero(date.getMonth()+1)}]:\n`;
		for (const i in count) {
			const cat = count[i];
			if (cat.herbs > 0) {
				val += `${cat.id}	${cat.herbs.toString().replace('.',',')}\n`;
			}
		};
		
		val += `\n\nАктивисты:`;		
		val += `\nI группа: ${(format(first_gr, '[cat%ID%] [%ID%]')).join(', ')};`;
		val += `\nII группа: ` + (second_gr.length ? (format(second_gr, '[cat%ID%] [%ID%]')).join(', ') : '-') + `.`;
		$('#output').val(val);
	});
});
