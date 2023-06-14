// The cross-decoder utilities below rely on a few functions in each decoder's host page:
//   * getCurrentCode()     // the most recent encoded value (either input as a code, or converted from alpha)
//   * createCode(alpha)    // convert alpha into a code, and cause it to be rendered
//   * lookupAlpha(code)    // lookup alpha from a code
//   * lookupCode(alpha)    // lookup what code goes with a given alpha character
//   * renderCode(code)     // return a tuple: [a code name, HTML represention of this code, unicode representation]
//   * clearPartial()       // clear any UI for creating codes
//   * codeKeyDown(event)   // (optional) convert a key down into a code
//   * processUrlParam(name, value)  // (optional) interpreter for special URL codes for each decoder
// as well as a few specific ID'd elements:
//   * <table id='InputTable'>
//   * <td id='AlphaToCode'>
//   * <td id='CodeToAlpha'>
//   * <input type='text' id='fromAlpha'>
//   * <span id='fromCode'>
//   * <button id='leftDir'>
//   * <button id='rightDir'>
//   * <td id="saveCode">

var onReverseDecoder = null;  // overridden by a function in the caller

function toggleClass(elmt, cls, add) {
    if (add) {
        elmt.classList.add(cls);
    }
    else {
        elmt.classList.remove(cls);
    }
}

function isFromAlpha() {
    return !document.getElementById('InputTable').classList.contains('ToAlpha');
}

function setAlpha(alpha) {
    alpha = alpha || '\u00a0';
    document.getElementById('fromCode').innerText = alpha;
    document.getElementById('fromAlpha').value = alpha;
}

function calcAlpha() {
    var code = getCurrentCode();
    var alpha = lookupAlpha(code);
    if (alpha === undefined) {
        alpha = code == '' ? ' ' : '⛔';
    }
    setAlpha(alpha);
}

function typeAlpha(key) {
    if (key.length != 1) {
        return;
    }
    var alpha = key.toUpperCase();
    var from = document.getElementById('fromAlpha');
    from.value = alpha;

    createCode(alpha);
    setAlpha(alpha);
    if (fastSave) {
        saveStack(false);
    }
}

function reverseDecoder(toAlpha) {
    if (toAlpha == undefined) {
        toAlpha = isFromAlpha();
    }
    var inputTable = document.getElementById('InputTable');
    var col1 = document.getElementById('AlphaToCode');
    var col3 = document.getElementById('CodeToAlpha');
    var btnLeft = document.getElementById('leftDir');
    var btnRight = document.getElementById('rightDir');
    var fastBtn = document.getElementById('fastButton');
    var saveBtn = document.getElementById('saveButton');
    var title = document.title;

    toggleClass(inputTable, 'ToAlpha', toAlpha);
    toggleClass(col1, 'hide', toAlpha);
    toggleClass(btnRight, 'active', toAlpha);
    toggleClass(col3, 'hide', !toAlpha);
    toggleClass(btnLeft, 'active', !toAlpha);

    if (toAlpha) {
        toggleClass(saveBtn, 'fastSave', false);
        title = title.replaceAll('Encode', 'Decode');
    }
    else {
        toggleClass(fastBtn, 'fastSave', fastSave);
        toggleClass(saveBtn, 'fastSave', fastSave);
        document.getElementById('fromAlpha').focus();
        title = title.replaceAll('Decode', 'Encode');
    }
    document.title = title;

    if (onReverseDecoder) {
        onReverseDecoder(toAlpha);
    }
}

var fastSave = true;
function toggleFast() {
    fastSave = !fastSave;
    var fastBtn = document.getElementById('fastButton');
    var saveBtn = document.getElementById('saveButton');
    if (fastSave)
    {
        fastBtn.classList.add('fastSave');
        saveBtn.classList.add('fastSave');
    }
    else
    {
        fastBtn.classList.remove('fastSave');
        saveBtn.classList.remove('fastSave');
    }
    document.getElementById('fromAlpha').focus();
}

function saveStack(lineBreak) {
    var alpha = isFromAlpha() 
        ? document.getElementById('fromAlpha').value
        : document.getElementById('fromCode').innerText;
    var code = getCurrentCode();
    var render = renderCode(code);
    var codeClass = ' class="' + render[0] + '"';
    var codeText = render.length == 3 ? (' data-text="' + render[2] + '"') : '';
    if (alpha == '' || alpha == ' ') {
        alpha = '&nbsp;'; 
    }
    var stack = '<table class="stack"><tr><td ' + codeClass + codeText + '>' + render[1]
        + '</td></tr><tr><td class="alpha">' + alpha + '</td></tr></table> ';
    if (lineBreak) {
        stack += '<br class="alpha" />';
    }


    var saveBox = document.getElementById('saveCode');
    saveBox.innerHTML += stack;
    clearPartial();
}

function clearStack() {
    var saveBox = document.getElementById('saveCode');
    saveBox.innerHTML = '';
    clearPartial();
}

function backspaceSave() {
    var pairs = document.getElementsByClassName('stack');
    if (pairs.length > 0) {
        var saveBox = document.getElementById('saveCode');
        saveBox.removeChild(pairs[pairs.length - 1]);
    }
}

function keyDown() {
    if (event.code == 'Escape') {
        clearPartial();
    }
    else if (event.ctrlKey && !event.code.startsWith('Control')) {
        // All the accelerators
        if (event.code == 'KeyC') {
            if (event.shiftKey) {
                clip(codeFormat);
            }
            else {
                clip('alpha');
            }
        }
        else if (event.code == 'KeyV') {
            paste();
        }
        else if (event.code == 'Space' && isFromAlpha()) {
            toggleFast();
        }
        else if (event.code == 'Backspace') {
            clearStack();
        }
    }
    else if (event.code == 'Space' || event.code == 'Enter' || event.code == 'NumpadEnter') {
        saveStack(event.code != 'Space');
    }
    else if (event.code == 'Backspace') {
        backspaceSave();
        clearPartial();
    }
    else if (event.key == 'CapsLock') {
        reverseDecoder();
    }
    else if (event.key == '?') {
        toggleInstructions();
    }
    else if (isFromAlpha()) {
        typeAlpha(event.key);
    }
    else if (codeKeyDown != undefined) {
        codeKeyDown(event);
    }
}

function clip(spanClass, dataAttr) {
    var parent = document.getElementById('saveCode');
    var tds = parent.getElementsByClassName(spanClass);
    var str = '';
    for (var i = 0; i < tds.length; i++) {
        if (tds[i].tagName == 'BR') {
            str += '\n';
        }
        else if (dataAttr == undefined) {
            str += tds[i].innerHTML;
        }
        else {
            var simple = tds[i].getAttribute('data-text');
            if (simple != null) {
                str += simple + ' ';
            }
        }
    }
    str = str.replaceAll('&nbsp;', ' ');
    // var dest = document.getElementById('copyable')
    // dest.innerHTML = str;

    // Select the copyable span
    // window.getSelection().removeAllRanges()
    // var range = document.createRange()
    // range.selectNode(dest)
    // window.getSelection().addRange(range)

    // if (asCode) {
        // var prefix = '<html><head><style>'
        //     + '</style></head><body><p>';
        // var suffix = '</p></body></html>';
        // str = generateCfHtml(str, prefix, suffix);
    // }

    var type = "text/plain";  // (spanClass == 'alpha') ? "text/plain" : "text/html";
    var blob = new Blob([str], { type });
    var data = [new ClipboardItem({ [type]: blob })];

    navigator.clipboard.write(data).then(
        function () { /* success */ },
        function () { alert('Failed copy');/* failure */}
    );
}

function paste(spanClass) {
    navigator.clipboard.readText().then(
        clipText => pasteText(clipText),
        function () { /* failure */}
    );
}

const _startFragment = '<!--StartFragment -->';
const _endFragment = '<!--EndFragment -->';
function generateCfHtml(fragment, prefix, suffix) {
    prefix = prefix || '';
    suffix = suffix || '';
    var header = [
        'StartHTML:', 0, '\r\n',
        'EndHTML:', 0, '\r\n',
        'StartFragment:', 0, '\r\n',
        'EndFragment:', 0,
    ];
    var parts = [ '\r\n', prefix, '\r\n', _startFragment, '\r\n', fragment, '\r\n', _endFragment, '\r\n', suffix];
    var contentLen = 0;
    for (var i = 0; i < parts.length; i++) {
        contentLen += parts[i].length;
    }
    for (var i = 0; i < 4; i++) {
        header[i * 3 + 1] = contentLen;
    }
    var strHeader = header.join('');
    var headerLen = strHeader.length;
    header[1] = headerLen + 1;
    header[4] = headerLen + contentLen;
    header[7] = headerLen + prefix.length + _startFragment.length + 3;
    header[10] = header[7] + fragment.length;
    var cfhtml = header.join('');
    if (cfhtml.length < headerLen) {
        cfhtml += ' '.repeat(headerLen - strHeader.length);
    }
    cfhtml += parts.join('');
    return cfhtml;
}

function toggleInstructions(show) {
    var instr = document.getElementById('instructions');
    if (show == undefined) {
        show = instr.style.display == 'none';
    }
    if (show) {
        instr.style.display = '';
        instr.scrollIntoView();
    }
    else {
        instr.style.display = 'none';
    }
}

function areInstructionsVisible() {
    var instr = document.getElementById('instructions');
    return instr.style.display != 'none';
}

function readUrl() {
    var search = window.location.search.toLowerCase();
    var decode = true;
    if (search !== null) {
        var params = search.substring(1).split('&');
        for (var i = 0; i < params.length; i++) {
            var vals = params[i].split('=');
            if (vals.length == 1) {
                // parameter is a name without a value
                if (vals[0] == '') {
                    continue;  // Ignore a lone stray =
                }
                vals.push('');  // set '' as the default value
            }
            
            if (vals[0] == 'encode' || vals[0] == 'alpha' || vals[0] == 'text' || vals[0] == 'paste') {
                decode = false;
                //reverseDecoder(false);
                pasteText(vals[1]);
            }
            else if (vals[0] == 'help' || vals[0].startsWith('instr')) {
                toggleInstructions(vals[1] != '0');
            }
            else if (vals[0] == 'decode') {
                decode = true;
            //     pasteCode(vals[1]);
            }
            else if (vals[0] == 'fast') {
                fastSave = vals[1] == '1' || vals[1].toLowerCase() == 'true';
            }
            else if (processUrlParam != undefined) {
                    processUrlParam(vals[0], vals[1]);
            }
        }
    }
    reverseDecoder(decode);
}

function pasteText(letters) {
    for (var i = 0; i < letters.length; i++) {
        typeAlpha(letters[i]);
        saveStack(false);
    }
}

function goto(page) {
    var url = page + '.html';
    args = [];
    args.push(isFromAlpha() ? 'encode' : 'decode');
    if (areInstructionsVisible()) {
        args.push('help');
    }
    if (args.length > 0) {
        url += '?';
    }
    if (isFromAlpha() && !fastSave) {
        args.push('fast=0');
    }
    url += args.join('&');
    window.location.href = url;
}