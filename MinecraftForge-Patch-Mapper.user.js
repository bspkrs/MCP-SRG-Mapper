// ==UserScript==
// @name            MinecraftForge Patch Mapper
// @author          bspkrs
// @namespace       https://github.com/bspkrs/MinecraftForge-Patch-Mapper
// @description     Applies MCP mappings to SRG named code snippets on the MinecraftForge github repo.
// @license         MIT
// @version	        1.0
// @include         https://github.com/*/MinecraftForge/*
// @include         https://github.com/*/FML/*
// @released        2014-12-09
// @updated         2014-12-09
// @compatible      Greasemonkey
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_log
// @require         https://raw.githubusercontent.com/Stuk/jszip/master/dist/jszip.min.js
// ==/UserScript==

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

// <input type="text" name="product" list="productName"/>
// <datalist id="productName">
//     <option value="Pen">Pen</option>
//     <option value="Pencil">Pencil</option>
//     <option value="Paper">Paper</option>
// </datalist>

var methodPattern = /func_\d+_[A-Za-z]*/
var fieldPattern = /field_\d+_[A-Za-z]*/
var paramPattern = /p_[i|]\d+_d+_/
var codeLines = document.evaluate("//td[contains(concat(' ', normalize-space(@class), ' '), ' blob-code ')]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

// TODO: create a function to retrieve the specified mapping zip file or load it from persisted storage
function buttonClicked()
{
    alert('dis button will do shit')
}

// TODO: create a function to actually do the remapping

function addControls()
{
    console.log('in addControls()');
    var input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('name', 'mapping_version');
    input.setAttribute('list', 'mapping_versions');
    input.setAttribute('placeholder', '1.8:snapshot_nodoc_20141208');

    var button = document.createElement('input');
    button.setAttribute('type', 'button');
    button.setAttribute('value', 'Remap');
    button.addEventListener('click', buttonClicked, true);

    var list = document.createElement('datalist');
    list.setAttribute('id', 'mapping_versions');

    var container = document.createElement('li');
    container.appendChild(input);
    container.appendChild(button);
    container.appendChild(list);

    console.log('before xpath eval');
    var target = document.evaluate("//ul[@class='pagehead-actions']", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    if (target.snapshotLength != 1)
    {
        console.log('unable to find ul.');
        return;
    }
    console.log('adding controls');
    var parent = target.snapshotItem(0);
    parent.appendChild(container);
}

function init()
{
    if (codeLines.snapshotLength > 0)
    {
        console.log('found code lines.');
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
