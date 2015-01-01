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

// The following is mostly copied from http://www.bennadel.com/blog/1520-binding-events-to-non-dom-objects-with-jquery.htm
(
    function( $ )
    {
        var strLocation = window.location.href;
        var strHash = window.location.hash;
        var strPrevLocation = '';
        var strPrevHash = '';
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
                        'change',
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

(
    function( $ )
    {
        toastr.options.closeButton = true;
        toastr.options.showMethod = 'slideDown';
        toastr.options.hideMethod = 'slideUp';
        toastr.options.preventDuplicates = true;

        //var DEBUG = false;

        var savedVersions = [];
        var controlsAdded = false;
        var intervalId = 0;
        var pollCount = 0;
        var pollLimit = 20;

        var versionPattern = /^\d+\.\d+(\.\d+|):(stable_(nodoc_|)\d+|snapshot_(nodoc_|)\d{8})$/;
        var methodPattern = /func_\d+_[A-Za-z]*/;
        var fieldPattern = /field_\d+_[A-Za-z]*/;
        var paramPattern = /p_(i|)\d+_\d+_/;

        var settings = {
            'github.com': {
                getControlsTarget: function ()
                {
                    return $('ul.pagehead-actions');
                },

                insertControlsContainer: function (target, container)
                {
                    target.prepend(container);
                },

                getControlsContainer: function ()
                {
                    return $('<li></li>');
                },

                getCodeElements: function ()
                {
                    return $('td.blob-code');
                }
            },
            'pastebin.com': {
                getControlsTarget: function ()
                {
                    return $('#code_buttons');
                },

                insertControlsContainer: function (target, container)
                {
                    target.append(container)
                },

                getControlsContainer: function ()
                {
                    return $('<span></span>');
                },

                getCodeElements: function ()
                {
                    return $('#selectable>div>ol>li');
                }
            }
        };

        settings = settings[window.location.hostname];

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

            var codeLines = settings.getCodeElements();
            codeLines.each(function (index, line) {
                line.innerHTML = line.innerHTML.replace(/(?:func_\d+_[A-Za-z]+_?|field_\d+_[A-Za-z]+_?|p_(i|)\d+_\d+_?)/g, function (token)
                    {
                        var mcpname = mappings[token];
                        if (mcpname)
                            return '<u title="' + token + '">' + mcpname + '</u>';

                        return '<u title="' + token + '"><i>' + token + '</i></u>';
                    }
                );
            });

            toastr.success('SRG named elements have been remapped :)');

            //chrome.storage.local.getBytesInUse(null, function(bytesInUse){ log('Local Storage Size: ' + bytesInUse); });
        }

        function buttonClicked(event)
        {
            var target = $(event.target);
            if (target.hasClass('selected')) {
                target.removeClass('selected');
                $('input#mcpsrgmapper_mapping_version').prop('disabled', false);

                $('u[title]').each(function (index, node) {
                    $(node).replaceWith($(node).attr('title'));
                });

                toastr.info('The page has been reset to its original state.');
            } else {
                target.addClass('selected');

                $('input#mcpsrgmapper_mapping_version').prop('disabled', true);

                var versionText = $('#mcpsrgmapper_mapping_version').val().replace('nodoc_', '');

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
        }

        function getCachedMappings(mappingKey, callback)
        {
            chrome.storage.local.get(mappingKey, function(items){ callback(items[mappingKey]); });
        }

        function validateVersion(event)
        {
            var disabled = !versionPattern.test($(event.target).val());
            $('#mcpsrgmapper_button').prop('disabled', disabled);
        }

        function updateInputList(list, callback)
        {
            if (!list)
                list = $('#mcpsrgmapper_mapping_versions');

            chrome.storage.sync.get('versions',
                function(items)
                {
                    if (chrome.runtime.lastError)
                    {
                        error(chrome.runtime.lastError.message);
                        savedVersions = [];
                    }
                    else
                    {
                        if (items['versions'])
                            savedVersions = items['versions'];
                        else
                            savedVersions = [];

                        list.html('');

                        savedVersions.reverse().forEach(function (version, i)
                        {
                            $('<option></option>')
                                .val(version)
                                .text(version)
                                .appendTo(list);
                        });

                        if (callback)
                            callback();
                    }
                }
            );
        }

        function addControls()
        {
            var target = settings.getControlsTarget();
            if (target.size() != 1)
            {
                toastr.error('I don\'t know where to insert the controls :(');
                return;
            }

            var container = settings.getControlsContainer();
            container.attr('id', 'mcpsrgmapper_input_controls');

            $('<input/>')
                .attr({
                    'type': 'text',
                    'class': 'input-mini',
                    'id': 'mcpsrgmapper_mapping_version',
                    'list': 'mcpsrgmapper_mapping_versions',
                    'placeholder': '1.8:snapshot_20141208'
                })
                .bind('paste', validateVersion)
                .bind('click', validateVersion)
                .bind('keyup', validateVersion)
                .bind('blur', validateVersion)
                .appendTo(container);

            $('<input/>')
                .attr({
                    'type': 'button',
                    'id': 'mcpsrgmapper_button',
                    'class': 'minibutton'
                })
                .val('Remap')
                .prop('disabled', true)
                .click(buttonClicked)
                .appendTo(container);

            var list = $('<datalist></datalist>')
                .attr('id', 'mcpsrgmapper_mapping_versions')
                .appendTo(container);

            updateInputList(list,
                function()
                {
                    if (list.children().size() > 0) {
                        $('input#mcpsrgmapper_mapping_version').val(list.children().eq(0).val());
                        $('input#mcpsrgmapper_button').prop('disabled', false);
                    }
                }
            );

            settings.insertControlsContainer(target, container);

            controlsAdded = true;
        }

        function removeControls()
        {
            $('#mcpsrgmapper_input_controls').remove();
            controlsAdded = false;
        }

        function init()
        {
            var codeLines = settings.getCodeElements();

            if (codeLines.size() > 0 && !controlsAdded)
            {
                codeLines.each(function (index, line)
                    {
                        var text = $(line).html();
                        if (fieldPattern.test(text) || methodPattern.test(text) || paramPattern.test(text))
                        {
                            addControls();
                            return false;
                        }
                    }
                );
            }
            else
                removeControls();
        }

        function poll()
        {
            var codeLines = settings.getCodeElements();
            pollCount++;

            if ((controlsAdded && codeLines.size() == 0) || (!controlsAdded && codeLines.size() > 0))
            {
                clearInterval(intervalId);
                pollCount = 0;
                init();
            }
            else if (pollCount >= pollLimit)
            {
                clearInterval(intervalId);
                pollCount = 0;
            }
        }

        if (window.location.hostname === 'github.com')
            $( window.location ).bind('change',
                function(objEvent, objData)
                {
                    if (intervalId)
                        clearInterval(intervalId);
                    pollCount = 0;
                    intervalId = setInterval(poll, 500);
                }
            );

        if (settings)
            init();
        else
            toastr.error('No settings for ' + window.location.hostname + ' :(');
    }
)( jQuery );
