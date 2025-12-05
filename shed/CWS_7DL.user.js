// ==UserScript==
// @name         CWS 7dl
// @version      0.1
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
    console.log(actionData);
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
        $('.other_cats_list').append('| <span id="cws_localTimer">' + getTimeStr() + '</span> | <span id="cws_actionTimer">' + getActionTimeStr() + '</span>');
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
        const map = {
            "Лабиринт Слабости": {
                1: {"1x4": 0, "1x6": 0, "5x6": 0, "7x5": 1},
            },
        };
        const searchMap = {};

        for (const [groupName, locations] of Object.entries(map)) {
            const groupResult = {};

            for (const [locId, coordsObj] of Object.entries(locations)) {

                // sort "CxRy" → by row then col
                const sortedCoords = Object.keys(coordsObj).sort((a, b) => {
                    const [ax, ay] = a.split('x').map(Number);
                    const [bx, by] = b.split('x').map(Number);

                    if (ay !== by) return ay - by; // row first
                    return ax - bx; // then column
                });

                const key = sortedCoords.join('|'); // "1x4|1x6|7x5|5x6"

                groupResult[key] = Number(locId);
            }

            searchMap[groupName] = groupResult;
        }
        console.log(searchMap)
        $('head').append(`<style>#cws_7dl_table td {height: 30px;width:22px;}</style>`);
        let html = '<div id="cws_7dl_div">';
        var loc_type = null;
        html += '<div style="padding-bottom: .5em"><b>Карта 7ДЛ</b></div>';
        html += '<div style="padding-bottom: .5em" id="cws_7dl_loc_type">Неизвестный лабиринт</div>';
        html += '<div><table border=1 id="cws_7dl_table">';
        for (let y = 0; y < 6; y++) {
            html += '<tr>';
            for (let x = 0; x < 10; x++) {
                html += '<td></td>';
            }
            html += '</tr>';
        }
        html += '</table></div>';
        html += '<div><small>Зелёное - к МВ (МП), синее - к ОВ (ОП)</small></div>';
        html += '<div><button id="cws_7dl_search">Где я?</button></div>';
        html += '<div><button id="cws_7dl_observe">Не обновлять при переходе</button></div>';
        html += '</div>';
        $('#app').append(html);
        function refreshMap(isAuto = false) {
            $('#cws_7dl_table td').removeClass('highlight');
            let loc = $('#location').text();
            if (!['Лабиринт Безумных Волн', 'Лабиринт Зноя', 'Лабиринт Острых Зубьев', 'Великий Путь', 'Лабиринт Жажды', 'Лабиринт Темноты', 'Лабиринт Искушений', 'Лабиринт Внимательности', 'Лабиринт Бессилия', 'Лабиринт Слабости', 'Лабиринт Забвения'].includes(loc)) {
                return;
            }
            loc_type = loc;
            $('#cws_7dl_loc_type').text(loc);
            const moves = [];
            $('#cages > tbody > tr').each(function (r) {
                $(this).find('.cage').each(function (c) {
                    if ($(this).find('.move_parent').length) {
                        moves.push(`${c}x${r}`);
                        const $targetTd = $('#cws_7dl_table').find('tr').eq(r).find('td').eq(c).addClass('highlight');
                    }
                });
            });
            const key = moves.join('|'); // e.g. "9x1|6x5"
        }
        const cagesTable = document.getElementById('cages');
        var isObserving = false;
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;

            for (const m of mutations) {
                if (m.type === 'childList') {
                    // added nodes
                    m.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return; // not an element
                        if (node.matches && node.matches('.move_parent')) {
                            shouldUpdate = true;
                        } else if (node.querySelector && node.querySelector('.move_parent')) {
                            shouldUpdate = true;
                        }
                    });

                    // removed nodes
                    m.removedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        if (node.matches && node.matches('.move_parent')) {
                            shouldUpdate = true;
                        } else if (node.querySelector && node.querySelector('.move_parent')) {
                            shouldUpdate = true;
                        }
                    });
                } else if (m.type === 'attributes' && m.attributeName === 'class') {
                    // class changed on some element – if it's a move_parent, update
                    if (m.target.classList.contains('move_parent')) {
                        shouldUpdate = true;
                    }
                }

                if (shouldUpdate) break; // no need to keep checking
            }

            if (shouldUpdate) {
                refreshMap(true);
            }
        });
        function startObserving() {
            if (isObserving) return;
            isObserving = true;
            $('#cws_7dl_observe').text('НЕ обновлять при переходе');
            observer.observe(cagesTable, {
                childList: true, // watch for adding/removing nodes
                subtree: true, // watch inside all descendants
                attributes: true, // watch attribute changes
                attributeFilter: ['class'] // but only class changes
            });
        }
        function stopObserving() {
            if (!isObserving) return;
            isObserving = false;
            $('#cws_7dl_observe').text('Обновлять при переходе');
            refreshMap();
            observer.disconnect();
        }
        startObserving();
        $('body').on('click', '#cws_7dl_observe', (e) => {
            if (isObserving) stopObserving();
            else startObserving();
        });
        $('body').on('click', '#cws_7dl_search', (e) => {
            refreshMap(true);
        });

    }
})(window, document, jQuery);
