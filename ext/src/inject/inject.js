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
//var baseUrl = 'http://files.minecraftforge.net/maven/de/oceanlabs/mcp/';
var baseUrl = 'https://export.mcpbot.bspk.rs/';

function log(str)
{
    if (DEBUG) console.log('SRG Remapper: ' + str);
}

function error(str)
{
    console.error(str);
}

function getZipUrl(input)
{   // Expected format: version:channel, eg 1.8:snapshot_20141210
    // baseUrl + mcp_snapshot_nodoc/20141210-1.8/mcp_snapshot_nodoc-20141210-1.8.zip
    var splitted = input.split(':');
    var version = splitted[0];
    splitted = splitted[1].replace('nodoc_', '').split('_');
    var chanType = splitted[0] + '_nodoc';
    var chanNum = splitted[1];

    var path = 'mcp_' + chanType + '/' + chanNum + '-' + version;
    return baseUrl + path + '/' + path.replace('/', '-') + '.zip';
}

function fetchCsvZip(versionInput)
{
    var xhr = new XMLHttpRequest();
    xhr.responseType = "arraybuffer";
    xhr.onreadystatechange = function(data)
    {
        if (xhr.readyState == 4)
        {
            if (xhr.status == 200)
                onZipFetch(xhr.response);
            else
                error('Unable to retrieve CSV zip file! Status ' + xhr.status + ' returned.');
        }
    };

    xhr.open('GET', getZipUrl(versionInput), true);
    xhr.send();
}

function onZipFetch(data)
{
    log('We got the zip file! Hooray!');
    var zip = JSZip(data);

    var mappings = {};

    var methods = zip.file('methods.csv').asText().split('\n').slice(1);
    mappings['methods'] = {};
    methods.forEach(function (line, i)
    {
        var splitted = line.split(',');
        mappings['methods'][splitted[0]] = splitted[1];
    });

    var fields = zip.file('fields.csv').asText().split('\n').slice(1);
    mappings['fields'] = {};
    fields.forEach(function (line, i)
    {
        splitted = line.split(',');
        mappings['fields'][splitted[0]] = splitted[1];
    });

    var params = zip.file('params.csv').asText().split('\n').slice(1);
    mappings['params'] = {};
    params.forEach(function (line, i)
    {
        splitted = line.split(',');
        mappings['params'][splitted[0]] = splitted[1];
    });

    // TODO: cache data as json and save version string

    remapSrgNames(mappings);
}

function buttonClicked()
{
    log('button clicked');
    var versionText = document.getElementById('mapping_version').value;
    log(versionText);

    if (savedVersions != null && savedVersions.indexOf(versionText) > -1)
    {
        // TODO: if data is cached, use that
        //remapSrgNames();

        // TODO: if data isn't cached, get it, cache it, and use it
        fetchCsvZip(versionText);
    }
    else
    {
        fetchCsvZip(versionText);
    }
}

function validateVersion()
{
    var input = document.getElementById('mapping_version');
    var button = document.getElementById('remap_button');

    if (versionPattern.test(input.value))
        button.removeAttribute('disabled');
    else
        button.setAttribute('disabled', 'true');

    log('Validation Passes: ' + versionPattern.test(input.value).toString().toLowerCase());
    log('Button Disabled  : ' + button.getAttribute('disabled'))
}

// TODO: create a function to actually do the remapping

function remapSrgNames(mappings)
{

}

function addControls()
{
    var input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('class', 'input-mini');
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

    chrome.storage.sync.get('versions',
        function(items)
        {
            if (chrome.runtime.lastError != null) {
                log(chrome.runtime.lastError.message);
                savedVersions = [];
            }
            else
            {
                savedVersions = items.versions;
                savedVersions.forEach(function (version, i)
                {
                    var option = document.createElement('option');
                    option.setAttribute('value', version);
                    option.innerHTML = version;
                    list.appendChild(option);
                });

                if (list.children.length > 0)
                {
                    input.setAttribute('value', list.children[0].getAttribute('value'));
                    button.removeAttribute('disabled');
                }
            }
        });

    var container = document.createElement('li');
    container.appendChild(input);
    container.appendChild(button);
    container.appendChild(list);

    var target = document.evaluate("//ul[@class='pagehead-actions']", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    // TODO: pastebin: .//*[@id='code_buttons']
    if (target.snapshotLength != 1)
    {
        log('unable to find ul.');
        return;
    }
    log('adding controls');
    var parent = target.snapshotItem(0);
    parent.insertBefore(container, parent.firstChild);
}

function getCodeElements()
{
    return document.evaluate("//td[contains(concat(' ', normalize-space(@class), ' '), ' blob-code ')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    // TODO: pastebin: .//*[@id='selectable']/div/ol/li
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