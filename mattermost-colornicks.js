// ==UserScript==
// @name         mattermost-colornicks
// @description  A simple userscript that colorizes nicks in the mattermost web client
// @version      0.2
// @author       daniel.hill@canonical.com
// @match        https://chat.canonical.com/
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @require      https://raw.githubusercontent.com/hillpd/mutation-summary/master/src/mutation-summary.js
// ==/UserScript==
/* globals jQuery, $, MutationSummary */

// Recommended Theme: {"sidebarBg":"#000000","sidebarText":"#ffffff","sidebarUnreadText":"#ffffff","sidebarTextHoverBg":"#333333","sidebarTextActiveBorder":"#77216f","sidebarTextActiveColor":"#ffffff","sidebarHeaderBg":"#000000","sidebarHeaderTextColor":"#ffffff","onlineIndicator":"#00ff00","awayIndicator":"#e95420","dndIndicator":"#ff0000","mentionBg":"#772953","mentionBj":"#772953","mentionColor":"#ffffff","centerChannelBg":"#000000","centerChannelColor":"#ffffff","newMessageSeparator":"#772953","linkColor":"#0099ff","buttonBg":"#000000","buttonColor":"#ffffff","errorTextColor":"#ff0000","mentionHighlightBg":"#21252b","mentionHighlightLink":"#ffffff","codeTheme":"high-contrast-dark"}

'use strict';

// Compact sidebar channel, maximize visible channel space
var style = document.createElement('style');
style.innerHTML += `
#unreadIndicatorTop {display: none !important;}
#unreadIndicatorBottom {display: none !important;}
.SidebarChannelNavigator {display: none !important;}
.SidebarChannel {font-size:10px !important; height: 16px !important;}
.SidebarChannelGroupHeader {font-size:12px !important; height: 16px !important;}
.SidebarChannelGroupHeader_groupButton {font-size:12px !important; height: 16px !important;}
.clearfix {border: 0px !important;}
.col__name {margin-left:0.5em !important;}
`;
document.head.appendChild(style);

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
var obj_channels = null;
var obj_dms = null;
var swapped = false;
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

        // Uncomment the following line to strip '@' from mentions
        //obj_nick.innerText = nick;
    }

    function swap_channel_groups() {
        // Swap channel groups when we've found their respective objects
        if (!swapped && obj_channels != null && obj_dms != null) {
            swapped = true;
            obj_dms.parentElement.insertBefore(obj_dms, obj_channels);
        }
    }

    function filter(text) {
        var nick = "";
        var channel = "";
        var list = text.parentElement.classList;
        if (list.contains('mention-link') || list.contains('user-popover')) {
            nick = text.textContent;

            // Mattermost uses '{S,s}omeone' placeholders until queries resolve.
            if (!isEmpty(nick) && nick.toLowerCase().localeCompare("someone") != 0) {
                colorize_nick(text.parentElement);
            }
        }

        // Harvest the swappable divs for channel group headers: 'CHANNELS' and 'DIRECT MESSAGES'
        if (list.contains("SidebarChannelGroupHeader_text")) {
            // TODO: Deprecate? Latest MM allows re-ordering channel groups. 
            //       Forced re-ordering may now be redundant/annoying.
            channel = text.textContent;
            if (channel.toLowerCase().localeCompare("channels") == 0) {
                obj_channels = text.parentElement.closest(".SidebarChannelGroup");
            }
            if (channel.toLowerCase().localeCompare("direct messages") == 0) {
                obj_dms = text.parentElement.closest(".SidebarChannelGroup");
            }
            swap_channel_groups();
        }

        // Capture the creation of the channel post textbox
        if (list.contains("custom-textarea") && text.textContent.toLowerCase().slice(0,9).localeCompare("write to ") == 0) {
            // Block tabbing out!
            $('#post_textbox').on('keydown', function(e){if (e.keyCode == 9) e.preventDefault()});
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