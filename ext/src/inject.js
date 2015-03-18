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

            'gist.github.com': {
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
                    return $('.files .file-data .line-data div.line');
                }
            },

            'paste.feed-the-beast.com': {
                getControlsTarget: function ()
                {
                    return $('div.col-lg-12>div.detail.by:eq(0)');
                },

                insertControlsContainer: function (target, container)
                {
                    target.append(container)
                },

                getControlsContainer: function ()
                {
                    return $('<span></span>').css('float', 'right');
                },

                getCodeElements: function ()
                {
                    return $('.CodeMirror ol li div');
                }
            },

            'openeye.openmods.info': {
                getControlsTarget: function ()
                {
                    return $('div.page-header');
                },

                insertControlsContainer: function (target, container)
                {
                    target.append(container);
                },

                getControlsContainer: function ()
                {
                    return $('<div></div>');
                },

                getCodeElements: function ()
                {
                    return $('span.highlight_method');
                }
            },

            'paste.kde.org': {
                getControlsTarget: function ()
                {
                    return $('div.row-fluid>div.span7');
                },

                insertControlsContainer: function (target, container)
                {
                    target.prepend(container)
                },

                getControlsContainer: function ()
                {
                    return $('<span></span>');
                },

                getCodeElements: function ()
                {
                    return $('div.text ol li');
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
            },

            'paste.ee': {
                getControlsTarget: function ()
                {
                    return $('.container>.row>.row>.col-sm-12:has(#download)');
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
                    return $('#paste-content ol li div');
                }
            },

            'pastie.org': {
                getControlsTarget: function ()
                {
                    return $('div.headers>div.metadata');
                },

                insertControlsContainer: function (target, container)
                {
                    target.append(container)
                },

                getControlsContainer: function ()
                {
                    return $('<div></div>');
                },

                getCodeElements: function ()
                {
                    return $('div.allcode pre span');
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
            button = $('input#mcpsrgmapper_button');
            if (mappings['error'])
            {
                toastr.error(mappings['error']);
                button.prop('disabled', false);
                $('select#mcpsrgmapper_mapping_version').prop('disabled', false);
                return;
            }

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

            button.prop('disabled', false).val('Reset');

            toastr.success('SRG named elements have been remapped :)');

            //chrome.storage.local.getBytesInUse(null, function(bytesInUse){ log('Local Storage Size: ' + bytesInUse); });
        }

        function buttonClicked(event)
        {
            var target = $(event.target);
            if (target.hasClass('selected')) {
                target.removeClass('selected').prop('disabled', true).val('Remap');

                $('u[title]').each(function (index, node) {
                    $(node).replaceWith($(node).attr('title'));
                });

                $('select#mcpsrgmapper_mapping_version').prop('disabled', false);
                target.prop('disabled', false);
                toastr.info('The page has been reset to its original state.');
            } else {
                target.addClass('selected');
                target.prop('disabled', true);

                $('select#mcpsrgmapper_mapping_version').prop('disabled', true);

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
                                chrome.runtime.sendMessage({type: 'fetchCsvZip', data: versionText}, remapSrgNames);
                            }
                        }
                    );
                }
                else
                {
                    chrome.runtime.sendMessage({type: 'fetchCsvZip', data: versionText}, remapSrgNames);
                }
            }
        }

        function getCachedMappings(mappingKey, callback)
        {
            chrome.storage.local.get(mappingKey, function(items){ callback(items[mappingKey]); });
        }

        function updateLastSelectedMappings()
        {
            chrome.storage.local.set({'lastselected': $(this).val()});
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

            $("<select/>")
                .attr({
                    'class': 'chosen-select',// form-control input-sm',
                    'id': 'mcpsrgmapper_mapping_version'
                })
                .bind('change', updateLastSelectedMappings)
                .appendTo(container);

            $('<input/>')
                .attr({
                    'type': 'button',
                    'id': 'mcpsrgmapper_button',
                    'class': 'minibutton btn btn-default btn-sm'
                })
                .val('Remap')
                .prop('disabled', true)
                .click(buttonClicked)
                .appendTo(container);

            settings.insertControlsContainer(target, container);

            controlsAdded = true;
        }

        function removeControls()
        {
            $('#mcpsrgmapper_input_controls').remove();
            controlsAdded = false;
        }

        function populateVersions(data)
        {
            $.each(data, function (mc, types)
                {
                    $.each(types, function (type, ids)
                        {
                            $.each(ids, function (index, id)
                                {
                                    var value = mc + ':' + type + '_' + id;
                                    $('<option/>').val(value).text(value).appendTo('select#mcpsrgmapper_mapping_version');
                                }
                            );
                        }
                    );
                }
            );

            var select = $(".chosen-select");
            select.chosen({});
            $('.chosen-container').addClass('align-left');

            chrome.storage.local.get('lastselected', function (items)
                {
                    if (items.lastselected)
                    {
                        select.val(items.lastselected);
                        select.trigger(new CustomEvent('chosen:updated'));
                    }
                }
            );

            $('input#mcpsrgmapper_button').prop('disabled', false);
        }

        function init()
        {
            chrome.storage.local.get('lastupdate', function (items)
            {
                if (!items.lastupdate || items.lastupdate + 1000 * 3600 * 12 < new Date().getTime())
                {
                    chrome.runtime.sendMessage({type: 'fetchVersions', data: null}, populateVersions);
                }
                else
                {
                    chrome.storage.local.get('versionlist', function (items)
                        {
                            populateVersions(items.versionlist);
                        }
                    );
                }
            });

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
