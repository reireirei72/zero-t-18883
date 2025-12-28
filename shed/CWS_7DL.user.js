// ==UserScript==
// @name         CWS 7dl
// @version      1.1
// @description  Встроенная карта 7ДЛ
// @author       ReiReiRei
// @copyright    2020-2025, Тис (https://catwar.net/cat406811)
// @license      MIT; https://opensource.org/licenses/MIT
// @match        *://catwar.net/*
// @match        *://catwar.su/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @require      https://reireirei72.github.io/zero-t-18883/shed/jquery-3.4.1.min.js
// @require      https://raw.githubusercontent.com/litera/jquery-scrollintoview/master/jquery.scrollintoview.min.js
// @require      https://reireirei72.github.io/zero-t-18883/shed/jquery-ui.js
// ==/UserScript==

(function (window, document, $) {
    'use strict';
    function getSettings(key) { //Получение настроек
        let setting = 'cws7dl_sett_' + key;
        let val = window.localStorage.getItem(setting);
        switch (val) {
            case null:
                return null;
            case 'true':
                return true;
            case 'false':
                return false;
            default:
                return val;
        }
    }
    function setSettings(key, val) {
        let setting = 'cws7dl_sett_' + key;
        window.localStorage.setItem(setting, val);
    }
    var actionData = getSettings('action_data');
    if (!actionData) {
        actionData = {date: new Date(), sec: 0};
    } else {
        try { actionData = JSON.parse(actionData) } catch(e) { actionData = {date: new Date(), sec: 0}; };
    }
    if (/^https:\/\/\w*\.?catwar.(su|net)\/$/.test(window.location.href)) {
        const getTimeStr = function() {
            const date = new Date();
            return date.toLocaleTimeString() + "&nbsp;&nbsp;&nbsp;"
                + ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()] + ', '
                + date.getDate() + ' ' + ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][date.getMonth()];
        }
        const getActionTimeStr = function() {
            const startTime = new Date(actionData.date).getTime(); // ms
            const now = Date.now(); // ms
            const elapsedSec = Math.floor((now - startTime) / 1000);
            let secLeft = Math.max(0, actionData.sec - elapsedSec);
            if (secLeft < 1) return "Персонаж не совершает действий";
            let hr = parseInt(secLeft / 3600);
            let mi = parseInt((secLeft - hr * 3600) / 60);
            let se = parseInt(secLeft - (hr * 3600 + mi * 60));
            let str = '';
            str += (hr) ? hr + ' ч ' : '';
            str += (mi || hr) ? mi + ' мин ' : '';
            str += se + ' с';
            return str + " до конца действия";
        }
        $('head').append(`<style>#cws_localTimer, #cws_actionTimer {padding: 0 .5em;font-size: 12px}</style>`);
        if ($('.other_cats_list').length) {
            $('.other_cats_list').append('| <span id="cws_localTimer">' + getTimeStr() + '</span> | <span id="cws_actionTimer">' + getActionTimeStr() + '</span>');
        } else {
            $('body').prepend('<span style="background: white;"><span id="cws_localTimer">' + getTimeStr() + '</span> | <span id="cws_actionTimer">' + getActionTimeStr() + '</span></span>');
        }
        setInterval(function () {
            $('#cws_localTimer').html(getTimeStr());
            $('#cws_actionTimer').html(getActionTimeStr());
        }, 1000);
    }
    if (/^https:\/\/\w*\.?catwar.(su|net)\/cw3(?!(\/kns|\/jagd))/.test(window.location.href)) {
        // Timer
        const trActions = document.getElementById('tr_actions');
        const actionsObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.id === 'block_mess') {
                            return handleMessageChange();
                        }
                        if (node.nodeType === 1 && node.querySelector?.('#block_mess')) {
                            return handleMessageChange();
                        }
                    });
                    m.removedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.id === 'block_mess') {
                            return handleMessageChange(); // it was removed
                        }
                    });
                }
                if (m.type === 'characterData') {
                    if (m.target.parentElement?.id === 'block_mess' ||
                        m.target.parentElement?.closest?.('#block_mess')) {
                        return handleMessageChange();
                    }
                }
                if (m.type === 'attributes' && m.target.id === 'block_mess') {
                    return handleMessageChange();
                }
            }
        });

        actionsObserver.observe(trActions, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true,
            attributes: true
        });
        function handleMessageChange() {
            const $el = $('#block_mess');
            if (!$el) return;
            const fullText = $el.text().replace(/\s+/g, ' ').trim();
            const firstDigitIndex = fullText.search(/\d/);
            if (firstDigitIndex === -1) return;
            let timeStr = fullText.slice(firstDigitIndex);
            timeStr = timeStr.replace(/\s*Отменить.*$/i, '');
            timeStr = timeStr.replace(/\.+$/, '').trim();
            let totalSeconds = 0;
            const dayMatch = timeStr.match(/(\d+)\s*дн/);
            const hourMatch = timeStr.match(/(\d+)\s*ч(?![а-я])/);
            const minMatch = timeStr.match(/(\d+)\s*мин/);
            const secMatch = timeStr.match(/(\d+)\s*с(?![а-я])/);

            if (dayMatch) totalSeconds += parseInt(dayMatch[1], 10) * 24 * 60 * 60;
            if (hourMatch) totalSeconds += parseInt(hourMatch[1], 10) * 60 * 60;
            if (minMatch) totalSeconds += parseInt(minMatch[1], 10) * 60;
            if (secMatch) totalSeconds += parseInt(secMatch[1], 10);
            setSettings('action_data', JSON.stringify({date: new Date(), sec: totalSeconds}))
        }

        // Map
        var map = {}, searchMap = {}, ready = false,
            loc_now = getSettings('loc_now', "Лабиринт:0"),
            loc_prev = getSettings('loc_prev', "Лабиринт:0"),
            isObserving = getSettings('is_observing', false),
            lab_choice = getSettings('lab_choice', 'Лабиринт Безумных Волн (нижний)'),
            loc_choice = +getSettings('loc_choice', 1);

        const lab_list = ['Лабиринт Безумных Волн', 'Лабиринт Зноя', 'Лабиринт Острых Зубьев', 'Великий Путь', 'Лабиринт Жажды', 'Лабиринт Темноты', 'Лабиринт Искушений', 'Лабиринт Внимательности', 'Лабиринт Бессилия', 'Лабиринт Слабости', 'Лабиринт Забвения'];
        $('head').append(`<style>#cws_7dl_table td {height: 30px;width:22px;}
        #cws_7dl_table .highlight--1 {background-color: white;}
        #cws_7dl_table .highlight-0 {background-color: #92d050;}
        #cws_7dl_table .highlight-1 {background-color: #002060;}</style>`);
        let html = '<div id="cws_7dl_div">';
        var loc_type = null;
        html += '<div style="padding-bottom: .5em"><b>Карта 7ДЛ</b></div>';
        html += '<div style="padding-bottom: .5em" id="cws_7dl_loc_type">Неизвестный лабиринт</div>';
        html += '<div><table border=1 id="cws_7dl_table">';
        for (let y = 0; y < 6; y++) {
            html += '<tr>';
            for (let x = 0; x < 10; x++) html += '<td></td>';
            html += '</tr>';
        }
        html += '</table></div>';
        html += '<div><small>Зелёное - к ОВ (ОП), синее - к МВ (МП)</small></div><hr>';
        html += '<div id="cws_7dl_observe_alt" style="display:block;">';
        html += '<div style="padding-bottom: .25em">Переключение вручную</div>';
        html += '<div style="padding-bottom: .25em"><select id="cws_7dl_lab_choice">';
        for (let i = 0; i < lab_list.length; i++) {
            let name = lab_list[i] + ' (нижний)';
            html += '<option' + (lab_choice == name ? ' selected' : '') + '>' + name + '</option>';
        }
        for (let i = lab_list.length - 1; i >= 0; i--) {
            let name = lab_list[i] + ' (верхний)';
            html += '<option' + (lab_choice == name ? ' selected' : '') + '>' + name + '</option>';
        }
        html += '</select></div>';
        html += '<div><button id="cws_7dl_left">ОП &lt;</button> <input type="text" id="cws_7dl_loc_choice" value=' + loc_choice + ' size=4> <button id="cws_7dl_right">&gt; МП</button></div>';
        html += '<hr></div>';
        html += `<div><button id="cws_7dl_observe">Обновлять при переходе</button></div>`;
        html += '</div>';
        $('#app').append(html);

        $('#cws_7dl_lab_choice').on('change', function(e) {
            if (!ready) return;
            let new_choice = this.value;
            if (new_choice != lab_choice) {
                const currentIndex = this.selectedIndex;
                const prevIndex = $('#cws_7dl_lab_choice option').toArray().findIndex(o => o.value === lab_choice);
                const direction = currentIndex > prevIndex ? +1 : -1;
                const isRightSide = new_choice.indexOf('(верхний)') !== -1;
                lab_choice = new_choice;
                if (isRightSide) {
                    loc_choice = direction < 0 ? getLocCount() : 1;
                } else {
                    loc_choice = direction < 0 ? 1 : getLocCount();
                }
                $('#cws_7dl_loc_choice').val(loc_choice);
                setSettings('lab_choice', lab_choice);
                setSettings('loc_choice', loc_choice);
                switchMap();
            }
        });
        $('#cws_7dl_left').on('click', (e) => {
            if (!ready) return;
            const isRightSide = lab_choice.indexOf('(верхний)') !== -1;
            switchLoc(+loc_choice + (isRightSide ? -1 : 1));
        });
        $('#cws_7dl_right').on('click', (e) => {
            if (!ready) return;
            const isRightSide = lab_choice.indexOf('(верхний)') !== -1;
            switchLoc(+loc_choice + (isRightSide ? 1 : -1));
        });
        $('#cws_7dl_observe').on('click', (e) => {
            if (!ready) return;
            if (isObserving) stopObserving();
            else startObserving();
        });
        $('#cws_7dl_loc_choice').on('input', function(e) {
            if (!ready) return;
            let new_choice = $('#cws_7dl_loc_choice').val();
            if (!new_choice) return;
            if (isNaN(+new_choice)) return;
            switchLoc(new_choice);
        });
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        if (node.matches && node.matches('.move_parent')) {
                            shouldUpdate = true;
                        } else if (node.querySelector && node.querySelector('.move_parent')) {
                            shouldUpdate = true;
                        }
                    });
                    m.removedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        if (node.matches && node.matches('.move_parent')) {
                            shouldUpdate = true;
                        } else if (node.querySelector && node.querySelector('.move_parent')) {
                            shouldUpdate = true;
                        }
                    });
                } else if (m.type === 'attributes' && m.attributeName === 'class') {
                    if (m.target.classList.contains('move_parent')) {
                        shouldUpdate = true;
                    }
                }
                if (shouldUpdate) break;
            }
            if (shouldUpdate) {
                refreshMap();
            }
        });
        function getLocCount() {
            let lab = getLabName(lab_choice);
            let sign = lab_choice.indexOf('(верхний)') !== -1 ? -1 : 1;
            return Object.keys(map[lab]).filter(v => (sign > 0) ? +v > 0 : +v < 0).length;
        }
        function refreshMap() {
            if (!ready) return;
            $('#cws_7dl_table td').removeClass('highlight-0').removeClass('highlight-1').removeClass('highlight--1');
            $('#cws_7dl_loc_type').text('Неизвестный лабиринт');
            let loc = $('#location').text().replace("\xAD", "");
            if (!lab_list.includes(loc)) {
                return;
            }
            loc_type = loc;
            const moves = [];
            $('#cages > tbody > tr').each(function (r) {
                $(this).find('.cage').each(function (c) {
                    if ($(this).find('.move_parent, .smell_move').length) {
                        moves.push(`${c+1}x${r+1}`);
                    }
                });
            });
            const key = moves.join('|');
            let loc_id = searchMap[loc_type] && searchMap[loc_type][key];
            if (loc_id instanceof Array) { // Несколько локаций с такими переходами
                let was = +(loc_now.split(':')[1]);
                if (was === 0) return; // Мы не знаем где мы были
                let was1 = loc_id.findIndex(v => v == was + 1);
                let was2 = loc_id.findIndex(v => v == was - 1);
                if (was1 !== -1 && was2 !== -1) return; // Непонятно, позади мы или впереди
                if (was1 === -1 && was2 === -1) return; // Мы не знаем, где мы были
                let now = was1 !== -1 ? loc_id[was1] : loc_id[was2];
                loc_id = now;
            }
            if (loc_id) {
                $('#cws_7dl_loc_type').text(loc_type + ' [' + loc_id + ']');
                loc_prev = loc_now;
                loc_now = loc_type + ':' + loc_id;
                setSettings('loc_prev', loc_prev);
                setSettings('loc_now', loc_now);
                const loc = map[loc_type][loc_id];
                for (let coord in loc) {
                    let to = loc[coord];
                    coord = coord.split('x');
                    $('#cws_7dl_table').find('tr').eq(coord[1] - 1).find('td').eq(coord[0] - 1).addClass('highlight-' + to);
                }
            }
        }
        function switchMap() {
            if (!ready) return;
            loc_type = getLabName(lab_choice);
            let loc = lab_choice.indexOf('(верхний)') !== -1 ? -loc_choice : loc_choice;
            $('#cws_7dl_table td').removeClass('highlight-0').removeClass('highlight-1');
            $('#cws_7dl_loc_type').text(loc_type + ' [' + loc + ']');
            const locData = map[loc_type] && map[loc_type][loc];
            if (!locData) return;
            for (let coord in locData) {
                let to = locData[coord];
                coord = coord.split('x');
                $('#cws_7dl_table').find('tr').eq(coord[1] - 1).find('td').eq(coord[0] - 1).addClass('highlight-' + to);
            }
        }
        function switchLoc(newLoc) {
            if (!ready) return;
            if (newLoc != loc_choice) {
                let lab = getLabName(lab_choice);
                let count = getLocCount();
                if (newLoc < 1) newLoc = 1;
                if (newLoc > count) newLoc = count;
                loc_choice = newLoc;
                setSettings('loc_choice', loc_choice);
                $('#cws_7dl_loc_choice').val(loc_choice);
                switchMap();
            }
        }
        function startObserving() {
            if (isObserving) return;
            isObserving = true;
            setSettings('is_observing', isObserving);
            $('#cws_7dl_observe').text('НЕ обновлять при переходе');
            $('#cws_7dl_observe_alt').hide();
            refreshMap();
            observer.observe(document.getElementById('cages'), {
                childList: true, // watch for adding/removing nodes
                subtree: true, // watch inside all descendants
                attributes: true, // watch attribute changes
                attributeFilter: ['class'] // but only class changes
            });
        }
        function stopObserving() {
            if (!isObserving) return;
            isObserving = false;
            setSettings('is_observing', isObserving);
            $('#cws_7dl_observe').text('Обновлять при переходе');
            $('#cws_7dl_observe_alt').show();
            refreshMap();
            observer.disconnect();
        }
        function getLabName(fullName) {
            return fullName.split('(')[0].trim();
        }
        $.getJSON("https://reireirei72.github.io/zero-t-18883/shed/cws_7dl_map.json?" + Date.now())
            .done(function (r) { // Подгрузка заранее созданных карт
            map = r.map;
            searchMap = r.searchMap;
            ready = true;
            if (isObserving) {
                isObserving = false;
                setSettings('lab_choice', 'Лабиринт Безумных Волн (нижний)');
                setSettings('loc_choice', 1);
                startObserving();
            } else {
                switchMap();
            }
        })
            .fail(function (jqXHR, textStatus, errorThrown) {
            console.error("JSON failed:", textStatus, errorThrown);
        });

    }
})(window, document, jQuery);
