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

var baseUrl = 'http://files.minecraftforge.net/maven/de/oceanlabs/mcp/';

chrome.runtime.onMessage.addListener(fetchCsvZip);

function getZipUrl(input)
{
    var splitted = input.split(':');
    var version = splitted[0];
    splitted = splitted[1].split('_');
    var chanType = splitted[0] + '_nodoc';
    var chanNum = splitted[1];

    var path = 'mcp_' + chanType + '/' + chanNum + '-' + version;
    return baseUrl + path + '/' + path.replace('/', '-') + '.zip';
}

function fetchCsvZip(versionInput, sender, callback)
{
    var xhr = new XMLHttpRequest();
    var url = getZipUrl(versionInput);
    xhr.responseType = "arraybuffer";
    xhr.onreadystatechange = function(data)
    {
        if (xhr.readyState == 4)
        {
            if (xhr.status == 200)
                onZipFetch(versionInput, xhr.response, callback);
            else
                callback({error: 'Unable to retrieve CSV zip file! Status ' + xhr.status + ' returned from ' + url});
        }
    };

    log(url);
    xhr.open('GET', url, true);
    xhr.send();
    return true;
}

function onZipFetch(mappingKey, data, callback)
{
    log('We got the zip file! Hooray!');
    var zip = JSZip(data);

    var mappings = {};

    zip.file('methods.csv').asText().split('\n').slice(1).forEach(function (line, i)
    {
        var splitted = line.split(',');
        mappings[splitted[0]] = splitted[1];
    });

    zip.file('fields.csv').asText().split('\n').slice(1).forEach(function (line, i)
    {
        var splitted = line.split(',');
        mappings[splitted[0]] = splitted[1];
    });

    zip.file('params.csv').asText().split('\n').slice(1).forEach(function (line, i)
    {
        var splitted = line.split(',');
        mappings[splitted[0]] = splitted[1];
    });

    var obj = {};
    obj[mappingKey] = mappings;
    chrome.storage.local.set(obj);

    chrome.storage.sync.get('versions',
        function(items)
        {
            var savedVersions;
            if (chrome.runtime.lastError != null)
                savedVersions = [];
            else
            {
                if (items['versions'] != undefined)
                    savedVersions = items['versions'];
                else
                    savedVersions = [];
            }

            var i = savedVersions.indexOf(mappingKey);
            if (i > -1)
                savedVersions.splice(i, 1);

            savedVersions.push(mappingKey);
            chrome.storage.sync.set({'versions': savedVersions});
        });

    callback(mappings, null);
}