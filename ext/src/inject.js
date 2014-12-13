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

toastr.options.closeButton = true;
toastr.options.showMethod = 'slideDown';
toastr.options.hideMethod = 'slideUp';

//var DEBUG = false;

var savedVersions = [];
var controlsAdded = false;
var pollCount = 0;
var pollLimit = 20;

var versionPattern = /^\d+\.\d+(\.\d+|):(stable_(nodoc_|)\d+|snapshot_(nodoc_|)\d{8})$/;
var methodPattern = /func_\d+_[A-Za-z]*/;
var fieldPattern = /field_\d+_[A-Za-z]*/;
var paramPattern = /p_(i|)\d+_\d+_/;

//function log()
//{
//    if (DEBUG)
//        if (arguments.length == 1)
//            console.log(chrome.runtime.getManifest()['name'] + ': ' + arguments[0]);
//        else if (arguments.length > 1)
//            console.log(chrome.runtime.getManifest()['name'] + ': ' + arguments[0], arguments.slice(1));
//}

function error()
{
    if (arguments.length == 1)
        console.error(chrome.runtime.getManifest()['name'] + ': ' + arguments[0]);
    else if (arguments.length > 1)
        console.error(chrome.runtime.getManifest()['name'] + ': ' + arguments[0], arguments.slice(1));
}

function remapSrgNames(mappings) {
    if (mappings['error'])
    {
        toastr.error(mappings['error']);
        return;
    }

    updateInputList();

    var codeLines = getCodeElements();
    for (var i = 0; i < codeLines.snapshotLength; i++)
    {
        var line = codeLines.snapshotItem(i);
        line.innerHTML = line.innerHTML.replace(/(?:func_\d+_[A-Za-z]+_?|field_\d+_[A-Za-z]+_?|p_(i|)\d+_\d+_?)/g, function (token)
            {
                var mcpname = mappings[token];
                if (mcpname)
                    return "<u title=\"" + token + "\">" + mcpname + "</u>";

                return "<u title=\"" + token + "\"><i>" + token + "</i></u>";
            }
        );
    }

    toastr.success('SRG named elements have been remapped :)');

    //chrome.storage.local.getBytesInUse(null, function(bytesInUse){ log('Local Storage Size: ' + bytesInUse); });
}

function buttonClicked()
{
    var versionText = document.getElementById('mcpsrgmapper_mapping_version').value.replace('nodoc_', '');

    if (savedVersions != null && savedVersions.indexOf(versionText) > -1)
    {
        getCachedMappings(versionText, function(mappings)
            {
                if (mappings)
                {
                    remapSrgNames(mappings);
                }
                else
                {
                    chrome.runtime.sendMessage(versionText, remapSrgNames);
                }
            }
        );
    }
    else
    {
        chrome.runtime.sendMessage(versionText, remapSrgNames);
    }
}

function getCachedMappings(mappingKey, callback)
{
    chrome.storage.local.get(mappingKey, function(items){ callback(items[mappingKey]); });
}

function validateVersion()
{
    var input = document.getElementById('mcpsrgmapper_mapping_version');
    var button = document.getElementById('mcpsrgmapper_button');

    if (versionPattern.test(input.value))
        button.removeAttribute('disabled');
    else
        button.setAttribute('disabled', 'true');
}

function updateInputList(list, callback)
{
    if (!list)
        list = document.getElementById('mcpsrgmapper_mapping_versions');

    chrome.storage.sync.get('versions',
        function(items)
        {
            if (chrome.runtime.lastError != null) {
                error(chrome.runtime.lastError.message);
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

                if (callback)
                    callback();
            }
        }
    );
}

function addControls()
{
    var target = getControlsTarget();
    if (target.snapshotLength != 1)
        return;

    var input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('class', 'input-mini');
    input.setAttribute('style', 'width: 170px');
    input.setAttribute('id', 'mcpsrgmapper_mapping_version');
    input.setAttribute('list', 'mapping_versions');
    input.setAttribute('placeholder', '1.8:snapshot_20141208');
    input.addEventListener('paste', validateVersion, true);
    input.addEventListener('click', validateVersion, true);
    input.addEventListener('keyup', validateVersion, true);
    input.addEventListener('blur', validateVersion, true);

    var button = document.createElement('input');
    button.setAttribute('type', 'button');
    button.setAttribute('id', 'mcpsrgmapper_button');
    button.setAttribute('class', 'minibutton');
    button.setAttribute('value', 'Remap');
    button.addEventListener('click', buttonClicked, true);
    button.setAttribute('disabled', 'true');

    var list = document.createElement('datalist');
    list.setAttribute('id', 'mcpsrgmapper_mapping_versions');

    updateInputList(list,
        function()
        {
            if (list.children.length > 0) {
                input.setAttribute('value', list.children[0].getAttribute('value'));
                button.removeAttribute('disabled');
            }
        }
    );

    var container = getControlsContainer();
    container.setAttribute('id', 'mcpsrgmapper_input_controls');
    container.appendChild(input);
    container.appendChild(button);
    container.appendChild(list);
    insertControlsContainer(target, container);

    controlsAdded = true;
}

function removeControls()
{
    var controls = document.getElementById('mcpsrgmapper_input_controls');
    if (controls)
        controls.parentNode.removeChild(controls);
    controlsAdded = false;
}

function insertControlsContainer(target, container)
{
    var parent = target.snapshotItem(0);

    if (window.location.hostname === 'github.com')
        parent.insertBefore(container, parent.firstChild);
    else if (window.location.hostname === 'pastebin.com')
        parent.appendChild(container);
}

function getControlsContainer()
{
    if (window.location.hostname === 'github.com')
        return document.createElement('li');
    else if (window.location.hostname === 'pastebin.com')
        return document.createElement('span');
}

function getControlsTarget()
{
    if (window.location.hostname === 'github.com')
        return document.evaluate("//ul[@class='pagehead-actions']", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    else if (window.location.hostname === 'pastebin.com')
        return document.evaluate("//*[@id='code_buttons']", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}

function getCodeElements()
{
    if (window.location.hostname === 'github.com')
        return document.evaluate("//td[contains(concat(' ', normalize-space(@class), ' '), ' blob-code ')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    else if (window.location.hostname === 'pastebin.com')
        return document.evaluate("//*[@id='selectable']/div/ol/li", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}

function init()
{
    var codeLines = getCodeElements();

    if (codeLines.snapshotLength > 0 && !controlsAdded)
    {
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
    else
        removeControls();
}

function poll()
{
    var codeLines = getCodeElements();
    pollCount++;

    if ((controlsAdded && codeLines.snapshotLength == 0) || (!controlsAdded && codeLines.snapshotLength > 0))
    {
        clearInterval(poll);
        pollCount = 0;
        init();
    }
    else if (pollCount >= pollLimit)
    {
        clearInterval(poll);
        pollCount = 0;
    }
}

// The following is mostly copied from http://www.bennadel.com/blog/1520-binding-events-to-non-dom-objects-with-jquery.htm
(
    function( $ )
    {
        var strLocation = window.location.href;
        var strHash = window.location.hash;
        var strPrevLocation = "";
        var strPrevHash = "";
        var intIntervalTime = 200;
        var fnCleanHash = function( strHash )
        {
            return(
                strHash.substring( 1, strHash.length )
            );
        };
        var fnCheckLocation = function()
            {
                if (strLocation != window.location.href)
                {
                    strPrevLocation = strLocation;
                    strPrevHash = strHash;
                    strLocation = window.location.href;
                    strHash = window.location.hash;
                    $( window.location ).trigger(
                        "change",
                        {
                            currentHref: strLocation,
                            currentHash: fnCleanHash( strHash ),
                            previousHref: strPrevLocation,
                            previousHash: fnCleanHash( strPrevHash )
                        }
                    );

                }
            };
        setInterval( fnCheckLocation, intIntervalTime );
    }
)( jQuery );

if (window.location.hostname === 'github.com')
    $( window.location ).bind("change",
        function(objEvent, objData)
        {
            setInterval(poll, 500);
        }
    );

init();