// The MIT License (MIT)
//
// Copyright (c) 2014 bspkrs (bspkrs@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var DEBUG = true;

var savedVersions = [];

var versionPattern = /^\d\.\d(\.\d|):(stable_(nodoc_|)\d+|snapshot_(nodoc_|)\d{8})$/;
var methodPattern = /func_\d+_[A-Za-z]*/;
var fieldPattern = /field_\d+_[A-Za-z]*/;
var paramPattern = /p_(i|)\d+_\d+_/;

function log()
{
    if (DEBUG)
        if (arguments.length == 1)
            console.log(chrome.runtime.getManifest()['name'] + ': ' + arguments[0]);
        else if (arguments.length > 1)
            console.log(chrome.runtime.getManifest()['name'] + ': ' + arguments[0], arguments.slice(1));
}

function error()
{
    if (arguments.length == 1)
        console.error(chrome.runtime.getManifest()['name'] + ': ' + arguments[0]);
    else if (arguments.length > 1)
        console.error(chrome.runtime.getManifest()['name'] + ': ' + arguments[0], arguments.slice(1));
}

function remapSrgNames(mappings)
{
    // TODO: create a function to actually do the remapping
    log(mappings['methods']['func_100011_g']);
}

function buttonClicked()
{
    //log('button clicked');
    var versionText = document.getElementById('mapping_version').value.replace('nodoc_', '');
    log(versionText);

    if (savedVersions != null && savedVersions.indexOf(versionText) > -1)
    {
        var mappings = getCachedMappings(versionText)

        if (mappings)
            remapSrgNames(mappings);
        else
            chrome.runtime.sendMessage(versionText, remapSrgNames);
    }
    else
    {
        chrome.runtime.sendMessage(versionText, remapSrgNames);
    }
}

function getCachedMappings(mappingKey)
{
    var ret = undefined;
    chrome.storage.local.get(mappingKey,
        function(items)
        {
            ret = items[mappingKey];
        }
    );
    return ret;
}

function validateVersion()
{
    var input = document.getElementById('mapping_version');
    var button = document.getElementById('remap_button');

    if (versionPattern.test(input.value))
        button.removeAttribute('disabled');
    else
        button.setAttribute('disabled', 'true');

    //log('Validation Passes: ' + versionPattern.test(input.value).toString().toLowerCase());
    //log('Button Disabled  : ' + button.getAttribute('disabled'))
}

function updateInputList(list)
{
    chrome.storage.sync.get('versions',
        function(items)
        {
            if (chrome.runtime.lastError != null) {
                log(chrome.runtime.lastError.message);
                savedVersions = [];
            }
            else
            {
                if (items['versions'] != undefined)
                    savedVersions = items['versions'];
                else
                    savedVersions = [];

                savedVersions.reverse().forEach(function (version, i)
                {
                    var option = document.createElement('option');
                    option.setAttribute('value', version);
                    option.innerHTML = version;
                    list.appendChild(option);
                });
            }
        }
    );
}

function addControls()
{
    var input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('class', 'input-mini');
    input.setAttribute('style', 'width: 170px')
    input.setAttribute('id', 'mapping_version');
    input.setAttribute('list', 'mapping_versions');
    input.setAttribute('placeholder', '1.8:snapshot_20141208');
    input.addEventListener('paste', validateVersion, true);
    input.addEventListener('click', validateVersion, true);
    input.addEventListener('keyup', validateVersion, true);
    input.addEventListener('blur', validateVersion, true);

    var button = document.createElement('input');
    button.setAttribute('type', 'button');
    button.setAttribute('id', 'remap_button');
    button.setAttribute('class', 'minibutton');
    button.setAttribute('value', 'Remap');
    button.addEventListener('click', buttonClicked, true);
    button.setAttribute('disabled', 'true');

    var list = document.createElement('datalist');
    list.setAttribute('id', 'mapping_versions');

    updateInputList(list);

    if (list.children.length > 0)
    {
        input.setAttribute('value', list.children[0].getAttribute('value'));
        button.removeAttribute('disabled');
    }

    var container = document.createElement('li');
    container.appendChild(input);
    container.appendChild(button);
    container.appendChild(list);

    var target = getControlsTarget();
    if (target.snapshotLength != 1)
        return;

    var parent = target.snapshotItem(0);
    parent.insertBefore(container, parent.firstChild);
}

function getControlsTarget()
{
    if (window.location.hostname == 'github.com')
        return document.evaluate("//ul[@class='pagehead-actions']", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    else if (window.location.hostname == 'pastebin.com')
        return document.evaluate("//*[@id='code_buttons']", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}

function getCodeElements()
{
    log(window.location.hostname);
    if (window.location.hostname == 'github.com')
        return document.evaluate("//td[contains(concat(' ', normalize-space(@class), ' '), ' blob-code ')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    else if (window.location.hostname == 'pastebin.com')
        return document.evaluate("//*[@id='selectable']/div/ol/li", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}

function init()
{
    var codeLines = getCodeElements();

    if (codeLines.snapshotLength > 0)
    {
        log('found code lines.');
        for (var i = 0; i < codeLines.snapshotLength; i++)
        {
            var text = codeLines.snapshotItem(i).innerHTML;
            if (fieldPattern.test(text) || methodPattern.test(text) || paramPattern.test(text))
            {
                addControls();
                break;
            }
        }
    }
}

init();