// ==UserScript==
// @name         mattermost-colornicks
// @description  A simple userscript that colorizes nicks in the mattermost web client
// @version      0.1
// @author       Dan Hill
// @match        https://chat.canonical.com/
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @require      https://raw.githubusercontent.com/hillpd/mutation-summary/master/src/mutation-summary.js
// ==/UserScript==
/* globals jQuery, $, MutationSummary */

// Recommended Theme: {"sidebarBg":"#000000","sidebarText":"#ffffff","sidebarUnreadText":"#ffffff","sidebarTextHoverBg":"#333333","sidebarTextActiveBorder":"#77216f","sidebarTextActiveColor":"#ffffff","sidebarHeaderBg":"#000000","sidebarHeaderTextColor":"#ffffff","onlineIndicator":"#00ff00","awayIndicator":"#e95420","dndIndicator":"#ff0000","mentionBg":"#772953","mentionBj":"#772953","mentionColor":"#ffffff","centerChannelBg":"#000000","centerChannelColor":"#ffffff","newMessageSeparator":"#772953","linkColor":"#0099ff","buttonBg":"#000000","buttonColor":"#ffffff","errorTextColor":"#ff0000","mentionHighlightBg":"#21252b","mentionHighlightLink":"#ffffff","codeTheme":"high-contrast-dark"}

var _colors = [
        "#da70d6",
        "#20b2aa",
        "#00ff00",
        "#32cd32",
        "#40e0d0",
        "#bdb76b",
        "#87ceeb",
        "#9acd32",
        "#ee82ee",
        "#6495ed",
        "#66cdaa",
        "#00ffff",
        "#d68fff",
        "#3cb371",
        "#339cff",
        "#ffff00",
        "#8fbc8f",
        "#b2a9e5",
        "#deb887",
        "#ffd700",
        "#ff69b4",
        "#ffb6c1",
    ];
    
    function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;
    
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
    
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
    
            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
    
        return array;
    }
    
    Object.defineProperty(String.prototype, 'hashCode', {
        value: function() {
            var hash = 0, i, chr;
            for (i = 0; i < this.length; i++) {
                chr = this.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return Math.abs(hash);
        }
    });
    
    function isEmpty(str) {
        return (!str || 0 === str.length);
    }
    
    function refresh_css() {
        'use strict';
        function gen_css(color, index) {
            // TODO: modify existing css if the style already exists (to cycle colors)
            GM_addStyle(".nick-" + index + " { color: " + color + " !important; font-size: 15px; font-family: Hack, monospace; font-weight: 600 }");
        }
    
        shuffle(_colors).forEach(gen_css);
    }
    
    refresh_css();
    var _post_observer = new MutationSummary ({
        callback: handle_user_update,
        queries: [{
            characterData: true
        }]
    });
    
    function handle_user_update(mute_summaries) {
        'use strict';
    
        function colorize_nick(obj_nick) {
            var nick = obj_nick.innerText.replace(/^@/,"");
            var bucket = GM_getValue(nick, "");
            if (isEmpty(bucket)) {
                bucket = nick.hashCode() % _colors.length;
                GM_setValue(nick, bucket);
            }
    
            obj_nick.classList.add("nick-" + bucket);
    
            // Strip '@' from mentions
            obj_nick.innerText = nick;
        }
    
        function filter(text) {
            var nick = "";
            var list = text.parentElement.classList;
            if (list.contains('mention-link') || list.contains('user-popover')) {
                nick = text.textContent;
            }
            // Mattermost uses '{S,s}omeone' placeholders until queries resolve.
            if (!isEmpty(nick) && nick.toLowerCase().localeCompare("someone") != 0) {
                colorize_nick(text.parentElement);
            }
        }
    
        function process_summary(summary) {
            if (Array.isArray(summary.added) && summary.added.length) {
                summary.added.forEach(filter);
            }
            if (typeof summary.valueChanged !== 'undefined' && Array.isArray(summary.valueChanged)) {
                summary.valueChanged.forEach(filter);
            }
        }
    
        mute_summaries.forEach(process_summary);
    }