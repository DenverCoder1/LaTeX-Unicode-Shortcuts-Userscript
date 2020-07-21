// ==UserScript==
// @name         LaTeX Unicode Shortcuts
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Highlight text then press [ALT+X] to convert LaTeX commands to their unicode equivalent (ex. \pi → π)
// @author       eyl327
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var convert;

    var dictLoaded = false;

    /* source url for shortcut file */
    var dictionarySource = "https://raw.githubusercontent.com/eyl327/LaTeX-Gboard-Dictionary/master/dictionary.txt";

    /* fetch text file when requested */
    function loadAsset(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200 || xhr.status == 0) {
                    callback(xhr.responseText);
                }
            }
        }
        xhr.send();
    }

    /* on dictionary loaded callback */
    function loaded(response) {
        console.log("LaTeX Unicode Shortcuts has been loaded.");
        /* generate dictionary from text file */
        var dictArr = response.split("\n").slice(1);
        var dictionary = {};
        for (var i = 0, len = dictArr.length; i < len; ++i) {
            var kvp = dictArr[i].split("\t");
            dictionary[kvp[0]] = kvp[1];
        }
        /* conversion function */
        convert = function (text) {
            var result = text.replace(/{([A-Za-z0-9])}/g, '$1'); // {R} => R
            for (var key in dictionary) {
                var pattern = new RegExp(key.replace(/([[^$.|\\?*+(){}])/g, '\\$1') + "\\b", 'g'); // clean and escape key
                var replaced = result.replace(pattern, dictionary[key]);
                if (replaced.length < result.length) {
                    result = replaced;
                }
            }
            return result;
        };
        dictLoaded = true;
    }

    /* get caret position within input box */
    function getCaretPosition(el) {
        if ("selectionStart" in el && document.activeElement == el) {
            return {
                start: el.selectionStart,
                end: el.selectionEnd
            };
        }
        else if (el.createTextRange) {
            var sel = document.selection.createRange();
            if (sel.parentElement() === el) {
                var range = el.createTextRange();
                range.moveToBookmark(sel.getBookmark());
                for (var len = 0;
                    range.compareEndPoints("EndToStart", range) > 0;
                    range.moveEnd("character", -1)) {
                    len++;
                }
                range.setEndPoint("StartToStart", el.createTextRange());
                for (var pos = { start: 0, end: len };
                    range.compareEndPoints("EndToStart", range) > 0;
                    range.moveEnd("character", -1)) {
                    pos.start++;
                    pos.end++;
                }
                return pos;
            }
        }
        return -1;
    }

    /* set caret position within input box */
    function setCaretPosition(el, pos) {
        if (el.setSelectionRange) {
            el.focus();
            el.setSelectionRange(pos, pos);
        }
        else if (el.createTextRange) {
            var range = el.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
    }

    function replaceConversionInElement(activeEl, start, end) {
        var fullText = activeEl.value;
        var textToConvert = fullText.substring(start, end);
        var before = fullText.substring(0, start);
        var after = fullText.substring(end, fullText.length);
        // convert selection
        var convertedText = convert(textToConvert);
        // overwrite text
        activeEl.value = before + convertedText + after
        // set cursor to be at end of selection
        setCaretPosition(activeEl, before.length + convertedText.length);
    }

    /* convert hilighted text in active element */
    function convertSelection(activeEl) {
        var caretRange = getCaretPosition(activeEl);
        var selStart = caretRange.start;
        var selEnd = caretRange.end;
        /* if selection is empty, find word at caret */
        if (selStart == selEnd) {
            var fullText = activeEl.value;
            // Find beginning and end of word
            var left = fullText.slice(0, selStart + 1).search(/\S+$/);
            var right = fullText.slice(selStart).search(/(\s|$)/);
            /* convert the word at the caret selection */
            replaceConversionInElement(activeEl, left, right + selStart)
        }
        /* else convert the selection */
        else {
            replaceConversionInElement(activeEl, selStart, selEnd);
        }
    }

    /* detect ALT+X keyboard shortcut */
    async function enableLaTeXShortcuts(event) {
        if (event.altKey && event.keyCode == 88) { // ALT+X
            // load dictionary when first pressed
            if (!dictLoaded) {
                await loadAsset(dictionarySource, loaded);
            }
            // convert selection
            var activeEl = document.activeElement;
            var activeElTag = activeEl.tagName.toLowerCase();
            if (activeElTag == "textarea" || activeElTag == "input") {
                convertSelection(activeEl);
            }
        }
    }

    document.addEventListener('keydown', enableLaTeXShortcuts, false);

})();