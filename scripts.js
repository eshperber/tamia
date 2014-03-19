/*
 * Copyright 2012 Andrey “A.I.” Sitnik <andrey@sitnik.ru>,
 * sponsored by Evil Martians.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

;(function($) {
    "use strict";

    // Common methods and properties for jQuery Transition Events plugin.
    // Mostly for internal usage, but maybe helpful for some hack stuff:
    //
    //   if ( $.Transitions.isSupported() ) {
    //       // CSS Transitions is supported
    //   }
    $.Transitions = {

        // Hash of property name to event name with vendor prefixes.
        // It is used to detect prefix.
        _names: {
            // Webkit must be on bottom, because Opera try to use webkit
            // prefix.
            'transition':       'transitionend',
            'OTransition':      'oTransitionEnd',
            'WebkitTransition': 'webkitTransitionEnd',
            'MozTransition':    'transitionend'
        },

        // Return array of milliseconds for CSS value of `transition-duration`.
        // It’s used in `$.fn.afterTransition`.
        _parseTimes: function (string) {
            var value, array = string.split(/,\s*/);
            for (var i = 0; i < array.length; i++) {
                value = array[i];
                array[i] = parseFloat(value);
                if ( value.match(/\ds/) ) {
                    array[i] = array[i] * 1000;
                }
            }
            return array;
        },

        // Autodetect vendor prefix and return `transitionend` event name.
        //
        // If browser didn’t support CSS Transitions it will return `false`.
        getEvent: function () {
            var finded = false;
            for ( var prop in this._names ) {
                if ( typeof(document.body.style[prop]) != 'undefined' ) {
                    finded = this._names[prop];
                    break;
                }
            }

            this.getEvent = function () {
                return finded;
            };

            return finded;
        },

        // Alias to vendor prefixed `requestAnimationFrame`. Will be replace
        // by native function after first call.
        animFrame: function (callback) {
            var raf = window.requestAnimationFrame       ||
                      window.webkitRequestAnimationFrame ||
                      window.mozRequestAnimationFrame    ||
                      window.msRequestAnimationFrame;
            if ( raf ) {
                this.animFrame = function (callback) {
                    return raf.call(window, callback);
                };
            } else {
                this.animFrame = function (callback) {
                    return setTimeout(callback, 10);
                };
            }
            return this.animFrame(callback);
        },

        // Return `true` if browser support CSS Transitions.
        isSupported: function () {
            return this.getEvent() !== false;
        }

    }

    // jQuery node methods.
    $.extend($.fn, {

        // Call `callback` after CSS Transition finish
        // `delay + (durationPart * duration)`. It will call `callback` only
        // once, in difference from `transitionEnd`.
        //
        //   $('.show-video').click(function () {
        //       $('.slider').addClass('video-position').afterTransition(
        //           function () { autoPlayVideo(); });
        //   });
        //
        // You can set `durationPart` to call `callback` in the middle of
        // transition:
        //
        //   $('.fliper').addClass('rotate').afterTransition(0.5, function () {
        //       $(this).find('.backface').show();
        //   });
        //
        // Callback will get object with `propertyName` and `elapsedTime`
        // properties. If transition is set to difference properties, it will
        // be called on every property.
        //
        // This method doesn’t check, that transition is really finished (it can
        // be canceled in the middle).
        afterTransition: function (durationPart, callback) {
            if ( typeof(callback) == 'undefined' ) {
                callback     = durationPart;
                durationPart = 1;
            }

            if ( !$.Transitions.isSupported() ) {
                for (var i = 0; i < this.length; i++) {
                    callback.call(this[i], {
                        type:          'aftertransition',
                        elapsedTime:   0,
                        propertyName:  '',
                        currentTarget: this[i]
                    });
                }
                return this;
            }

            for (var i = 0; i < this.length; i++) {
                var el = $(this[i]);
                var props     = el.css('transition-property').split(/,\s*/);
                var durations = el.css('transition-duration');
                var delays    = el.css('transition-delay');

                durations = $.Transitions._parseTimes(durations);
                delays    = $.Transitions._parseTimes(delays);

                var prop, duration, delay, after, elapsed;
                for (var j = 0; j < props.length; j++) {
                    prop     = props[j];
                    duration = durations[ durations.length == 1 ? 0 : j ];
                    delay    = delays[ delays.length == 1 ? 0 : j ];
                    after    = delay + (duration * durationPart);
                    elapsed  = duration * durationPart / 1000;

                    (function (el, prop, after, elapsed) {
                      setTimeout(function () {
                          $.Transitions.animFrame(function () {
                            callback.call(el[0], {
                                type:          'aftertransition',
                                elapsedTime:   elapsed,
                                propertyName:  prop,
                                currentTarget: el[0]
                            });
                          });
                      }, after);
                    })(el, prop, after, elapsed);
                }
            }
            return this;
        },

        // Set `callback` to listen every CSS Transition finish.
        // It will call `callback` on every finished transition,
        // in difference from `afterTransition`.
        //
        // It just bind to `transitionend` event, but detect vendor prefix.
        //
        // Callback will get event object with `propertyName` and `elapsedTime`
        // properties. If transition is set to difference properties, it will
        // be called on every property.
        //
        // Note, that `callback` will get original event object, not from
        // jQuery.
        //
        //   var slider = $('.slider').transitionEnd(function () {
        //       if ( slider.hasClass('video-position') ) {
        //           autoPlayVideo();
        //       }
        //   });
        //
        //  $('.show-video').click(function () {
        //      slider.addClass('video-position');
        //  });
        //
        // If transition will be canceled before finish, event won’t be fired.
        transitionEnd: function (callback) {
            for (var i = 0; i < this.length; i++) {
              this[i].addEventListener($.Transitions.getEvent(), function (e) {
                  callback.call(this, e);
              });
            }
            return this;
        }

    });

}).call(this, jQuery);

// Tâmia © 2013 Artem Sapegin http://sapegin.me
// https://github.com/sapegin/tamia
// JS core
// jQuery and Modernizr aren’t required but very useful

/*jshint newcap:false*/
/*global DEBUG:true, Modernizr:false, console:false*/

/**
 * Debug mode.
 *
 * You can use DEBUG global variable in your scripts to hide some code from minified production version of JavaScript.
 *
 * To make it work add to your Gruntfile:
 *
 *   uglify: {
 *     options: {
 *       compress: {
 *         global_defs: {
 *           DEBUG: !!grunt.option('debug')
 *         }
 *       }
 *     },
 *     ...
 *   }
 *
 * Then if you run `grunt --debug` DEBUG variable will be true and false if you run just `grunt`.
 */
if (typeof window.DEBUG === 'undefined') window.DEBUG = true;

;(function(window, jQuery, Modernizr, undefined) {
	'use strict';

	// IE8+
	if (!document.querySelectorAll) return;

	// Namespace
	var tamia = window.tamia = {};


	if (DEBUG) {
		// Debug logger
		var addBadge = function(args, name) {
			// Color console badge
			// Based on https://github.com/jbail/lumberjack
			var ua = navigator.userAgent.toLowerCase();
			if (ua.indexOf('chrome') !== -1 || ua.indexOf('firefox') !== -1) {
				var format = '%c %s %c ' + args.shift();
				args.unshift(format, 'background:#aa759f; color:#fff', name, 'background:inherit; color:inherit');
			}
			else {
				args[0] = name + ': ' + args[0];
			}
			return args;
		};
		var logger = function() {
			var args = Array.prototype.slice.call(arguments);
			var func = args.shift();
			console[func].apply(console, addBadge(args, 'Tâmia'));
		};
		var log = tamia.log = logger.bind(null, 'log');
		var warn = tamia.warn = logger.bind(null, 'warn');

		// Check optional dependencies
		if (!jQuery) warn('jQuery not found.');
		if (!jQuery.Transitions) warn('jQuery Transition Events plugin (tamia/vendor/transition-events.js) not found.');
		if (!Modernizr) warn('Modernizr not found.');

		// Check required Modernizr features
		$.each([
			'csstransitions',
			'cssgradients',
			'flexbox',
			'touch',
		], function(idx, feature) {
			if (!(feature in Modernizr)) warn('Modernizr should be built with "' + feature + '" feautre.');
		});
	}


	var _containersCache;
	var _components = {};
	var _initializedAttribute = '_tamia-yep';

	function _getContainers(parent) {
		return (parent || document).querySelectorAll('[data-component]');
	}


	/**
	 * Initialize components.
	 *
	 * @param {Object} components Initializers for each component.
	 *
	 * Examples:
	 *
	 *   <div data-component="pony"></div>
	 *
	 *   tamia.initComponents({
	 *     // New style component
	 *     pony: Pony,  // class Pony extends Component {...}
	 *     // Plain initializer
	 *     pony: function(elem) {
	 *       // $(elem) === <div data-component="pony">
	 *     },
	 *     // Initialize jQuery plugins (plain initializer)
	 *     jquerypony: function(elem) {
	 *       $(elem).pluginmethod({option1: 'val1', options2: 'val2'});
	 *       $(elem).pluginmethod2();
	 *     },
	 *     // Initialize jQuery plugins (shortcut)
	 *     jquerypony: {
	 *       pluginmethod: {option1: 'val1', options2: 'val2'},
	 *       pluginmethod2: ['attr1', 'attr2', 'attr3'],
	 *       pluginmethod3: null
	 *     }
	 *   }
	 *
	 * Caveats:
	 *
	 *   1. To initialize components inside container that was hidden or inside dynamically created container use
	 *   init.tamia event: `$('.js-container').trigger('init.tamia');`
	 *   2. No components will be initialized twice. It’s safe to trigger init.tamia event multiple times: only new nodes
	 *   or nodes that was hidden before will be affected.
	 */
	tamia.initComponents = function(components, parent) {
		var containers;
		if (parent === undefined) {
			containers = _containersCache || (_containersCache = _getContainers());
		}
		else {
			// Init all components inside DOM node
			containers = _getContainers(parent);
			components = _components;
		}

		// Init components
		for (var containerIdx = 0, containerCnt = containers.length; containerIdx < containerCnt; containerIdx++) {
			var container = containers[containerIdx];
			var componentName = container.getAttribute('data-component');
			var component = components[componentName];
			if (!component || container.hasAttribute(_initializedAttribute)) continue;

			var initialized = true;
			if ('__tamia_cmpnt__' in component) {
				// New style component
				initialized = (new component(container)).initializable;
			}
			else if (typeof component === 'function') {
				// Old style component
				initialized = component(container);
			}
			else if (jQuery) {
				// jQuery plugins shortcut
				for (var method in component) {
					var params = component[method];
					var elem = jQuery(container);
					if (DEBUG && !jQuery.isFunction(elem[method])) warn('jQuery method "%s" not found (used in "%s" component).', method, componentName);
					if (jQuery.isArray(params)) {
						elem[method].apply(elem, params);
					}
					else {
						elem[method](params);
					}
				}
			}

			if (initialized !== false) {
				container.setAttribute(_initializedAttribute, 'yes');
			}
		}

		// Add new components to all components array
		for (var name in components) {
			_components[name] = components[name];
		}
	};

	if (jQuery) {

		var _doc = jQuery(document);
		var _hiddenClass = 'is-hidden';
		var _transitionClass = 'is-transit';
		var _appearedEvent = 'appeared.tamia';
		var _disappearedEvent = 'disappeared.tamia';
		var _fallbackTimeout = 1000;

		/**
		 * Registers Tâmia events (eventname.tamia) on document.
		 *
		 * Example:
		 *
		 *   // Registers enable.tamia event.
		 *   tamia.registerEvents({
		 *      enable: function(elem) {
		 *      }
		 *   });
		 *
		 * @param {Object} handlers Handlers list.
		 */
		tamia.registerEvents = function(handlers) {
			var events = $.map(handlers, _tamiaze).join(' ');
			_doc.on(events, function(event) {
				var eventName = [event.type, event.namespace].join('.').replace(/.tamia$/, '');
				if (DEBUG) log('Event "%s":', eventName, event.target);
				handlers[eventName](event.target);
			});
		};

		var _tamiaze = function (handler, name) {
			return name + '.tamia';
		};


		/**
		 * Events
		 */
		var _handlers = {};

		/**
		 * Init components inside any jQuery node.
		 *
		 * Examples:
		 *
		 *   $(document).trigger('init.tamia');
		 *   $('.js-container').trigger('init.tamia');
		 */
		_handlers.init = function(elem) {
			tamia.initComponents(undefined, elem);
		};

		/**
		 * Show element with CSS transition.
		 *
		 * appeared.tamia event will be fired the moment transition ends.
		 *
		 * Example:
		 *
		 *   .dialog
		 *     transition: opacity .5s ease-in-out
		 *     ...
		 *     &.is-hidden
		 *       opacity: 0
		 *
		 *   <div class="dialog is-hidden js-dialog">...</div>
		 *
		 *   $('.js-dialog').trigger('appear.tamia');
		 */
		_handlers.appear = function(elem) {
			elem = $(elem);
			if (Modernizr && Modernizr.csstransitions) {
				if (elem.hasClass(_transitionClass) && !elem.hasClass(_hiddenClass)) return;
				elem.addClass(_transitionClass);
				setTimeout(function() {
					elem.removeClass(_hiddenClass);
					elem.afterTransition(function() {
						elem.removeClass(_transitionClass);
						elem.trigger(_appearedEvent);
					});
				}, 0);
			}
			else {
				elem.removeClass(_hiddenClass);
				elem.trigger(_appearedEvent);
			}
		};

		/**
		 * Hide element with CSS transition.
		 *
		 * disappeared.tamia event will be fired the moment transition ends.
		 *
		 * Opposite of `appear.tamia` event.
		 */
		_handlers.disappear = function(elem) {
			elem = $(elem);
			if (Modernizr && Modernizr.csstransitions) {
				if (elem.hasClass(_transitionClass) && elem.hasClass(_hiddenClass)) return;
				elem.addClass(_transitionClass);
				elem.addClass(_hiddenClass);
				elem.afterTransition(function() {
					elem.removeClass(_transitionClass);
					elem.trigger(_disappearedEvent);
				});
			}
			else {
				elem.addClass(_hiddenClass);
				elem.trigger(_disappearedEvent);
			}
		};

		/**
		 * Toggles element’s visibility with CSS transition.
		 *
		 * See `appear.tamia` event for details.
		 */
		_handlers.toggle = function(elem) {
			elem = $(elem);
			if (elem.hasClass(_hiddenClass)) {
				_handlers.appear(elem);
			}
			else {
				_handlers.disappear(elem);
			}
		};

		tamia.registerEvents(_handlers);


		/**
		 * Controls.
		 *
		 * Fires jQuery event to specified element on click at this element.
		 *
		 * @param data-fire Event name.
		 * @param [data-target] Target element selector.
		 * @param [data-closest] Target element selector: search only through element ancestors.
		 * @param [data-attrs] Comma separated attributes list.
		 *
		 * Either of data-target or data-closest is required.
		 *
		 * Example:
		 *
		 *   <span data-fire="slider-next" data-target=".portfolio" data-attrs="1,2,3">Next</span>
		 *   <!-- $('.portfolio').trigger('slider-next', [1, 2, 3]); -->
		 */
		 _doc.on('click', '[data-fire]', function(event) {
			var elem = jQuery(event.currentTarget);

			var data = elem.data();
			if (DEBUG) if (!data.target && !data.closest) return log('You should define either data-target or data-closest on', elem[0]);

			var target = data.target && jQuery(data.target) || elem.closest(data.closest);
			if (DEBUG) if (!target.length) return log('Target element %s not found for', data.target || data.closest, elem[0]);

			var attrs = data.attrs;
			if (DEBUG) log('Fire "%s" with attrs [%s] on', data.fire, attrs || '', target);
			target.trigger(data.fire, attrs ? attrs.split(/[;, ]/) : undefined);

			event.preventDefault();
		});

		/**
		 * Templates
		 */

		/**
		 * Simplest template.
		 *
		 * Just replaces {something} with data.something.
		 *
		 * @param {String} tmpl Template.
		 * @param {String} data Template context.
		 * @return {String} HTML.
		 */
		tamia.stmpl = function(tmpl, data) {
			return tmpl.replace(/\{([^\}]+)\}/g, function(m, key) {
				return data[key] || '';
			});
		}

		var _templates = window.__templates;
		if (_templates) {
			/**
			 * Invokes precompiled template.
			 *
			 * Templates should be stored in window.__templates.
			 *
			 * @param {String} tmplId Template ID.
			 * @param {String} data Template context.
			 * @return {String} HTML.
			 */
			tamia.tmpl = function(tmplId, data) {
				var tmpl = _templates[tmplId];
				if (DEBUG) if (!tmpl) warn('Template %s not found.', tmplId);
				return tmpl(data);
			};

			/**
			 * Replaces jQuery node’s content with the result of template invocation.
			 *
			 * @param {String} tmplId Template ID.
			 * @param {String} data Template context.
			 * @return {jQuery}
			 */
			jQuery.fn.tmpl = function(tmplId, data) {
				var html = tamia.tmpl(tmplId, data);
				return jQuery(this).html(html);
			};
		}


		/**
		 * Google Analytics tracking.
		 *
		 * @param data-ga Event name ('link' if empty).
		 * @param [data-action] Event action ('click' by default).
		 *
		 * Examples:
		 *
		 *   <a href="http://github.com/" data-ga>GitHub</span>
		 *   <span class="js-slider-next" data-ga="slider" data-action="next">Next</span>
		 */
		if ('ga' in window) _doc.on('click', '[data-ga]', function(event) {
			var elem = jQuery(event.currentTarget);
			var eventName = elem.data('ga') || 'link';
			var eventAction = elem.data('ga-action') || 'click';
			var url = elem.attr('href');
			var link = url && !event.metaKey && !event.ctrlKey;
			if (link) event.preventDefault();
			ga('send', 'event', eventName, eventAction, url, {hitCallback: function() {
				if (link) document.location = url;
			}});
		});


		/**
		 * Grid debugger.
		 *
		 * Hotkeys:
		 *
		 *   g - Toggle grid.
		 *   o - Toggle layout outlines.
		 */
		if (DEBUG) {
			var layoutClassesAdded = false;
			var gridDebugger;

			var toggleGrid = function() {
				addLayoutClasses();
				addGrid();
				gridDebugger.trigger('toggle.tamia');
			};

			var toggleOutline = function() {
				addLayoutClasses();
				jQuery('body').toggleClass('tamia__show-layout-outlines');
			};

			var addLayoutClasses = function() {
				if (layoutClassesAdded) return;
				jQuery('*').each(function() {
					var elem = $(this);
					var content = elem.css('content');
					if (/^tamia__/.test(content)) {
						elem.addClass(content);
					}
				});
				layoutClassesAdded = true;
			}

			var addGrid = function() {
				var firstRow = jQuery('.tamia__grid-row,.tamia__layout-row').first();
				if (!firstRow.length) return;

				if (!gridDebugger) {
					var columns = 12;  // @todo Use real number of columns
					var height = document.documentElement.scrollHeight;
					var shift = -firstRow.offset().top;
					gridDebugger = $('<div>', {'class': 'tamia__grid-debugger is-hidden'});
					gridDebugger.html(new Array((columns) + 1).join('<b class="tamia__grid-debugger-col"></b>'));
					firstRow.prepend(gridDebugger);
				}

				gridDebugger.css({
					'margin-top': shift,
					'height': height
				});
			}

			_doc.on('keydown', function(event) {
				var activeTag = document.activeElement.tagName;
				if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

				var keycode = event.which;
				var func = {
					71: toggleGrid,  // G
					79: toggleOutline  // O
				}[keycode];
				if (!func) return;

				func();
				event.preventDefault();
			});

		}

	}

}(window, window.jQuery, window.Modernizr));

(function() {
  'use strict';
  var $, Component,
    __slice = [].slice;

  $ = jQuery;

  /*
  JS component base class.
  
  Elements: any HTML element with class name that follow a pattern `.js-name` where `name` is an element name.
  
  States: any class on component root HTML node that follow a pattern `.is-state` where `state` is a state name.
  After initialization all components will have `ok` state.
  
  Example:
  
    class Pony extends Component
      init: ->
        @on('click', 'toggle', @toggle)
      toggle: ->
        @toggleState('pink')
  
    tamia.initComponents(pony: Pony)
  
    <div class="pink-pony is-pink" data-component="pony">
      <button class="pink-pony__button js-toggle">To pink or not to pink?</div>
    </div>
  */


  Component = (function() {
    function Component(elem) {
      if (!elem || elem.nodeType !== 1) {
        throw new ReferenceError('No DOM node passed to Component constructor.');
      }
      this.elemNode = elem;
      this.elem = $(elem);
      this.initializable = this.isInitializable();
      if (!this.initializable) {
        return;
      }
      this._fillStates();
      if (this.isSupported()) {
        this.handlers = {};
        this.init();
        this.addState('ok');
      } else {
        this.fallback();
        this.addState('unsupported');
      }
    }

    /*
    	Put all your initialization code in this method.
    */


    Component.prototype.init = function() {};

    /*
    	You can implement this method to do destroy component.
    */


    Component.prototype.destroy = function() {};

    /*
    	Implement this method if you want to check whether browser is good for your component or not.
    
    	@returns {Boolean}
    */


    Component.prototype.isSupported = function() {
      return true;
    };

    /*
    	Implement this method if you want to check whether component could be initialized.
    
    	Example:
    
    	  isInitializable: ->
    	    # Do not initialize component if it's not visible
    	    @isVisible()
    
    	@return {Boolean}
    */


    Component.prototype.isInitializable = function() {
      return true;
    };

    /*
    	You can implement this method to do some fallbacks. It will be called if isSupported() returns false.
    */


    Component.prototype.fallback = function() {};

    /*
    	Finds element.
    
    	@param {String} name Element ID.
    
    	@return {jQuery} Element with .js-name class.
    */


    Component.prototype.find = function(name) {
      return this.elem.find(".js-" + name).first();
    };

    /*
    	Attaches event handler.
    
    	@param {String} events Event names (space separated).
    	@param {String} [element] Element id.
    	@param {Function} handler Handler function (scope will automatically sets to this).
    */


    Component.prototype.on = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this._toggleEvent.apply(this, ['on'].concat(__slice.call(args)));
    };

    /*
    	Detaches event handler.
    
    	@param {String} events Event names (space separated).
    	@param {String} [element] Element id.
    	@param {Function} handler Handler function (scope will automatically sets to this).
    */


    Component.prototype.off = function() {
      var args;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this._toggleEvent.apply(this, ['off'].concat(__slice.call(args)));
    };

    /*
    	Returns component state.
    
    	@param {String} [name] State name.
    
    	@return {Boolean} Sate value.
    */


    Component.prototype.hasState = function(name) {
      return !!this.states[name];
    };

    /*
    	Sets state to true.
    
    	@param {String} [name] State name.
    */


    Component.prototype.addState = function(name) {
      return this.toggleState(name, true);
    };

    /*
    	Sets state to false.
    
    	@param {String} [name] State name.
    */


    Component.prototype.removeState = function(name) {
      return this.toggleState(name, false);
    };

    /*
    	Toggles state value.
    
    	@param {String} [name] State name.
    	@param {Boolean} [value] State value.
    */


    Component.prototype.toggleState = function(name, value) {
      if (value == null) {
        value = !this.states[name];
      }
      this.states[name] = value;
      return this._updateStates();
    };

    /*
    	Returns component visibility.
    
    	@return {Boolean}
    */


    Component.prototype.isVisible = function() {
      return !!(this.elemNode.offsetWidth || this.elemNode.offsetHeight);
    };

    Component.prototype._toggleEvent = function() {
      var action, args, func, funcArg, handler, _ref;
      action = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (typeof args[1] === 'string') {
        args[1] = ".js-" + args[1];
      }
      funcArg = args.length - 1;
      func = args[funcArg];
      handler;
      if (this.handlers[func]) {
        handler = this.handlers[func];
      }
      if (action === 'on') {
        if (handler) {
          handler.counter++;
        } else {
          this.handlers[func] = handler = {
            counter: 1,
            func: func.bind(this)
          };
        }
      }
      if (!handler) {
        return;
      }
      args[funcArg] = handler.func;
      (_ref = this.elem)[action].apply(_ref, args);
      if (action === 'off') {
        handler.counter--;
        if (handler.counter <= 0) {
          return this.handlers[func] = null;
        }
      }
    };

    Component.prototype._fillStates = function() {
      var classes, cls, clsName, re, states;
      states = {};
      classes = this.elemNode.className.split(' ');
      for (clsName in classes) {
        cls = classes[clsName];
        re = /^is-/;
        if (re.test(cls)) {
          states[cls.replace(re, '')] = true;
        }
      }
      return this.states = states;
    };

    Component.prototype._updateStates = function() {
      var classes, name;
      classes = this.elemNode.className;
      classes = $.trim(classes.replace(/\bis-[-\w]+/g, ''));
      classes = classes.split(/\s+/);
      for (name in this.states) {
        if (this.states[name]) {
          classes.push("is-" + name);
        }
      }
      return this.elemNode.className = classes.join(' ');
    };

    return Component;

  })();

  Component.__tamia_cmpnt__ = true;

  window.Component = Component;

}).call(this);

(function() {
  'use strict';
  var $, Flippable, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  $ = jQuery;

  Flippable = (function(_super) {
    __extends(Flippable, _super);

    function Flippable() {
      _ref = Flippable.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Flippable.prototype.init = function() {
      if (this.elem.hasClass('js-flip')) {
        return this.on('click', this.toggle);
      } else {
        return this.on('click', 'flip', this.toggle);
      }
    };

    Flippable.prototype.toggle = function() {
      this.toggleState('flipped');
      return this.elem.trigger('flipped.tamia', this.hasState('flipped'));
    };

    return Flippable;

  })(Component);

  tamia.initComponents({
    flippable: Flippable
  });

}).call(this);

(function() {
  'use strict';
  var $, _disabledClass, _enableDisable, _formElementsSelector;

  $ = jQuery;

  _formElementsSelector = '.field,.button,.disablable';

  _disabledClass = 'is-disabled';

  _enableDisable = function(elem, enable) {
    var formElements;
    formElements = ($(elem)).find(_formElementsSelector).addBack(_formElementsSelector);
    formElements[enable ? 'removeClass' : 'addClass'](_disabledClass);
    return formElements.attr('disabled', !enable);
  };

  tamia.registerEvents({
    /*
    	Enables all descendant form elements.
    */

    enable: function(elem) {
      return _enableDisable(elem, true);
    },
    /*
    	Disables all descendant form elements.
    */

    disable: function(elem) {
      return _enableDisable(elem, false);
    }
  });

}).call(this);

(function() {
  'use strict';
  var $, Modal, _body, _bodyClass, _doc, _ref, _wrapperTmpl,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  $ = jQuery;

  _body = $('body');

  _doc = $(document);

  _bodyClass = 'modal-opened';

  _wrapperTmpl = '<div class="modal-shade is-hidden">\n	<div class="l-center">\n		<div class="l-center-i js-modal"></div>\n	</div>\n</div>';

  Modal = (function(_super) {
    __extends(Modal, _super);

    function Modal() {
      _ref = Modal.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Modal.prototype.init = function() {
      this.elem.data('modal', this);
      this.on('click', 'modal-commit', this.commit);
      this.on('click', 'modal-dismiss', this.dismiss);
      this.keyup_ = this.keyup.bind(this);
      if (this.elem.data('modal-open')) {
        return this.open();
      }
    };

    Modal.prototype.initHtml = function() {
      if (this.wrapper) {
        return;
      }
      this.wrapper = $(_wrapperTmpl);
      this.wrapper.find('.js-modal').append(this.elem);
      this.wrapper.on('click', this.shadeClick.bind(this));
      _body.append(this.wrapper);
      return this.removeState('hidden');
    };

    Modal.prototype.open = function() {
      this.initHtml();
      _body.addClass(_bodyClass);
      this.wrapper.trigger('appear.tamia');
      return _doc.on('keyup', this.keyup_);
    };

    Modal.prototype.close = function() {
      this.wrapper.trigger('disappear.tamia');
      _body.removeClass(_bodyClass);
      return _doc.off('keyup', this.keyup_);
    };

    Modal.prototype.commit = function(event) {
      return this.done(event, 'commit');
    };

    Modal.prototype.dismiss = function(event) {
      return this.done(event, 'dismiss');
    };

    Modal.prototype.done = function(event, type) {
      var typeEvent;
      if (event != null) {
        event.preventDefault();
      }
      typeEvent = $.Event(type + '.modal.tamia');
      this.elem.trigger(typeEvent);
      if (typeEvent.isDefaultPrevented()) {
        return;
      }
      return this.close();
    };

    Modal.prototype.keyup = function(event) {
      if (event.which === 27) {
        return this.dismiss(event);
      }
    };

    Modal.prototype.shadeClick = function(event) {
      if ($(event.target).hasClass('js-modal')) {
        return this.dismiss(event);
      }
    };

    return Modal;

  })(Component);

  tamia.registerEvents({
    'open.modal': function(elem) {
      var container, modal;
      container = $(elem);
      modal = container.data('modal');
      if (!modal) {
        modal = new Modal(elem);
      }
      return modal.open();
    }
  });

}).call(this);

(function() {
  'use strict';
  var $, Password, supported, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  $ = jQuery;

  supported = void 0;

  Password = (function(_super) {
    __extends(Password, _super);

    function Password() {
      _ref = Password.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Password.prototype.init = function() {
      this.types = {
        locked: 'password',
        unlocked: 'text'
      };
      this.fieldElem = this.find('field');
      this.toggleElem = this.find('toggle');
      return this.on('mousedown', 'toggle', this.toggle);
    };

    Password.prototype.isSupported = function() {
      if (supported !== void 0) {
        return supported;
      }
      supported = $('<!--[if lte IE 8]><i></i><![endif]-->').find('i').length !== 1;
      return supported;
    };

    Password.prototype.toggle = function() {
      var fieldType, focused, locked,
        _this = this;
      focused = document.activeElement === this.fieldElem[0];
      locked = this.hasState('unlocked');
      fieldType = this.fieldElem.attr('type');
      this.toggleState('unlocked');
      if (fieldType === this.types.locked && !locked) {
        this.fieldElem.attr('type', this.types.unlocked);
      } else if (fieldType === this.types.unlocked && locked) {
        this.fieldElem.attr('type', this.types.locked);
      }
      if (focused) {
        return setTimeout((function() {
          return _this.fieldElem.focus();
        }), 0);
      }
    };

    return Password;

  })(Component);

  tamia.initComponents({
    password: Password
  });

}).call(this);

(function() {
  'use strict';
  var $, Select, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  $ = jQuery;

  Select = (function(_super) {
    __extends(Select, _super);

    function Select() {
      _ref = Select.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Select.prototype.init = function() {
      this.selectElem = this.find('select');
      this.boxElem = this.find('box');
      this.on('focus', 'select', this.focus);
      this.on('blur', 'select', this.blur);
      this.on('change', 'select', this.change);
      return this.change();
    };

    Select.prototype.focus = function() {
      return this.addState('focused');
    };

    Select.prototype.blur = function() {
      return this.removeState('focused');
    };

    Select.prototype.change = function() {
      return this.boxElem.text(this.selectElem.find(':selected').text());
    };

    return Select;

  })(Component);

  tamia.initComponents({
    select: Select
  });

}).call(this);

(function() {
  'use strict';
  var $, Loader, _loaderTmpl, _ref, _shadeSelector, _wrapperClass,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  $ = jQuery;

  _wrapperClass = 'loader-wrapper';

  _shadeSelector = '.loader-shade';

  _loaderTmpl = '<div class="loader-shade">\n	<div class="l-center">\n		<div class="l-center-i">\n			<div class="spinner spinner_big"></div>\n		</div>\n	</div>\n</div>';

  Loader = (function(_super) {
    __extends(Loader, _super);

    function Loader() {
      _ref = Loader.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    Loader.prototype.init = function() {
      var _this = this;
      this.initHtml();
      return setTimeout((function() {
        return _this.addState('loading');
      }), 0);
    };

    Loader.prototype.destroy = function() {
      var _this = this;
      this.removeState('loading');
      return this.elem.find(_shadeSelector).afterTransition(function() {
        _this.elem.removeClass(_wrapperClass);
        return _this.loader.remove();
      });
    };

    Loader.prototype.initHtml = function() {
      this.elem.addClass(_wrapperClass);
      this.loader = $(_loaderTmpl);
      return this.elem.append(this.loader);
    };

    return Loader;

  })(Component);

  tamia.registerEvents({
    'loading-start': function(elem) {
      var container;
      container = $(elem);
      if (container.data('loader')) {
        return;
      }
      return container.data('loader', new Loader(elem));
    },
    'loading-stop': function(elem) {
      var container, loader;
      container = $(elem);
      loader = container.data('loader');
      if (!loader) {
        return;
      }
      loader.destroy();
      return container.removeData('loader');
    }
  });

}).call(this);

/* 
 * Fixie.js
 * by Ryhan Hassan
 * ryhanh@me.com
 *
 * Automagically adds filler content
 * whenever an element has class="fixie".
 * Hope you find it useful :)
 */ 
var fixie = (
function () {

    var selector;
    var imagePlaceHolder = "http://placehold.it/${w}x${h}&text=${text}";

    if (typeof document.getElementsByClassName != 'function') {
        document.getElementsByClassName = function (cl) {
            var retnode = [];
            var myclass = new RegExp('\\b' + cl + '\\b');
            var elem = this.getElementsByTagName('*');
            for (var i = 0; i < elem.length; i++) {
                var classes = elem[i].className;
                if (myclass.test(classes)) retnode.push(elem[i]);
            }
            return retnode;
        };
    }

    /* 
     * Spec
     * Here are some functions you might find useful
     * 
     * fixie_handler(element)
     * fixie_handle_elements(elements)
     *
     * fixie_fetchWord();
     * fixie_fetchPhrase();
     * fixie_fetchSentence();
     * fixie_fetchParagraph();
     * fixie_fetchParagraphs();
     *
     */


    /* 
     * fixie_handler(element)
     *
     * Takes in an element and adds filler content.
     * Returns false if tag is unrecognized.
     */
    function fixie_handler(element) {
        if (!/^\s*$/.test(element.innerHTML)){
            var childs = element.children;
            if(childs.length){
                for(var fixie_i = 0; fixie_i < childs.length; fixie_i++){
                    fixie_handler(childs[fixie_i]);
                }
            }
            return;
        }
        switch (element.nodeName.toLowerCase()) {
        case 'b':
        case 'em':
        case 'strong':
        case 'button':
        case 'th':
        case 'td':
        case 'title':
        case 'tr':
            element.innerHTML = fixie_fetchWord();
            break;

        case 'header':
        case 'cite':
        case 'caption':
        case 'mark':
        case 'q':
        case 's':
        case 'u':
        case 'small':
        case 'span':
        case 'code':
        case 'pre':
        case 'li':
        case 'dt':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
            element.innerHTML = fixie_fetchPhrase();
            break;

        case 'footer':
        case 'aside':
        case 'summary':
        case 'blockquote':
        case 'p':
            element.innerHTML = fixie_fetchParagraph();
            break;

        case 'article':
        case 'section':
            element.innerHTML = fixie_fetchParagraphs()
            break;

            /* Special cases */
        case 'a':
            element.href = "http://ryhan.me/";
            element.innerHTML = "www." + fixie_fetchWord() + fixie_capitalize(fixie_fetchWord()) + ".com";
            break;

        case 'img':
            var src = element.getAttribute('src') || element.src;
            var temp = element.getAttribute('fixie-temp-img');
            if(src == "" || src == null || temp == true || temp == "true"){
                var width = element.getAttribute('width') || element.width || (element.width = 250);
                var height = element.getAttribute('height') || element.height || (element.height = 100);
                var title = element.getAttribute('title') || '';
                element.src = imagePlaceHolder.replace('${w}', width).replace('${h}', height).replace('${text}', title);
                element.setAttribute('fixie-temp-img', true);
            }
            break;

        case 'ol':
        case 'ul':
            element.innerHTML = fixie_fetchList();
            break;

        case 'dl':
            element.innerHTML = fixie_fetchDefinitionList();
            break;
       
        case 'hr':
            break;

        default:
            element.innerHTML = fixie_fetchSentence();
        }
    }

    // Handle an array of elements
    function fixie_handle_elements(elements){
        for (var i = 0; i < elements.length; i++) {
            fixie_handler(elements[i]);
        }
    }


    // Begin generator
    var fixie_wordlibrary = ["I", "8-bit", "ethical", "reprehenderit", "delectus", "non", "latte", "fixie", "mollit", "authentic", "1982", "moon", "helvetica", "dreamcatcher", "esse", "vinyl", "nulla", "Carles", "bushwick", "bronson", "clothesline", "fin", "frado", "jug", "kale", "organic", "local", "fresh", "tassel", "liberal", "art", "the", "of", "bennie", "chowder", "daisy", "gluten", "hog", "capitalism", "is", "vegan", "ut", "farm-to-table", "etsy", "incididunt", "sunt", "twee", "yr", "before", "gentrify", "whatever", "wes", "Anderson", "chillwave", "dubstep", "sriracha", "voluptate", "pour-over", "esse", "trust-fund", "Pinterest", "Instagram", "DSLR", "vintage", "dumpster", "totally", "selvage", "gluten-free", "brooklyn", "placeat", "delectus", "sint", "magna", "brony", "pony", "party", "beer", "shot", "narwhal", "salvia", "letterpress", "art", "party", "street-art", "seitan", "anime", "wayfarers", "non-ethical", "viral", "iphone", "anim", "polaroid", "gastropub", "city", 'classy', 'original', 'brew']

    function fixie_capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function fixie_fetchWord() {
        return fixie_wordlibrary[constrain(0, fixie_wordlibrary.length - 1 )];
    }

    function constrain(min, max){
         return Math.round(Math.random() * (max - min) + min);
    }

    function fixie_fetch(min, max, func, join) {
        join || (join = ' ');
        var fixie_length = constrain(min, max);
        var result = [];
        for (var fixie_i = 0; fixie_i < fixie_length; fixie_i++) {
            result.push(func());
        }
        return fixie_capitalize(result.join(join));
    }

    function fetch_suroundWithTag(min, max, func, tagName) {
        var startTag = '<' + tagName + '>';
        var endTag = '</' + tagName + '>';
        return startTag + fixie_fetch(min, max, func, endTag + startTag) + endTag;
    }

    function fixie_fetchPhrase() {
        return fixie_fetch(3, 5, fixie_fetchWord);
    }

    function fixie_fetchSentence() {
        return fixie_fetch(4, 9, fixie_fetchWord) + '.';
    }

    function fixie_fetchParagraph() {
        return fixie_fetch(3, 7, fixie_fetchSentence);
    }

    function fixie_fetchParagraphs() {
        return fetch_suroundWithTag(3, 7, fixie_fetchParagraph, 'p');
    }

    function fixie_fetchList() {
        return fetch_suroundWithTag(4, 8, fixie_fetchPhrase, 'li');
    }

    function fixie_fetchDefinitionList() {
        var html = ''
        for (var i = 0, l = constrain(3,5); i < l; i++) {
            html += fetch_suroundWithTag(1, 1, fixie_fetchPhrase, 'dt') + fetch_suroundWithTag(1, 1, fixie_fetchPhrase, 'dd');
        }
        console.log(html)
        return html;
    }

 
   
    // Handle all elements with class 'fixie'
    fixie_handle_elements(document.getElementsByClassName('fixie'));

    // Handle elements which match give css selectors


    function init_str(selector_str) {
        if (!document.querySelectorAll) {
            return false;
        }
        try {
            fixie_handle_elements(document.querySelectorAll(selector_str));
            return true;
        } 
        catch (err) {
            return false;
        }
    }

    return {
        /* returns true if successful, false otherwise */
        'init': function() {
            if (selector) {
                init_str(selector);
            } else {
                fixie_handle_elements(document.getElementsByClassName('fixie'));
            }
        },
        'setImagePlaceholder': function(pl) {
            imagePlaceHolder = pl;
            return this;
        },
        'setSelector': function(sl){
            if (typeof sl === "object") {
                selector = sl.join(",");
            } else if (sl){
                selector = sl;
            } 
            return this;
        }
    };

})();
