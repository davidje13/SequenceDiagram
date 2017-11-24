(function () {
/**
 * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    //Creates a parts array for a relName where first part is plugin ID,
    //second part is resource ID. Assumes relName has already been normalized.
    function makeRelParts(relName) {
        return relName ? splitPrefix(relName) : [];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relParts) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0],
            relResourceName = relParts[1];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relResourceName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relResourceName));
            } else {
                name = normalize(name, relResourceName);
            }
        } else {
            name = normalize(name, relResourceName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i, relParts,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;
        relParts = makeRelParts(relName);

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relParts);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, makeRelParts(callback)).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../node_modules/almond/almond", function(){});

define('core/EventObject',[],() => {
	'use strict';

	return class EventObject {
		constructor() {
			this.listeners = new Map();
			this.forwards = new Set();
		}

		addEventListener(type, callback) {
			const l = this.listeners.get(type);
			if(l) {
				l.push(callback);
			} else {
				this.listeners.set(type, [callback]);
			}
		}

		removeEventListener(type, fn) {
			const l = this.listeners.get(type);
			if(!l) {
				return;
			}
			const i = l.indexOf(fn);
			if(i !== -1) {
				l.splice(i, 1);
			}
		}

		countEventListeners(type) {
			return (this.listeners.get(type) || []).length;
		}

		removeAllEventListeners(type) {
			if(type) {
				this.listeners.delete(type);
			} else {
				this.listeners.clear();
			}
		}

		addEventForwarding(target) {
			this.forwards.add(target);
		}

		removeEventForwarding(target) {
			this.forwards.delete(target);
		}

		removeAllEventForwardings() {
			this.forwards.clear();
		}

		trigger(type, params = []) {
			(this.listeners.get(type) || []).forEach(
				(listener) => listener.apply(null, params)
			);
			this.forwards.forEach((fwd) => fwd.trigger(type, params));
		}
	};
});

define('core/ArrayUtilities',[],() => {
	'use strict';

	function indexOf(list, element, equalityCheck = null) {
		if(equalityCheck === null) {
			return list.indexOf(element);
		}
		for(let i = 0; i < list.length; ++ i) {
			if(equalityCheck(list[i], element)) {
				return i;
			}
		}
		return -1;
	}

	function mergeSets(target, b = null, equalityCheck = null) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			if(indexOf(target, b[i], equalityCheck) === -1) {
				target.push(b[i]);
			}
		}
	}

	function hasIntersection(a, b, equalityCheck = null) {
		for(let i = 0; i < b.length; ++ i) {
			if(indexOf(a, b[i], equalityCheck) !== -1) {
				return true;
			}
		}
		return false;
	}

	function removeAll(target, b = null, equalityCheck = null) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			const p = indexOf(target, b[i], equalityCheck);
			if(p !== -1) {
				target.splice(p, 1);
			}
		}
	}

	function remove(list, item, equalityCheck = null) {
		const p = indexOf(list, item, equalityCheck);
		if(p !== -1) {
			list.splice(p, 1);
		}
	}

	function last(list) {
		return list[list.length - 1];
	}

	function combineRecur(parts, position, current, target) {
		if(position >= parts.length) {
			target.push(current.slice());
			return;
		}
		const choices = parts[position];
		if(!Array.isArray(choices)) {
			current.push(choices);
			combineRecur(parts, position + 1, current, target);
			current.pop();
			return;
		}
		for(let i = 0; i < choices.length; ++ i) {
			current.push(choices[i]);
			combineRecur(parts, position + 1, current, target);
			current.pop();
		}
	}

	function combine(parts) {
		const target = [];
		combineRecur(parts, 0, [], target);
		return target;
	}

	function flatMap(list, fn) {
		const result = [];
		list.forEach((item) => {
			result.push(...fn(item));
		});
		return result;
	}

	return {
		indexOf,
		mergeSets,
		hasIntersection,
		removeAll,
		remove,
		last,
		combine,
		flatMap,
	};
});

define('sequence/CodeMirrorMode',['core/ArrayUtilities'], (array) => {
	'use strict';

	const CM_ERROR = {type: 'error line-error', then: {'': 0}};

	const makeCommands = ((() => {
		// The order of commands inside "then" blocks directly influences the
		// order they are displayed to the user in autocomplete menus.
		// This relies on the fact that common JS engines maintain insertion
		// order in objects, though this is not guaranteed. It could be switched
		// to use Map objects instead for strict compliance, at the cost of
		// extra syntax.

		const end = {type: '', suggest: '\n', then: {}};
		const hiddenEnd = {type: '', then: {}};

		function textTo(exit) {
			return {type: 'string', then: Object.assign({'': 0}, exit)};
		}

		const textToEnd = textTo({'\n': end});
		const aliasListToEnd = {type: 'variable', suggest: 'Agent', then: {
			'': 0,
			'\n': end,
			',': {type: 'operator', suggest: true, then: {'': 1}},
			'as': {type: 'keyword', suggest: true, then: {
				'': {type: 'variable', suggest: 'Agent', then: {
					'': 0,
					',': {type: 'operator', suggest: true, then: {'': 3}},
					'\n': end,
				}},
			}},
		}};

		function agentListTo(exit) {
			return {type: 'variable', suggest: 'Agent', then: Object.assign({},
				exit,
				{
					'': 0,
					',': {type: 'operator', suggest: true, then: {'': 1}},
				}
			)};
		}

		const agentListToText = agentListTo({
			':': {type: 'operator', suggest: true, then: {'': textToEnd}},
		});
		const agentList2ToText = {type: 'variable', suggest: 'Agent', then: {
			'': 0,
			',': {type: 'operator', suggest: true, then: {'': agentListToText}},
			':': CM_ERROR,
		}};
		const singleAgentToText = {type: 'variable', suggest: 'Agent', then: {
			'': 0,
			',': CM_ERROR,
			':': {type: 'operator', suggest: true, then: {'': textToEnd}},
		}};
		const agentToOptText = {type: 'variable', suggest: 'Agent', then: {
			'': 0,
			':': {type: 'operator', suggest: true, then: {
				'': textToEnd,
				'\n': hiddenEnd,
			}},
			'\n': end,
		}};
		const referenceName = {
			':': {type: 'operator', suggest: true, then: {
				'': textTo({
					'as': {type: 'keyword', suggest: true, then: {
						'': {type: 'variable', suggest: 'Agent', then: {
							'': 0,
							'\n': end,
						}},
					}},
				}),
			}},
		};
		const refDef = {type: 'keyword', suggest: true, then: Object.assign({
			'over': {type: 'keyword', suggest: true, then: {
				'': agentListTo(referenceName),
			}},
		}, referenceName)};

		function makeSideNote(side) {
			return {
				type: 'keyword',
				suggest: [side + ' of ', side + ': '],
				then: {
					'of': {type: 'keyword', suggest: true, then: {
						'': agentListToText,
					}},
					':': {type: 'operator', suggest: true, then: {
						'': textToEnd,
					}},
					'': agentListToText,
				},
			};
		}

		function makeOpBlock(exit) {
			const op = {type: 'operator', suggest: true, then: {
				'+': CM_ERROR,
				'-': CM_ERROR,
				'*': CM_ERROR,
				'!': CM_ERROR,
				'': exit,
			}};
			return {
				'+': {type: 'operator', suggest: true, then: {
					'+': CM_ERROR,
					'-': CM_ERROR,
					'*': op,
					'!': CM_ERROR,
					'': exit,
				}},
				'-': {type: 'operator', suggest: true, then: {
					'+': CM_ERROR,
					'-': CM_ERROR,
					'*': op,
					'!': {type: 'operator', then: {
						'+': CM_ERROR,
						'-': CM_ERROR,
						'*': CM_ERROR,
						'!': CM_ERROR,
						'': exit,
					}},
					'': exit,
				}},
				'*': {type: 'operator', suggest: true, then: {
					'+': op,
					'-': op,
					'*': CM_ERROR,
					'!': CM_ERROR,
					'': exit,
				}},
				'!': op,
				'': exit,
			};
		}

		function makeCMConnect(arrows) {
			const connect = {
				type: 'keyword',
				suggest: true,
				then: makeOpBlock(agentToOptText),
			};

			const then = {'': 0};
			arrows.forEach((arrow) => (then[arrow] = connect));
			then[':'] = {
				type: 'operator',
				suggest: true,
				override: 'Label',
				then: {},
			};
			return makeOpBlock({type: 'variable', suggest: 'Agent', then});
		}

		const BASE_THEN = {
			'title': {type: 'keyword', suggest: true, then: {
				'': textToEnd,
			}},
			'theme': {type: 'keyword', suggest: true, then: {
				'': {
					type: 'string',
					suggest: {
						global: 'themes',
						suffix: '\n',
					},
					then: {
						'': 0,
						'\n': end,
					},
				},
			}},
			'headers': {type: 'keyword', suggest: true, then: {
				'none': {type: 'keyword', suggest: true, then: {}},
				'cross': {type: 'keyword', suggest: true, then: {}},
				'box': {type: 'keyword', suggest: true, then: {}},
				'fade': {type: 'keyword', suggest: true, then: {}},
				'bar': {type: 'keyword', suggest: true, then: {}},
			}},
			'terminators': {type: 'keyword', suggest: true, then: {
				'none': {type: 'keyword', suggest: true, then: {}},
				'cross': {type: 'keyword', suggest: true, then: {}},
				'box': {type: 'keyword', suggest: true, then: {}},
				'fade': {type: 'keyword', suggest: true, then: {}},
				'bar': {type: 'keyword', suggest: true, then: {}},
			}},
			'define': {type: 'keyword', suggest: true, then: {
				'': aliasListToEnd,
				'as': CM_ERROR,
			}},
			'begin': {type: 'keyword', suggest: true, then: {
				'': aliasListToEnd,
				'reference': refDef,
				'as': CM_ERROR,
			}},
			'end': {type: 'keyword', suggest: true, then: {
				'': aliasListToEnd,
				'as': CM_ERROR,
				'\n': end,
			}},
			'if': {type: 'keyword', suggest: true, then: {
				'': textToEnd,
				':': {type: 'operator', suggest: true, then: {
					'': textToEnd,
				}},
				'\n': end,
			}},
			'else': {type: 'keyword', suggest: ['else\n', 'else if: '], then: {
				'if': {type: 'keyword', suggest: 'if: ', then: {
					'': textToEnd,
					':': {type: 'operator', suggest: true, then: {
						'': textToEnd,
					}},
				}},
				'\n': end,
			}},
			'repeat': {type: 'keyword', suggest: true, then: {
				'': textToEnd,
				':': {type: 'operator', suggest: true, then: {
					'': textToEnd,
				}},
				'\n': end,
			}},
			'note': {type: 'keyword', suggest: true, then: {
				'over': {type: 'keyword', suggest: true, then: {
					'': agentListToText,
				}},
				'left': makeSideNote('left'),
				'right': makeSideNote('right'),
				'between': {type: 'keyword', suggest: true, then: {
					'': agentList2ToText,
				}},
			}},
			'state': {type: 'keyword', suggest: 'state over ', then: {
				'over': {type: 'keyword', suggest: true, then: {
					'': singleAgentToText,
				}},
			}},
			'text': {type: 'keyword', suggest: true, then: {
				'left': makeSideNote('left'),
				'right': makeSideNote('right'),
			}},
			'autolabel': {type: 'keyword', suggest: true, then: {
				'off': {type: 'keyword', suggest: true, then: {}},
				'': textToEnd,
			}},
			'simultaneously': {type: 'keyword', suggest: true, then: {
				':': {type: 'operator', suggest: true, then: {}},
				'with': {type: 'keyword', suggest: true, then: {
					'': {type: 'variable', suggest: 'Label', then: {
						'': 0,
						':': {type: 'operator', suggest: true, then: {}},
					}},
				}},
			}},
		};

		return (arrows) => {
			return {
				type: 'error line-error',
				then: Object.assign({}, BASE_THEN, makeCMConnect(arrows)),
			};
		};
	})());

	function cmCappedToken(token, current) {
		if(Object.keys(current.then).length > 0) {
			return token + ' ';
		} else {
			return token + '\n';
		}
	}

	function cmGetVarSuggestions(state, previous, current) {
		if(typeof current.suggest === 'object' && current.suggest.global) {
			return [current.suggest];
		}
		if(
			typeof current.suggest !== 'string' ||
			previous.suggest === current.suggest
		) {
			return null;
		}
		return state['known' + current.suggest];
	}

	function cmGetSuggestions(state, token, previous, current) {
		if(token === '') {
			return cmGetVarSuggestions(state, previous, current);
		} else if(current.suggest === true) {
			return [cmCappedToken(token, current)];
		} else if(Array.isArray(current.suggest)) {
			return current.suggest;
		} else if(current.suggest) {
			return [current.suggest];
		} else {
			return null;
		}
	}

	function cmMakeCompletions(state, path) {
		const comp = [];
		const current = array.last(path);
		Object.keys(current.then).forEach((token) => {
			let next = current.then[token];
			if(typeof next === 'number') {
				next = path[path.length - next - 1];
			}
			array.mergeSets(
				comp,
				cmGetSuggestions(state, token, current, next)
			);
		});
		return comp;
	}

	function updateSuggestion(state, locals, token, {suggest, override}) {
		if(locals.type) {
			if(suggest !== locals.type) {
				if(override) {
					locals.type = override;
				}
				array.mergeSets(
					state['known' + locals.type],
					[locals.value + ' ']
				);
				locals.type = '';
				locals.value = '';
			}
		}
		if(typeof suggest === 'string' && state['known' + suggest]) {
			locals.type = suggest;
			if(locals.value) {
				locals.value += token.s;
			}
			locals.value += token.v;
		}
	}

	function cmCheckToken(state, eol, commands) {
		const suggestions = {
			type: '',
			value: '',
		};
		let current = commands;
		const path = [current];

		state.line.forEach((token, i) => {
			if(i === state.line.length - 1) {
				state.completions = cmMakeCompletions(state, path);
			}
			const keywordToken = token.q ? '' : token.v;
			const found = current.then[keywordToken] || current.then[''];
			if(typeof found === 'number') {
				path.length -= found;
			} else {
				path.push(found || CM_ERROR);
			}
			current = array.last(path);
			updateSuggestion(state, suggestions, token, current);
		});
		if(eol) {
			updateSuggestion(state, suggestions, null, {});
		}
		state.nextCompletions = cmMakeCompletions(state, path);
		state.valid = (
			Boolean(current.then['\n']) ||
			Object.keys(current.then).length === 0
		);
		return current.type;
	}

	function getInitialToken(block) {
		const baseToken = (block.baseToken || {});
		return {
			value: baseToken.v || '',
			quoted: baseToken.q || false,
		};
	}

	return class Mode {
		constructor(tokenDefinitions, arrows) {
			this.tokenDefinitions = tokenDefinitions;
			this.commands = makeCommands(arrows);
			this.lineComment = '#';
		}

		startState() {
			return {
				currentType: -1,
				current: '',
				currentSpace: '',
				currentQuoted: false,
				knownAgent: [],
				knownLabel: [],
				beginCompletions: cmMakeCompletions({}, [this.commands]),
				completions: [],
				nextCompletions: [],
				valid: true,
				line: [],
				indent: 0,
			};
		}

		_matchPattern(stream, pattern, consume) {
			if(!pattern) {
				return null;
			}
			pattern.lastIndex = 0;
			return stream.match(pattern, consume);
		}

		_tokenBegin(stream, state) {
			state.currentSpace = '';
			let lastChar = '';
			while(true) {
				if(stream.eol()) {
					return false;
				}
				state.currentSpace += lastChar;
				for(let i = 0; i < this.tokenDefinitions.length; ++ i) {
					const block = this.tokenDefinitions[i];
					if(this._matchPattern(stream, block.start, true)) {
						state.currentType = i;
						const {value, quoted} = getInitialToken(block);
						state.current = value;
						state.currentQuoted = quoted;
						return true;
					}
				}
				lastChar = stream.next();
			}
		}

		_tokenCheckEscape(stream, state, block) {
			const match = this._matchPattern(stream, block.escape, true);
			if(match) {
				state.current += block.escapeWith(match);
			}
		}

		_addToken(state) {
			state.line.push({
				v: state.current,
				s: state.currentSpace,
				q: state.currentQuoted,
			});
		}

		_tokenEndFound(stream, state, block) {
			state.currentType = -1;
			if(block.omit) {
				return 'comment';
			}
			this._addToken(state);
			return cmCheckToken(state, stream.eol(), this.commands);
		}

		_tokenEOLFound(stream, state, block) {
			state.current += '\n';
			if(block.omit) {
				return 'comment';
			}
			this._addToken(state);
			const type = cmCheckToken(state, false, this.commands);
			state.line.pop();
			return type;
		}

		_tokenEnd(stream, state) {
			while(true) {
				const block = this.tokenDefinitions[state.currentType];
				this._tokenCheckEscape(stream, state, block);
				if(!block.end || this._matchPattern(stream, block.end, true)) {
					return this._tokenEndFound(stream, state, block);
				}
				if(stream.eol()) {
					return this._tokenEOLFound(stream, state, block);
				}
				state.current += stream.next();
			}
		}

		token(stream, state) {
			state.completions = state.nextCompletions;
			if(stream.sol() && state.currentType === -1) {
				state.line.length = 0;
			}
			let type = '';
			if(state.currentType !== -1 || this._tokenBegin(stream, state)) {
				type = this._tokenEnd(stream, state);
			}
			if(state.currentType === -1 && stream.eol() && !state.valid) {
				return 'line-error ' + type;
			} else {
				return type;
			}
		}

		indent(state) {
			return state.indent;
		}
	};
});

define('sequence/Tokeniser',['./CodeMirrorMode'], (CMMode) => {
	'use strict';

	function execAt(str, reg, i) {
		reg.lastIndex = i;
		return reg.exec(str);
	}

	function unescape(match) {
		const c = match[1];
		if(c === 'n') {
			return '\n';
		}
		return match[1];
	}

	const TOKENS = [
		{start: /#/y, end: /(?=\n)|$/y, omit: true},
		{
			start: /"/y,
			end: /"/y,
			escape: /\\(.)/y,
			escapeWith: unescape,
			baseToken: {q: true},
		},
		{
			start: /'/y,
			end: /'/y,
			escape: /\\(.)/y,
			escapeWith:
			unescape,
			baseToken: {q: true},
		},
		{start: /(?=[^ \t\r\n:+\-~*!<>,])/y, end: /(?=[ \t\r\n:+\-~*!<>,])|$/y},
		{start: /(?=[\-~<>])/y, end: /(?=[^\-~<>])|$/y},
		{start: /,/y, baseToken: {v: ','}},
		{start: /:/y, baseToken: {v: ':'}},
		{start: /!/y, baseToken: {v: '!'}},
		{start: /\+/y, baseToken: {v: '+'}},
		{start: /\*/y, baseToken: {v: '*'}},
		{start: /\n/y, baseToken: {v: '\n'}},
	];

	function tokFindBegin(src, i) {
		for(let j = 0; j < TOKENS.length; ++ j) {
			const block = TOKENS[j];
			const match = execAt(src, block.start, i);
			if(match) {
				return {
					newBlock: block,
					end: !block.end,
					appendSpace: '',
					appendValue: '',
					skip: match[0].length,
				};
			}
		}
		return {
			newBlock: null,
			end: false,
			appendSpace: src[i],
			appendValue: '',
			skip: 1,
		};
	}

	function tokContinuePart(src, i, block) {
		if(block.escape) {
			const match = execAt(src, block.escape, i);
			if(match) {
				return {
					newBlock: null,
					end: false,
					appendSpace: '',
					appendValue: block.escapeWith(match),
					skip: match[0].length,
				};
			}
		}
		const match = execAt(src, block.end, i);
		if(match) {
			return {
				newBlock: null,
				end: true,
				appendSpace: '',
				appendValue: '',
				skip: match[0].length,
			};
		}
		return {
			newBlock: null,
			end: false,
			appendSpace: '',
			appendValue: src[i],
			skip: 1,
		};
	}

	function tokAdvance(src, i, block) {
		if(block) {
			return tokContinuePart(src, i, block);
		} else {
			return tokFindBegin(src, i);
		}
	}

	function copyPos(pos) {
		return {i: pos.i, ln: pos.ln, ch: pos.ch};
	}

	function advancePos(pos, src, steps) {
		for(let i = 0; i < steps; ++ i) {
			++ pos.ch;
			if(src[pos.i + i] === '\n') {
				++ pos.ln;
				pos.ch = 0;
			}
		}
		pos.i += steps;
	}

	class TokenState {
		constructor(src) {
			this.src = src;
			this.block = null;
			this.token = null;
			this.pos = {i: 0, ln: 0, ch: 0};
			this.reset();
		}

		isOver() {
			return this.pos.i > this.src.length;
		}

		reset() {
			this.token = {s: '', v: '', q: false, b: null, e: null};
			this.block = null;
		}

		beginToken(advance) {
			this.block = advance.newBlock;
			Object.assign(this.token, this.block.baseToken);
			this.token.b = copyPos(this.pos);
		}

		endToken() {
			let token = null;
			if(!this.block.omit) {
				this.token.e = copyPos(this.pos);
				token = this.token;
			}
			this.reset();
			return token;
		}

		advance() {
			const advance = tokAdvance(this.src, this.pos.i, this.block);

			if(advance.newBlock) {
				this.beginToken(advance);
			}

			this.token.s += advance.appendSpace;
			this.token.v += advance.appendValue;
			advancePos(this.pos, this.src, advance.skip);

			if(advance.end) {
				return this.endToken();
			} else {
				return null;
			}
		}
	}

	function posStr(pos) {
		return 'line ' + (pos.ln + 1) + ', character ' + pos.ch;
	}

	return class Tokeniser {
		tokenise(src) {
			const tokens = [];
			const state = new TokenState(src);
			while(!state.isOver()) {
				const token = state.advance();
				if(token) {
					tokens.push(token);
				}
			}
			if(state.block) {
				throw new Error(
					'Unterminated literal (began at ' +
					posStr(state.token.b) + ')'
				);
			}
			return tokens;
		}

		getCodeMirrorMode(arrows) {
			return new CMMode(TOKENS, arrows);
		}

		splitLines(tokens) {
			const lines = [];
			let line = [];
			tokens.forEach((token) => {
				if(!token.q && token.v === '\n') {
					if(line.length > 0) {
						lines.push(line);
						line = [];
					}
				} else {
					line.push(token);
				}
			});
			if(line.length > 0) {
				lines.push(line);
			}
			return lines;
		}
	};
});

define('sequence/LabelPatternParser',[],() => {
	'use strict';

	const LABEL_PATTERN = /(.*?)<([^<>]*)>/g;
	const DP_PATTERN = /\.([0-9]*)/;

	function countDP(value) {
		const match = DP_PATTERN.exec(value);
		if(!match || !match[1]) {
			return 0;
		}
		return match[1].length;
	}

	function parseCounter(args) {
		let start = 1;
		let inc = 1;
		let dp = 0;
		if(args[0]) {
			start = Number(args[0]);
			dp = Math.max(dp, countDP(args[0]));
		}
		if(args[1]) {
			inc = Number(args[1]);
			dp = Math.max(dp, countDP(args[1]));
		}
		return {start, inc, dp};
	}

	function parseToken(token) {
		if(token === 'label') {
			return {token: 'label'};
		}

		const p = token.indexOf(' ');
		let type = null;
		let args = null;
		if(p === -1) {
			type = token;
			args = [];
		} else {
			type = token.substr(0, p);
			args = token.substr(p + 1).split(',');
		}

		if(type === 'inc') {
			return parseCounter(args);
		}

		return '<' + token + '>';
	}

	function parsePattern(raw) {
		const pattern = [];
		let match = null;
		let end = 0;
		LABEL_PATTERN.lastIndex = 0;
		while((match = LABEL_PATTERN.exec(raw))) {
			if(match[1]) {
				pattern.push(match[1]);
			}
			if(match[2]) {
				pattern.push(parseToken(match[2]));
			}
			end = LABEL_PATTERN.lastIndex;
		}
		const remainder = raw.substr(end);
		if(remainder) {
			pattern.push(remainder);
		}
		return pattern;
	}

	return parsePattern;
});

define('sequence/CodeMirrorHints',['core/ArrayUtilities'], (array) => {
	'use strict';

	const TRIMMER = /^([ \t]*)(.*)$/;
	const SQUASH_START = /^[ \t\r\n:,]/;
	const SQUASH_END = /[ \t\r\n]$/;

	function makeRanges(cm, line, chFrom, chTo) {
		const ln = cm.getLine(line);
		const ranges = {
			wordFrom: {line: line, ch: chFrom},
			squashFrom: {line: line, ch: chFrom},
			wordTo: {line: line, ch: chTo},
			squashTo: {line: line, ch: chTo},
		};
		if(chFrom > 0 && ln[chFrom - 1] === ' ') {
			ranges.squashFrom.ch --;
		}
		if(ln[chTo] === ' ') {
			ranges.squashTo.ch ++;
		}
		return ranges;
	}

	function makeHintItem(text, ranges) {
		return {
			text: text,
			displayText: (text === '\n') ? '<END>' : text.trim(),
			className: (text === '\n') ? 'pick-virtual' : null,
			from: SQUASH_START.test(text) ? ranges.squashFrom : ranges.wordFrom,
			to: SQUASH_END.test(text) ? ranges.squashTo : ranges.wordTo,
		};
	}

	function getGlobals({global, prefix = '', suffix = ''}, globals) {
		const identified = globals[global];
		if(!identified) {
			return [];
		}
		return identified.map((item) => (prefix + item + suffix));
	}

	function populateGlobals(suggestions, globals = {}) {
		for(let i = 0; i < suggestions.length;) {
			if(typeof suggestions[i] === 'object') {
				const identified = getGlobals(suggestions[i], globals);
				array.mergeSets(suggestions, identified);
				suggestions.splice(i, 1);
			} else {
				++ i;
			}
		}
	}

	function getHints(cm, options) {
		const cur = cm.getCursor();
		const token = cm.getTokenAt(cur);
		let partial = token.string;
		if(token.end > cur.ch) {
			partial = partial.substr(0, cur.ch - token.start);
		}
		const parts = TRIMMER.exec(partial);
		partial = parts[2];
		const from = token.start + parts[1].length;

		const continuation = (cur.ch > 0 && token.state.line.length > 0);
		let comp = (continuation ?
			token.state.completions :
			token.state.beginCompletions
		);
		if(!continuation) {
			comp = comp.concat(token.state.knownAgent);
		}

		populateGlobals(comp, cm.options.globals);

		const ranges = makeRanges(cm, cur.line, from, token.end);
		let selfValid = false;
		const list = (comp
			.filter((opt) => opt.startsWith(partial))
			.map((opt) => {
				if(opt === partial + ' ' && !options.completeSingle) {
					selfValid = true;
					return null;
				}
				return makeHintItem(opt, ranges);
			})
			.filter((opt) => (opt !== null))
		);
		if(selfValid && list.length > 0) {
			list.unshift(makeHintItem(partial + ' ', ranges));
		}

		return {
			list,
			from: ranges.wordFrom,
			to: ranges.wordTo,
		};
	}

	return {
		getHints,
	};
});

define('sequence/Parser',[
	'core/ArrayUtilities',
	'./Tokeniser',
	'./LabelPatternParser',
	'./CodeMirrorHints',
], (
	array,
	Tokeniser,
	labelPatternParser,
	CMHints
) => {
	'use strict';

	const BLOCK_TYPES = {
		'if': {type: 'block begin', mode: 'if', skip: []},
		'else': {type: 'block split', mode: 'else', skip: ['if']},
		'repeat': {type: 'block begin', mode: 'repeat', skip: []},
	};

	const CONNECT_TYPES = ((() => {
		const lTypes = [
			{tok: '', type: 0},
			{tok: '<', type: 1},
			{tok: '<<', type: 2},
		];
		const mTypes = [
			{tok: '-', type: 'solid'},
			{tok: '--', type: 'dash'},
			{tok: '~', type: 'wave'},
		];
		const rTypes = [
			{tok: '', type: 0},
			{tok: '>', type: 1},
			{tok: '>>', type: 2},
		];
		const arrows = (array.combine([lTypes, mTypes, rTypes])
			.filter((arrow) => (arrow[0].type !== 0 || arrow[2].type !== 0))
		);

		const types = new Map();

		arrows.forEach((arrow) => {
			types.set(arrow.map((part) => part.tok).join(''), {
				line: arrow[1].type,
				left: arrow[0].type,
				right: arrow[2].type,
			});
		});

		return types;
	})());

	const CONNECT_AGENT_FLAGS = {
		'*': 'begin',
		'+': 'start',
		'-': 'stop',
		'!': 'end',
	};

	const TERMINATOR_TYPES = [
		'none',
		'box',
		'cross',
		'fade',
		'bar',
	];

	const NOTE_TYPES = {
		'text': {
			mode: 'text',
			types: {
				'left': {type: 'note left', skip: ['of'], min: 0, max: null},
				'right': {type: 'note right', skip: ['of'], min: 0, max: null},
			},
		},
		'note': {
			mode: 'note',
			types: {
				'over': {type: 'note over', skip: [], min: 0, max: null},
				'left': {type: 'note left', skip: ['of'], min: 0, max: null},
				'right': {type: 'note right', skip: ['of'], min: 0, max: null},
				'between': {type: 'note between', skip: [], min: 2, max: null},
			},
		},
		'state': {
			mode: 'state',
			types: {
				'over': {type: 'note over', skip: [], min: 1, max: 1},
			},
		},
	};

	const AGENT_MANIPULATION_TYPES = {
		'define': {type: 'agent define'},
		'begin': {type: 'agent begin', mode: 'box'},
		'end': {type: 'agent end', mode: 'cross'},
	};

	function makeError(message, token = null) {
		let suffix = '';
		if(token) {
			suffix = (
				' at line ' + (token.b.ln + 1) +
				', character ' + token.b.ch
			);
		}
		return new Error(message + suffix);
	}

	function errToken(line, pos) {
		if(pos < line.length) {
			return line[pos];
		}
		const last = array.last(line);
		if(!last) {
			return null;
		}
		return {b: last.e};
	}

	function joinLabel(line, begin = 0, end = null) {
		if(end === null) {
			end = line.length;
		}
		if(end <= begin) {
			return '';
		}
		let result = line[begin].v;
		for(let i = begin + 1; i < end; ++ i) {
			result += line[i].s + line[i].v;
		}
		return result;
	}

	function tokenKeyword(token) {
		if(!token || token.q) {
			return null;
		}
		return token.v;
	}

	function skipOver(line, start, skip, error = null) {
		for(let i = 0; i < skip.length; ++ i) {
			const expected = skip[i];
			const token = line[start + i];
			if(tokenKeyword(token) !== expected) {
				if(error) {
					throw makeError(
						error + '; expected "' + expected + '"',
						token
					);
				} else {
					return start;
				}
			}
		}
		return start + skip.length;
	}

	function findToken(line, token, start = 0) {
		for(let i = start; i < line.length; ++ i) {
			if(tokenKeyword(line[i]) === token) {
				return i;
			}
		}
		return -1;
	}

	function readAgentAlias(line, start, end, enableAlias) {
		let aliasSep = -1;
		if(enableAlias) {
			aliasSep = findToken(line, 'as', start);
		}
		if(aliasSep === -1 || aliasSep >= end) {
			aliasSep = end;
		}
		if(start >= aliasSep) {
			throw makeError('Missing agent name', errToken(line, start));
		}
		return {
			name: joinLabel(line, start, aliasSep),
			alias: joinLabel(line, aliasSep + 1, end),
		};
	}

	function readAgent(line, start, end, {
		flagTypes = {},
		aliases = false,
	} = {}) {
		const flags = [];
		let p = start;
		for(; p < end; ++ p) {
			const token = line[p];
			const rawFlag = tokenKeyword(token);
			const flag = flagTypes[rawFlag];
			if(flag) {
				if(flags.includes(flag)) {
					throw makeError('Duplicate agent flag: ' + rawFlag, token);
				}
				flags.push(flag);
			} else {
				break;
			}
		}
		const {name, alias} = readAgentAlias(line, p, end, aliases);
		return {
			name,
			alias,
			flags,
		};
	}

	function readAgentList(line, start, end, readAgentOpts) {
		const list = [];
		let currentStart = -1;
		for(let i = start; i < end; ++ i) {
			const token = line[i];
			if(tokenKeyword(token) === ',') {
				if(currentStart !== -1) {
					list.push(readAgent(line, currentStart, i, readAgentOpts));
					currentStart = -1;
				}
			} else if(currentStart === -1) {
				currentStart = i;
			}
		}
		if(currentStart !== -1) {
			list.push(readAgent(line, currentStart, end, readAgentOpts));
		}
		return list;
	}

	const PARSERS = [
		(line, meta) => { // title
			if(tokenKeyword(line[0]) !== 'title') {
				return null;
			}

			meta.title = joinLabel(line, 1);
			return true;
		},

		(line, meta) => { // theme
			if(tokenKeyword(line[0]) !== 'theme') {
				return null;
			}

			meta.theme = joinLabel(line, 1);
			return true;
		},

		(line, meta) => { // terminators
			if(tokenKeyword(line[0]) !== 'terminators') {
				return null;
			}

			const type = tokenKeyword(line[1]);
			if(!type) {
				throw makeError('Unspecified termination', line[0]);
			}
			if(TERMINATOR_TYPES.indexOf(type) === -1) {
				throw makeError('Unknown termination "' + type + '"', line[1]);
			}
			meta.terminators = type;
			return true;
		},

		(line, meta) => { // headers
			if(tokenKeyword(line[0]) !== 'headers') {
				return null;
			}

			const type = tokenKeyword(line[1]);
			if(!type) {
				throw makeError('Unspecified header', line[0]);
			}
			if(TERMINATOR_TYPES.indexOf(type) === -1) {
				throw makeError('Unknown header "' + type + '"', line[1]);
			}
			meta.headers = type;
			return true;
		},

		(line) => { // autolabel
			if(tokenKeyword(line[0]) !== 'autolabel') {
				return null;
			}

			let raw = null;
			if(tokenKeyword(line[1]) === 'off') {
				raw = '<label>';
			} else {
				raw = joinLabel(line, 1);
			}
			return {
				type: 'label pattern',
				pattern: labelPatternParser(raw),
			};
		},

		(line) => { // block
			if(tokenKeyword(line[0]) === 'end' && line.length === 1) {
				return {type: 'block end'};
			}

			const type = BLOCK_TYPES[tokenKeyword(line[0])];
			if(!type) {
				return null;
			}
			let skip = 1;
			if(line.length > skip) {
				skip = skipOver(line, skip, type.skip, 'Invalid block command');
			}
			skip = skipOver(line, skip, [':']);
			return {
				type: type.type,
				mode: type.mode,
				label: joinLabel(line, skip),
			};
		},

		(line) => { // begin reference
			if(
				tokenKeyword(line[0]) !== 'begin' ||
				tokenKeyword(line[1]) !== 'reference'
			) {
				return null;
			}
			let agents = [];
			const labelSep = findToken(line, ':');
			if(tokenKeyword(line[2]) === 'over' && labelSep > 3) {
				agents = readAgentList(line, 3, labelSep);
			} else if(labelSep !== 2) {
				throw makeError('Expected ":" or "over"', line[2]);
			}
			const def = readAgent(
				line,
				labelSep + 1,
				line.length,
				{aliases: true}
			);
			if(!def.alias) {
				throw makeError('Reference must have an alias', line[labelSep]);
			}
			return {
				type: 'group begin',
				agents,
				mode: 'ref',
				label: def.name,
				alias: def.alias,
			};
		},

		(line) => { // agent
			const type = AGENT_MANIPULATION_TYPES[tokenKeyword(line[0])];
			if(!type || line.length <= 1) {
				return null;
			}
			return Object.assign({
				agents: readAgentList(line, 1, line.length, {aliases: true}),
			}, type);
		},

		(line) => { // async
			if(tokenKeyword(line[0]) !== 'simultaneously') {
				return null;
			}
			if(tokenKeyword(array.last(line)) !== ':') {
				return null;
			}
			let target = '';
			if(line.length > 2) {
				if(tokenKeyword(line[1]) !== 'with') {
					return null;
				}
				target = joinLabel(line, 2, line.length - 1);
			}
			return {
				type: 'async',
				target,
			};
		},

		(line) => { // note
			const mode = NOTE_TYPES[tokenKeyword(line[0])];
			const labelSep = findToken(line, ':');
			if(!mode || labelSep === -1) {
				return null;
			}
			const type = mode.types[tokenKeyword(line[1])];
			if(!type) {
				return null;
			}
			let skip = 2;
			skip = skipOver(line, skip, type.skip);
			const agents = readAgentList(line, skip, labelSep);
			if(agents.length < type.min) {
				throw makeError('Too few agents for ' + mode.mode, line[0]);
			}
			if(type.max !== null && agents.length > type.max) {
				throw makeError('Too many agents for ' + mode.mode, line[0]);
			}
			return {
				type: type.type,
				agents,
				mode: mode.mode,
				label: joinLabel(line, labelSep + 1),
			};
		},

		(line) => { // connect
			let labelSep = findToken(line, ':');
			if(labelSep === -1) {
				labelSep = line.length;
			}
			let typePos = -1;
			let options = null;
			for(let j = 0; j < line.length; ++ j) {
				const opts = CONNECT_TYPES.get(tokenKeyword(line[j]));
				if(opts) {
					typePos = j;
					options = opts;
					break;
				}
			}
			if(typePos <= 0 || typePos >= labelSep - 1) {
				return null;
			}
			const readAgentOpts = {
				flagTypes: CONNECT_AGENT_FLAGS,
			};
			return {
				type: 'connect',
				agents: [
					readAgent(line, 0, typePos, readAgentOpts),
					readAgent(line, typePos + 1, labelSep, readAgentOpts),
				],
				label: joinLabel(line, labelSep + 1),
				options,
			};
		},

		(line) => { // marker
			if(line.length < 2 || tokenKeyword(array.last(line)) !== ':') {
				return null;
			}
			return {
				type: 'mark',
				name: joinLabel(line, 0, line.length - 1),
			};
		},
	];

	function parseLine(line, {meta, stages}) {
		let stage = null;
		for(let i = 0; i < PARSERS.length; ++ i) {
			stage = PARSERS[i](line, meta);
			if(stage) {
				break;
			}
		}
		if(!stage) {
			throw makeError(
				'Unrecognised command: ' + joinLabel(line),
				line[0]
			);
		}
		if(typeof stage === 'object') {
			stage.ln = line[0].b.ln;
			stages.push(stage);
		}
	}

	const SHARED_TOKENISER = new Tokeniser();

	return class Parser {
		getCodeMirrorMode() {
			return SHARED_TOKENISER.getCodeMirrorMode(
				Array.from(CONNECT_TYPES.keys())
			);
		}

		getCodeMirrorHints() {
			return CMHints.getHints;
		}

		parseLines(lines) {
			const result = {
				meta: {
					title: '',
					theme: '',
					terminators: 'none',
					headers: 'box',
				},
				stages: [],
			};

			lines.forEach((line) => parseLine(line, result));

			return result;
		}

		parse(src) {
			const tokens = SHARED_TOKENISER.tokenise(src);
			const lines = SHARED_TOKENISER.splitLines(tokens);
			return this.parseLines(lines);
		}
	};
});

define('sequence/Generator',['core/ArrayUtilities'], (array) => {
	'use strict';

	class AgentState {
		constructor({
			visible = false,
			locked = false,
			blocked = false,
			highlighted = false,
			group = null,
			covered = false,
		} = {}) {
			this.visible = visible;
			this.locked = locked;
			this.blocked = blocked;
			this.highlighted = highlighted;
			this.group = group;
			this.covered = covered;
		}
	}
	AgentState.LOCKED = new AgentState({locked: true});
	AgentState.DEFAULT = new AgentState();

	const Agent = {
		equals: (a, b) => {
			return a.name === b.name;
		},
		make: (name, {anchorRight = false} = {}) => {
			return {name, anchorRight};
		},
		getName: (agent) => {
			return agent.name;
		},
		hasFlag: (flag, has = true) => {
			return (agent) => (agent.flags.includes(flag) === has);
		},
	};

	const MERGABLE = {
		'agent begin': {
			check: ['mode'],
			merge: ['agentNames'],
			siblings: new Set(['agent highlight']),
		},
		'agent end': {
			check: ['mode'],
			merge: ['agentNames'],
			siblings: new Set(['agent highlight']),
		},
		'agent highlight': {
			check: ['highlighted'],
			merge: ['agentNames'],
			siblings: new Set(['agent begin', 'agent end']),
		},
	};

	function mergableParallel(target, copy) {
		const info = MERGABLE[target.type];
		if(!info || target.type !== copy.type) {
			return false;
		}
		if(info.check.some((c) => target[c] !== copy[c])) {
			return false;
		}
		return true;
	}

	function performMerge(target, copy) {
		const info = MERGABLE[target.type];
		info.merge.forEach((m) => {
			array.mergeSets(target[m], copy[m]);
		});
	}

	function iterateRemoval(list, fn) {
		for(let i = 0; i < list.length;) {
			const remove = fn(list[i], i);
			if(remove) {
				list.splice(i, 1);
			} else {
				++ i;
			}
		}
	}

	function performParallelMergers(stages) {
		iterateRemoval(stages, (stage, i) => {
			for(let j = 0; j < i; ++ j) {
				if(mergableParallel(stages[j], stage)) {
					performMerge(stages[j], stage);
					return true;
				}
			}
			return false;
		});
	}

	function findViableSequentialMergers(stages) {
		const mergers = new Set();
		const types = stages.map(({type}) => type);
		types.forEach((type) => {
			const info = MERGABLE[type];
			if(!info) {
				return;
			}
			if(types.every((sType) =>
				(type === sType || info.siblings.has(sType))
			)) {
				mergers.add(type);
			}
		});
		return mergers;
	}

	function performSequentialMergers(lastViable, viable, lastStages, stages) {
		iterateRemoval(stages, (stage) => {
			if(!lastViable.has(stage.type) || !viable.has(stage.type)) {
				return false;
			}
			for(let j = 0; j < lastStages.length; ++ j) {
				if(mergableParallel(lastStages[j], stage)) {
					performMerge(lastStages[j], stage);
					return true;
				}
			}
			return false;
		});
	}

	function optimiseStages(stages) {
		let lastStages = [];
		let lastViable = new Set();
		for(let i = 0; i < stages.length;) {
			const stage = stages[i];
			let subStages = null;
			if(stage.type === 'parallel') {
				subStages = stage.stages;
			} else {
				subStages = [stage];
			}

			performParallelMergers(subStages);
			const viable = findViableSequentialMergers(subStages);
			performSequentialMergers(lastViable, viable, lastStages, subStages);

			lastViable = viable;
			lastStages = subStages;

			if(subStages.length === 0) {
				stages.splice(i, 1);
			} else if(stage.type === 'parallel' && subStages.length === 1) {
				stages.splice(i, 1, subStages[0]);
				++ i;
			} else {
				++ i;
			}
		}
	}

	function swapBegin(stage, mode) {
		if(stage.type === 'agent begin') {
			stage.mode = mode;
			return true;
		}
		if(stage.type === 'parallel') {
			let any = false;
			stage.stages.forEach((subStage) => {
				if(subStage.type === 'agent begin') {
					subStage.mode = mode;
					any = true;
				}
			});
			return any;
		}
		return false;
	}

	function swapFirstBegin(stages, mode) {
		for(let i = 0; i < stages.length; ++ i) {
			if(swapBegin(stages[i], mode)) {
				break;
			}
		}
	}

	function addBounds(target, agentL, agentR, involvedAgents = null) {
		array.remove(target, agentL, Agent.equals);
		array.remove(target, agentR, Agent.equals);

		let indexL = 0;
		let indexR = target.length;
		if(involvedAgents) {
			const found = (involvedAgents
				.map((agent) => array.indexOf(target, agent, Agent.equals))
				.filter((p) => (p !== -1))
			);
			indexL = found.reduce((a, b) => Math.min(a, b), target.length);
			indexR = found.reduce((a, b) => Math.max(a, b), indexL) + 1;
		}

		target.splice(indexL, 0, agentL);
		target.splice(indexR + 1, 0, agentR);

		return {indexL, indexR: indexR + 1};
	}

	const NOTE_DEFAULT_AGENTS = {
		'note over': [{name: '[', flags: []}, {name: ']', flags: []}],
		'note left': [{name: '[', flags: []}],
		'note right': [{name: ']', flags: []}],
	};

	return class Generator {
		constructor() {
			this.agentStates = new Map();
			this.agentAliases = new Map();
			this.activeGroups = new Map();
			this.agents = [];
			this.labelPattern = null;
			this.blockCount = 0;
			this.nesting = [];
			this.markers = new Set();
			this.currentSection = null;
			this.currentNest = null;

			this.stageHandlers = {
				'block begin': this.handleBlockBegin.bind(this),
				'block split': this.handleBlockSplit.bind(this),
				'block end': this.handleBlockEnd.bind(this),
				'group begin': this.handleGroupBegin.bind(this),
				'mark': this.handleMark.bind(this),
				'async': this.handleAsync.bind(this),
				'agent define': this.handleAgentDefine.bind(this),
				'agent begin': this.handleAgentBegin.bind(this),
				'agent end': this.handleAgentEnd.bind(this),
				'label pattern': this.handleLabelPattern.bind(this),
				'connect': this.handleConnect.bind(this),
				'note over': this.handleNote.bind(this),
				'note left': this.handleNote.bind(this),
				'note right': this.handleNote.bind(this),
				'note between': this.handleNote.bind(this),
			};
			this.expandGroupedAgent = this.expandGroupedAgent.bind(this);
			this.handleStage = this.handleStage.bind(this);
			this.convertAgent = this.convertAgent.bind(this);
			this.endGroup = this.endGroup.bind(this);
		}

		convertAgent({alias, name}) {
			if(alias) {
				if(this.agentAliases.has(name)) {
					throw new Error(
						'Cannot alias ' + name + '; it is already an alias'
					);
				}
				const old = this.agentAliases.get(alias);
				if(
					(old && old !== alias) ||
					this.agents.some((agent) => (agent.name === alias))
				) {
					throw new Error(
						'Cannot use ' + alias +
						' as an alias; it is already in use'
					);
				}
				this.agentAliases.set(alias, name);
			}
			return Agent.make(this.agentAliases.get(name) || name);
		}

		addStage(stage, isVisible = true) {
			if(!stage) {
				return;
			}
			if(stage.ln === undefined) {
				stage.ln = this.latestLine;
			}
			this.currentSection.stages.push(stage);
			if(isVisible) {
				this.currentNest.hasContent = true;
			}
		}

		addParallelStages(stages) {
			const viableStages = stages.filter((stage) => Boolean(stage));
			if(viableStages.length === 0) {
				return;
			}
			if(viableStages.length === 1) {
				return this.addStage(viableStages[0]);
			}
			viableStages.forEach((stage) => {
				if(stage.ln === undefined) {
					stage.ln = this.latestLine;
				}
			});
			return this.addStage({
				type: 'parallel',
				stages: viableStages,
			});
		}

		defineAgents(colAgents) {
			array.mergeSets(this.currentNest.agents, colAgents, Agent.equals);
			array.mergeSets(this.agents, colAgents, Agent.equals);
		}

		getAgentState(agent) {
			return this.agentStates.get(agent.name) || AgentState.DEFAULT;
		}

		updateAgentState(agent, change) {
			const state = this.agentStates.get(agent.name);
			if(state) {
				Object.assign(state, change);
			} else {
				this.agentStates.set(agent.name, new AgentState(change));
			}
		}

		validateAgents(agents, {
			allowGrouped = false,
			rejectGrouped = false,
		} = {}) {
			agents.forEach((agent) => {
				const state = this.getAgentState(agent);
				if(state.covered) {
					throw new Error(
						'Agent ' + agent.name + ' is hidden behind group'
					);
				}
				if(rejectGrouped && state.group !== null) {
					throw new Error('Agent ' + agent.name + ' is in a group');
				}
				if(state.blocked && (!allowGrouped || state.group === null)) {
					throw new Error('Duplicate agent name: ' + agent.name);
				}
				if(agent.name.startsWith('__')) {
					throw new Error(agent.name + ' is a reserved name');
				}
			});
		}

		setAgentVis(colAgents, visible, mode, checked = false) {
			const seen = new Set();
			const filteredAgents = colAgents.filter((agent) => {
				if(seen.has(agent.name)) {
					return false;
				}
				seen.add(agent.name);
				const state = this.getAgentState(agent);
				if(state.locked || state.blocked) {
					if(checked) {
						throw new Error(
							'Cannot begin/end agent: ' + agent.name
						);
					} else {
						return false;
					}
				}
				return state.visible !== visible;
			});
			if(filteredAgents.length === 0) {
				return null;
			}
			filteredAgents.forEach((agent) => {
				this.updateAgentState(agent, {visible});
			});
			this.defineAgents(filteredAgents);

			return {
				type: (visible ? 'agent begin' : 'agent end'),
				agentNames: filteredAgents.map(Agent.getName),
				mode,
			};
		}

		setAgentHighlight(colAgents, highlighted, checked = false) {
			const filteredAgents = colAgents.filter((agent) => {
				const state = this.getAgentState(agent);
				if(state.locked || state.blocked) {
					if(checked) {
						throw new Error(
							'Cannot highlight agent: ' + agent.name
						);
					} else {
						return false;
					}
				}
				return state.visible && (state.highlighted !== highlighted);
			});
			if(filteredAgents.length === 0) {
				return null;
			}
			filteredAgents.forEach((agent) => {
				this.updateAgentState(agent, {highlighted});
			});

			return {
				type: 'agent highlight',
				agentNames: filteredAgents.map(Agent.getName),
				highlighted,
			};
		}

		beginNested(mode, label, name, ln) {
			const leftAgent = Agent.make(name + '[', {anchorRight: true});
			const rightAgent = Agent.make(name + ']');
			const agents = [leftAgent, rightAgent];
			const stages = [];
			this.currentSection = {
				header: {
					type: 'block begin',
					mode,
					label,
					left: leftAgent.name,
					right: rightAgent.name,
					ln,
				},
				stages,
			};
			this.currentNest = {
				mode,
				agents,
				leftAgent,
				rightAgent,
				hasContent: false,
				sections: [this.currentSection],
			};
			this.agentStates.set(leftAgent.name, AgentState.LOCKED);
			this.agentStates.set(rightAgent.name, AgentState.LOCKED);
			this.nesting.push(this.currentNest);

			return {agents, stages};
		}

		nextBlockName() {
			const name = '__BLOCK' + this.blockCount;
			++ this.blockCount;
			return name;
		}

		handleBlockBegin({ln, mode, label}) {
			this.beginNested(mode, label, this.nextBlockName(), ln);
		}

		handleBlockSplit({ln, mode, label}) {
			if(this.currentNest.mode !== 'if') {
				throw new Error(
					'Invalid block nesting ("else" inside ' +
					this.currentNest.mode + ')'
				);
			}
			optimiseStages(this.currentSection.stages);
			this.currentSection = {
				header: {
					type: 'block split',
					mode,
					label,
					left: this.currentNest.leftAgent.name,
					right: this.currentNest.rightAgent.name,
					ln,
				},
				stages: [],
			};
			this.currentNest.sections.push(this.currentSection);
		}

		handleBlockEnd() {
			if(this.nesting.length <= 1) {
				throw new Error('Invalid block nesting (too many "end"s)');
			}
			optimiseStages(this.currentSection.stages);
			const nested = this.nesting.pop();
			this.currentNest = array.last(this.nesting);
			this.currentSection = array.last(this.currentNest.sections);

			if(nested.hasContent) {
				this.defineAgents(nested.agents);
				addBounds(
					this.agents,
					nested.leftAgent,
					nested.rightAgent,
					nested.agents
				);
				nested.sections.forEach((section) => {
					this.currentSection.stages.push(section.header);
					this.currentSection.stages.push(...section.stages);
				});
				this.addStage({
					type: 'block end',
					left: nested.leftAgent.name,
					right: nested.rightAgent.name,
				});
			} else {
				throw new Error('Empty block');
			}
		}

		makeGroupDetails(agents, alias) {
			const colAgents = agents.map(this.convertAgent);
			this.validateAgents(colAgents, {rejectGrouped: true});
			if(this.agentStates.has(alias)) {
				throw new Error('Duplicate agent name: ' + alias);
			}
			const name = this.nextBlockName();
			const leftAgent = Agent.make(name + '[', {anchorRight: true});
			const rightAgent = Agent.make(name + ']');
			this.agentStates.set(leftAgent.name, AgentState.LOCKED);
			this.agentStates.set(rightAgent.name, AgentState.LOCKED);
			this.updateAgentState(
				{name: alias},
				{blocked: true, group: alias}
			);
			this.defineAgents(colAgents);
			const {indexL, indexR} = addBounds(
				this.agents,
				leftAgent,
				rightAgent,
				colAgents
			);

			const agentsCovered = [];
			const agentsContained = colAgents.slice();
			for(let i = indexL + 1; i < indexR; ++ i) {
				agentsCovered.push(this.agents[i]);
			}
			array.removeAll(agentsCovered, agentsContained, Agent.equals);

			return {
				colAgents,
				leftAgent,
				rightAgent,
				agentsContained,
				agentsCovered,
			};
		}

		handleGroupBegin({agents, mode, label, alias}) {
			const details = this.makeGroupDetails(agents, alias);

			details.agentsContained.forEach((agent) => {
				this.updateAgentState(agent, {group: alias});
			});
			details.agentsCovered.forEach((agent) => {
				this.updateAgentState(agent, {covered: true});
			});
			this.activeGroups.set(alias, details);
			this.addStage(this.setAgentVis(details.colAgents, true, 'box'));
			this.addStage({
				type: 'block begin',
				mode,
				label,
				left: details.leftAgent.name,
				right: details.rightAgent.name,
			});
		}

		endGroup({name}) {
			const details = this.activeGroups.get(name);
			if(!details) {
				return null;
			}
			this.activeGroups.delete(name);

			details.agentsContained.forEach((agent) => {
				this.updateAgentState(agent, {group: null});
			});
			details.agentsCovered.forEach((agent) => {
				this.updateAgentState(agent, {covered: false});
			});
			this.updateAgentState({name}, {group: null});

			return {
				type: 'block end',
				left: details.leftAgent.name,
				right: details.rightAgent.name,
			};
		}

		handleMark({name}) {
			this.markers.add(name);
			this.addStage({type: 'mark', name}, false);
		}

		handleAsync({target}) {
			if(target !== '' && !this.markers.has(target)) {
				throw new Error('Unknown marker: ' + target);
			}
			this.addStage({type: 'async', target}, false);
		}

		handleLabelPattern({pattern}) {
			this.labelPattern = pattern.slice();
			for(let i = 0; i < this.labelPattern.length; ++ i) {
				const part = this.labelPattern[i];
				if(typeof part === 'object' && part.start !== undefined) {
					this.labelPattern[i] = Object.assign({
						current: part.start,
					}, part);
				}
			}
		}

		applyLabelPattern(label) {
			let result = '';
			const tokens = {
				'label': label,
			};
			this.labelPattern.forEach((part) => {
				if(typeof part === 'string') {
					result += part;
				} else if(part.token !== undefined) {
					result += tokens[part.token];
				} else if(part.current !== undefined) {
					result += part.current.toFixed(part.dp);
					part.current += part.inc;
				}
			});
			return result;
		}

		expandGroupedAgent(agent) {
			const group = this.getAgentState(agent).group;
			if(!group) {
				return [agent];
			}
			const details = this.activeGroups.get(group);
			return [details.leftAgent, details.rightAgent];
		}

		expandGroupedAgentConnection(agents) {
			const agents1 = this.expandGroupedAgent(agents[0]);
			const agents2 = this.expandGroupedAgent(agents[1]);
			let ind1 = array.indexOf(this.agents, agents1[0], Agent.equals);
			let ind2 = array.indexOf(this.agents, agents2[0], Agent.equals);
			if(ind1 === -1) {
				ind1 = this.agents.length;
			}
			if(ind2 === -1) {
				ind2 = this.agents.length;
			}
			if(ind1 === ind2) {
				// Self-connection
				return [array.last(agents1), array.last(agents2)];
			} else if(ind1 < ind2) {
				return [array.last(agents1), agents2[0]];
			} else {
				return [agents1[0], array.last(agents2)];
			}
		}

		filterConnectFlags(agents) {
			const beginAgents = (agents
				.filter(Agent.hasFlag('begin'))
				.map(this.convertAgent)
			);
			const endAgents = (agents
				.filter(Agent.hasFlag('end'))
				.map(this.convertAgent)
			);
			if(array.hasIntersection(beginAgents, endAgents, Agent.equals)) {
				throw new Error('Cannot set agent visibility multiple times');
			}

			const startAgents = (agents
				.filter(Agent.hasFlag('start'))
				.map(this.convertAgent)
			);
			const stopAgents = (agents
				.filter(Agent.hasFlag('stop'))
				.map(this.convertAgent)
			);
			array.mergeSets(stopAgents, endAgents);
			if(array.hasIntersection(startAgents, stopAgents, Agent.equals)) {
				throw new Error('Cannot set agent highlighting multiple times');
			}

			this.validateAgents(beginAgents);
			this.validateAgents(endAgents);
			this.validateAgents(startAgents);
			this.validateAgents(stopAgents);

			return {beginAgents, endAgents, startAgents, stopAgents};
		}

		handleConnect({agents, label, options}) {
			const flags = this.filterConnectFlags(agents);

			let colAgents = agents.map(this.convertAgent);
			this.validateAgents(colAgents, {allowGrouped: true});
			colAgents = this.expandGroupedAgentConnection(colAgents);

			const agentNames = colAgents.map(Agent.getName);
			this.defineAgents(colAgents);

			const implicitBegin = (agents
				.filter(Agent.hasFlag('begin', false))
				.map(this.convertAgent)
			);
			this.addStage(this.setAgentVis(implicitBegin, true, 'box'));

			const connectStage = {
				type: 'connect',
				agentNames,
				label: this.applyLabelPattern(label),
				options,
			};

			this.addParallelStages([
				this.setAgentVis(flags.beginAgents, true, 'box', true),
				this.setAgentHighlight(flags.startAgents, true, true),
				connectStage,
				this.setAgentHighlight(flags.stopAgents, false, true),
				this.setAgentVis(flags.endAgents, false, 'cross', true),
			]);
		}

		handleNote({type, agents, mode, label}) {
			let colAgents = null;
			if(agents.length === 0) {
				colAgents = NOTE_DEFAULT_AGENTS[type] || [];
			} else {
				colAgents = agents.map(this.convertAgent);
			}

			this.validateAgents(colAgents, {allowGrouped: true});
			colAgents = array.flatMap(colAgents, this.expandGroupedAgent);
			const agentNames = colAgents.map(Agent.getName);
			const uniqueAgents = new Set(agentNames).size;
			if(type === 'note between' && uniqueAgents < 2) {
				throw new Error('note between requires at least 2 agents');
			}

			this.addStage(this.setAgentVis(colAgents, true, 'box'));
			this.defineAgents(colAgents);

			this.addStage({
				type,
				agentNames,
				mode,
				label,
			});
		}

		handleAgentDefine({agents}) {
			const colAgents = agents.map(this.convertAgent);
			this.validateAgents(colAgents);
			this.defineAgents(colAgents);
		}

		handleAgentBegin({agents, mode}) {
			const colAgents = agents.map(this.convertAgent);
			this.validateAgents(colAgents);
			this.addStage(this.setAgentVis(colAgents, true, mode, true));
		}

		handleAgentEnd({agents, mode}) {
			const groupAgents = (agents
				.filter((agent) => this.activeGroups.has(agent.name))
			);
			const colAgents = (agents
				.filter((agent) => !this.activeGroups.has(agent.name))
				.map(this.convertAgent)
			);
			this.validateAgents(colAgents);
			this.addParallelStages([
				this.setAgentHighlight(colAgents, false),
				this.setAgentVis(colAgents, false, mode, true),
				...groupAgents.map(this.endGroup),
			]);
		}

		handleStage(stage) {
			this.latestLine = stage.ln;
			try {
				const handler = this.stageHandlers[stage.type];
				if(!handler) {
					throw new Error('Unknown command: ' + stage.type);
				}
				handler(stage);
			} catch(e) {
				if(typeof e === 'object' && e.message) {
					throw new Error(e.message + ' at line ' + (stage.ln + 1));
				}
			}
		}

		generate({stages, meta = {}}) {
			this.agentStates.clear();
			this.markers.clear();
			this.agentAliases.clear();
			this.activeGroups.clear();
			this.agents.length = 0;
			this.blockCount = 0;
			this.nesting.length = 0;
			this.labelPattern = [{token: 'label'}];
			const globals = this.beginNested('global', '', '', 0);

			stages.forEach(this.handleStage);

			if(this.nesting.length !== 1) {
				throw new Error(
					'Unterminated section at line ' +
					(this.currentSection.header.ln + 1)
				);
			}
			if(this.activeGroups.size > 0) {
				throw new Error('Unterminated group');
			}

			const terminators = meta.terminators || 'none';

			this.addParallelStages([
				this.setAgentHighlight(this.agents, false),
				this.setAgentVis(this.agents, false, terminators),
			]);

			addBounds(
				this.agents,
				this.currentNest.leftAgent,
				this.currentNest.rightAgent
			);
			optimiseStages(globals.stages);
			swapFirstBegin(globals.stages, meta.headers || 'box');

			return {
				meta: {
					title: meta.title,
					theme: meta.theme,
				},
				agents: this.agents.slice(),
				stages: globals.stages,
			};
		}
	};
});

define('svg/SVGUtilities',[],() => {
	'use strict';

	const NS = 'http://www.w3.org/2000/svg';

	function makeText(text = '') {
		return document.createTextNode(text);
	}

	function make(type, attrs = {}) {
		const o = document.createElementNS(NS, type);
		for(let k in attrs) {
			if(attrs.hasOwnProperty(k)) {
				o.setAttribute(k, attrs[k]);
			}
		}
		return o;
	}

	function makeContainer(attrs = {}) {
		return make('svg', Object.assign({
			'xmlns': NS,
			'version': '1.1',
		}, attrs));
	}

	function empty(node) {
		while(node.childNodes.length > 0) {
			node.removeChild(node.lastChild);
		}
	}

	return {
		makeText,
		make,
		makeContainer,
		empty,
	};
});

define('svg/SVGTextBlock',['./SVGUtilities'], (svg) => {
	'use strict';

	// Thanks, https://stackoverflow.com/a/9851769/1180785
	const firefox = (typeof window.InstallTrigger !== 'undefined');

	function fontDetails(attrs) {
		const size = Number(attrs['font-size']);
		const lineHeight = size * (Number(attrs['line-height']) || 1);
		return {
			size,
			lineHeight,
		};
	}

	function merge(state, newState) {
		for(let k in state) {
			if(state.hasOwnProperty(k)) {
				if(newState[k] !== null && newState[k] !== undefined) {
					state[k] = newState[k];
				}
			}
		}
	}

	class SVGTextBlock {
		constructor(container, initialState = {}) {
			this.container = container;
			this.state = {
				attrs: {},
				text: '',
				x: 0,
				y: 0,
			};
			this.width = 0;
			this.height = 0;
			this.nodes = [];
			this.set(initialState);
		}

		_rebuildNodes(count) {
			if(count > this.nodes.length) {
				const attrs = Object.assign({
					'x': this.state.x,
				}, this.state.attrs);

				while(this.nodes.length < count) {
					const element = svg.make('text', attrs);
					const text = svg.makeText();
					element.appendChild(text);
					this.container.appendChild(element);
					this.nodes.push({element, text});
				}
			} else {
				while(this.nodes.length > count) {
					const {element} = this.nodes.pop();
					this.container.removeChild(element);
				}
			}
		}

		_reset() {
			this._rebuildNodes(0);
			this.width = 0;
			this.height = 0;
		}

		_renderText() {
			if(!this.state.text) {
				this._reset();
				return;
			}

			const lines = this.state.text.split('\n');
			this._rebuildNodes(lines.length);

			let maxWidth = 0;
			this.nodes.forEach(({text, element}, i) => {
				if(text.nodeValue !== lines[i]) {
					text.nodeValue = lines[i];
				}
				maxWidth = Math.max(maxWidth, element.getComputedTextLength());
			});
			this.width = maxWidth;
		}

		_updateX() {
			this.nodes.forEach(({element}) => {
				element.setAttribute('x', this.state.x);
			});
		}

		_updateY() {
			const {size, lineHeight} = fontDetails(this.state.attrs);
			this.nodes.forEach(({element}, i) => {
				element.setAttribute('y', this.state.y + i * lineHeight + size);
			});
			this.height = lineHeight * this.nodes.length;
		}

		firstLine() {
			if(this.nodes.length > 0) {
				return this.nodes[0].element;
			} else {
				return null;
			}
		}

		set(newState) {
			const oldState = Object.assign({}, this.state);
			merge(this.state, newState);

			if(this.state.attrs !== oldState.attrs) {
				this._reset();
				oldState.text = '';
			}

			const oldNodes = this.nodes.length;

			if(this.state.text !== oldState.text) {
				this._renderText();
			}

			if(this.state.x !== oldState.x) {
				this._updateX();
			}

			if(this.state.y !== oldState.y || this.nodes.length !== oldNodes) {
				this._updateY();
			}
		}
	}

	class SizeTester {
		constructor(container) {
			this.testers = svg.make('g', {
				// Firefox fails to measure non-displayed text
				'display': firefox ? 'block' : 'none',
				'visibility': 'hidden',
			});
			this.container = container;
			this.cache = new Map();
		}

		measure(attrs, content) {
			if(!content) {
				return {width: 0, height: 0};
			}

			let tester = this.cache.get(attrs);
			if(!tester) {
				const text = svg.makeText();
				const node = svg.make('text', attrs);
				node.appendChild(text);
				this.testers.appendChild(node);
				tester = {text, node};
				this.cache.set(attrs, tester);
			}

			if(!this.testers.parentNode) {
				this.container.appendChild(this.testers);
			}

			const lines = content.split('\n');
			let width = 0;
			lines.forEach((line) => {
				tester.text.nodeValue = line;
				width = Math.max(width, tester.node.getComputedTextLength());
			});

			return {
				width,
				height: lines.length * fontDetails(attrs).lineHeight,
			};
		}

		measureHeight(attrs, content) {
			if(!content) {
				return 0;
			}

			const lines = content.split('\n');
			return lines.length * fontDetails(attrs).lineHeight;
		}

		resetCache() {
			svg.empty(this.testers);
			this.cache.clear();
		}

		detach() {
			if(this.testers.parentNode) {
				this.container.removeChild(this.testers);
			}
		}
	}

	SVGTextBlock.SizeTester = SizeTester;

	return SVGTextBlock;
});

define('svg/SVGShapes',['./SVGUtilities', './SVGTextBlock'], (svg, SVGTextBlock) => {
	'use strict';

	function renderBox(attrs, position) {
		return svg.make('rect', Object.assign({}, position, attrs));
	}

	function renderNote(attrs, flickAttrs, position) {
		const g = svg.make('g');
		const x0 = position.x;
		const x1 = position.x + position.width;
		const y0 = position.y;
		const y1 = position.y + position.height;
		const flick = 7;

		g.appendChild(svg.make('polygon', Object.assign({
			'points': (
				x0 + ' ' + y0 + ' ' +
				(x1 - flick) + ' ' + y0 + ' ' +
				x1 + ' ' + (y0 + flick) + ' ' +
				x1 + ' ' + y1 + ' ' +
				x0 + ' ' + y1
			),
		}, attrs)));

		g.appendChild(svg.make('polyline', Object.assign({
			'points': (
				(x1 - flick) + ' ' + y0 + ' ' +
				(x1 - flick) + ' ' + (y0 + flick) + ' ' +
				x1 + ' ' + (y0 + flick)
			),
		}, flickAttrs)));

		return g;
	}

	function renderBoxedText(text, {
		x,
		y,
		padding,
		boxAttrs,
		labelAttrs,
		boxLayer,
		labelLayer,
		boxRenderer = null,
		SVGTextBlockClass = SVGTextBlock,
	}) {
		if(!text) {
			return {width: 0, height: 0, label: null, box: null};
		}

		let shift = 0;
		let anchorX = x;
		switch(labelAttrs['text-anchor']) {
		case 'middle':
			shift = 0.5;
			anchorX += (padding.left - padding.right) / 2;
			break;
		case 'end':
			shift = 1;
			anchorX -= padding.right;
			break;
		default:
			shift = 0;
			anchorX += padding.left;
			break;
		}

		const label = new SVGTextBlockClass(labelLayer, {
			attrs: labelAttrs,
			text,
			x: anchorX,
			y: y + padding.top,
		});

		const width = (label.width + padding.left + padding.right);
		const height = (label.height + padding.top + padding.bottom);

		let box = null;
		if(boxRenderer) {
			box = boxRenderer({
				'x': anchorX - label.width * shift - padding.left,
				'y': y,
				'width': width,
				'height': height,
			});
		} else {
			box = renderBox(boxAttrs, {
				'x': anchorX - label.width * shift - padding.left,
				'y': y,
				'width': width,
				'height': height,
			});
		}

		if(boxLayer === labelLayer) {
			boxLayer.insertBefore(box, label.firstLine());
		} else {
			boxLayer.appendChild(box);
		}

		return {width, height, label, box};
	}

	return {
		renderBox,
		renderNote,
		renderBoxedText,
		TextBlock: SVGTextBlock,
	};
});

define('sequence/components/BaseComponent',[],() => {
	'use strict';

	class BaseComponent {
		makeState(/*state*/) {
		}

		resetState(state) {
			this.makeState(state);
		}

		separationPre(/*stage, {
			theme,
			agentInfos,
			visibleAgents,
			textSizer,
			addSpacing,
			addSeparation,
			components,
		}*/) {
		}

		separation(/*stage, {
			theme,
			agentInfos,
			visibleAgents,
			textSizer,
			addSpacing,
			addSeparation,
			components,
		}*/) {
		}

		renderPre(/*stage, {
			theme,
			agentInfos,
			textSizer,
			state,
			components,
		}*/) {
			// return {topShift, agentNames, asynchronousY}
		}

		render(/*stage, {
			topY,
			primaryY,
			blockLayer,
			sectionLayer,
			shapeLayer,
			labelLayer,
			theme,
			agentInfos,
			textSizer,
			SVGTextBlockClass,
			addDef,
			makeRegion,
			state,
			components,
		}*/) {
			// return bottom Y coordinate
		}
	}

	BaseComponent.cleanRenderPreResult = ({
		topShift = 0,
		agentNames = [],
		asynchronousY = null,
	} = {}, currentY = null) => {
		return {
			topShift,
			agentNames,
			asynchronousY: (asynchronousY !== null) ? asynchronousY : currentY,
		};
	};

	const components = new Map();

	BaseComponent.register = (name, component) => {
		components.set(name, component);
	};

	BaseComponent.getComponents = () => {
		return components;
	};

	return BaseComponent;
});

define('sequence/components/Block',[
	'./BaseComponent',
	'core/ArrayUtilities',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseComponent,
	array,
	svg,
	SVGShapes
) => {
	'use strict';

	class BlockSplit extends BaseComponent {
		separation({left, right, mode, label}, env) {
			const config = env.theme.block.section;
			const width = (
				env.textSizer.measure(config.mode.labelAttrs, mode).width +
				config.mode.padding.left +
				config.mode.padding.right +
				env.textSizer.measure(config.label.labelAttrs, label).width +
				config.label.padding.left +
				config.label.padding.right
			);
			env.addSeparation(left, right, width);
		}

		renderPre({left, right}) {
			return {
				agentNames: [left, right],
			};
		}

		render({left, right, mode, label}, env, first = false) {
			const config = env.theme.block;
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);

			let y = env.primaryY;

			if(!first) {
				y += config.section.padding.bottom;
				env.sectionLayer.appendChild(svg.make('line', Object.assign({
					'x1': agentInfoL.x,
					'y1': y,
					'x2': agentInfoR.x,
					'y2': y,
				}, config.separator.attrs)));
			}

			const modeRender = SVGShapes.renderBoxedText(mode, {
				x: agentInfoL.x,
				y,
				padding: config.section.mode.padding,
				boxAttrs: config.section.mode.boxAttrs,
				labelAttrs: config.section.mode.labelAttrs,
				boxLayer: env.blockLayer,
				labelLayer: env.labelLayer,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const labelRender = SVGShapes.renderBoxedText(label, {
				x: agentInfoL.x + modeRender.width,
				y,
				padding: config.section.label.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.section.label.labelAttrs,
				boxLayer: env.maskLayer,
				labelLayer: env.labelLayer,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			return y + (
				Math.max(modeRender.height, labelRender.height) +
				config.section.padding.top
			);
		}
	}

	class BlockBegin extends BlockSplit {
		makeState(state) {
			state.blocks = new Map();
		}

		resetState(state) {
			state.blocks.clear();
		}

		separation(stage, env) {
			array.mergeSets(env.visibleAgents, [stage.left, stage.right]);
			super.separation(stage, env);
		}

		renderPre({left, right}, env) {
			return {
				agentNames: [left, right],
				topShift: env.theme.block.margin.top,
			};
		}

		render(stage, env) {
			env.state.blocks.set(stage.left, {
				mode: stage.mode,
				startY: env.primaryY,
			});
			return super.render(stage, env, true);
		}
	}

	class BlockEnd extends BaseComponent {
		separation({left, right}, env) {
			array.removeAll(env.visibleAgents, [left, right]);
		}

		renderPre({left, right}, env) {
			return {
				agentNames: [left, right],
				topShift: env.theme.block.section.padding.bottom,
			};
		}

		render({left, right}, env) {
			const config = env.theme.block;

			const {startY, mode} = env.state.blocks.get(left);

			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);
			const configMode = config.modes[mode] || config.modes[''];
			env.blockLayer.appendChild(svg.make('rect', Object.assign({
				'x': agentInfoL.x,
				'y': startY,
				'width': agentInfoR.x - agentInfoL.x,
				'height': env.primaryY - startY,
			}, configMode.boxAttrs)));

			return env.primaryY + config.margin.bottom + env.theme.actionMargin;
		}
	}

	BaseComponent.register('block begin', new BlockBegin());
	BaseComponent.register('block split', new BlockSplit());
	BaseComponent.register('block end', new BlockEnd());

	return {
		BlockBegin,
		BlockSplit,
		BlockEnd,
	};
});

define('sequence/components/Parallel',[
	'./BaseComponent',
	'core/ArrayUtilities',
], (
	BaseComponent,
	array
) => {
	'use strict';

	function nullableMax(a = null, b = null) {
		if(a === null) {
			return b;
		}
		if(b === null) {
			return a;
		}
		return Math.max(a, b);
	}

	function mergeResults(a, b) {
		array.mergeSets(a.agentNames, b.agentNames);
		return {
			topShift: Math.max(a.topShift, b.topShift),
			agentNames: a.agentNames,
			asynchronousY: nullableMax(a.asynchronousY, b.asynchronousY),
		};
	}

	class Parallel extends BaseComponent {
		separationPre(stage, env) {
			stage.stages.forEach((subStage) => {
				env.components.get(subStage.type).separationPre(subStage, env);
			});
		}

		separation(stage, env) {
			stage.stages.forEach((subStage) => {
				env.components.get(subStage.type).separation(subStage, env);
			});
		}

		renderPre(stage, env) {
			const baseResults = {
				topShift: 0,
				agentNames: [],
				asynchronousY: null,
			};

			return stage.stages.map((subStage) => {
				const component = env.components.get(subStage.type);
				const subResult = component.renderPre(subStage, env);
				return BaseComponent.cleanRenderPreResult(subResult);
			}).reduce(mergeResults, baseResults);
		}

		render(stage, env) {
			const originalMakeRegion = env.makeRegion;
			let bottomY = 0;
			stage.stages.forEach((subStage) => {
				env.makeRegion = (o, stageOverride = null) => {
					return originalMakeRegion(o, stageOverride || subStage);
				};

				const component = env.components.get(subStage.type);
				const baseY = component.render(subStage, env) || 0;
				bottomY = Math.max(bottomY, baseY);
			});
			env.makeRegion = originalMakeRegion;
			return bottomY;
		}
	}

	BaseComponent.register('parallel', new Parallel());

	return Parallel;
});

define('sequence/components/Marker',['./BaseComponent'], (BaseComponent) => {
	'use strict';

	class Mark extends BaseComponent {
		makeState(state) {
			state.marks = new Map();
		}

		resetState(state) {
			state.marks.clear();
		}

		render({name}, {topY, state}) {
			state.marks.set(name, topY);
		}
	}

	class Async extends BaseComponent {
		renderPre({target}, {state}) {
			let y = 0;
			if(target && state.marks) {
				y = state.marks.get(target) || 0;
			}
			return {
				asynchronousY: y,
			};
		}
	}

	BaseComponent.register('mark', new Mark());
	BaseComponent.register('async', new Async());

	return {
		Mark,
		Async,
	};
});

define('sequence/components/AgentCap',[
	'./BaseComponent',
	'core/ArrayUtilities',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseComponent,
	array,
	svg,
	SVGShapes
) => {
	'use strict';

	class CapBox {
		separation({label}, env) {
			const config = env.theme.agentCap.box;
			const width = (
				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right
			);

			return {
				left: width / 2,
				right: width / 2,
				radius: width / 2,
			};
		}

		topShift({label}, env) {
			const config = env.theme.agentCap.box;
			const height = (
				env.textSizer.measureHeight(config.labelAttrs, label) +
				config.padding.top +
				config.padding.bottom
			);
			return Math.max(0, height - config.arrowBottom);
		}

		render(y, {x, label}, env) {
			const config = env.theme.agentCap.box;
			const clickable = env.makeRegion();
			const {width, height} = SVGShapes.renderBoxedText(label, {
				x,
				y,
				padding: config.padding,
				boxAttrs: config.boxAttrs,
				labelAttrs: config.labelAttrs,
				boxLayer: env.shapeLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});
			clickable.insertBefore(svg.make('rect', {
				'x': x - width / 2,
				'y': y,
				'width': width,
				'height': height,
				'fill': 'transparent',
			}), clickable.firstChild);

			return {
				lineTop: 0,
				lineBottom: height,
				height,
			};
		}
	}

	class CapCross {
		separation(agentInfo, env) {
			const config = env.theme.agentCap.cross;
			return {
				left: config.size / 2,
				right: config.size / 2,
				radius: 0,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.cross;
			return config.size / 2;
		}

		render(y, {x}, env) {
			const config = env.theme.agentCap.cross;
			const d = config.size / 2;

			env.shapeLayer.appendChild(svg.make('path', Object.assign({
				'd': (
					'M ' + (x - d) + ' ' + y +
					' L ' + (x + d) + ' ' + (y + d * 2) +
					' M ' + (x + d) + ' ' + y +
					' L ' + (x - d) + ' ' + (y + d * 2)
				),
			}, config.attrs)));

			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - d,
				'y': y,
				'width': d * 2,
				'height': d * 2,
				'fill': 'transparent',
			}));

			return {
				lineTop: d,
				lineBottom: d,
				height: d * 2,
			};
		}
	}

	class CapBar {
		separation({label}, env) {
			const config = env.theme.agentCap.box;
			const width = (
				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right
			);

			return {
				left: width / 2,
				right: width / 2,
				radius: width / 2,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.bar;
			return config.attrs.height / 2;
		}

		render(y, {x, label}, env) {
			const configB = env.theme.agentCap.box;
			const config = env.theme.agentCap.bar;
			const width = (
				env.textSizer.measure(configB.labelAttrs, label).width +
				configB.padding.left +
				configB.padding.right
			);

			env.shapeLayer.appendChild(svg.make('rect', Object.assign({
				'x': x - width / 2,
				'y': y,
				'width': width,
			}, config.attrs)));

			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - width / 2,
				'y': y,
				'width': width,
				'height': config.attrs.height,
				'fill': 'transparent',
			}));

			return {
				lineTop: 0,
				lineBottom: config.attrs.height,
				height: config.attrs.height,
			};
		}
	}

	class CapFade {
		separation({currentRad}) {
			return {
				left: currentRad,
				right: currentRad,
				radius: currentRad,
			};
		}

		topShift(agentInfo, env, isBegin) {
			const config = env.theme.agentCap.fade;
			return isBegin ? config.height : 0;
		}

		render(y, {x, label}, env, isBegin) {
			const config = env.theme.agentCap.fade;

			const gradID = env.addDef(isBegin ? 'FadeIn' : 'FadeOut', () => {
				const grad = svg.make('linearGradient', {
					'x1': '0%',
					'y1': isBegin ? '100%' : '0%',
					'x2': '0%',
					'y2': isBegin ? '0%' : '100%',
				});
				grad.appendChild(svg.make('stop', {
					'offset': (100 * 1 / 12) + '%',
					'stop-color': '#FFFFFF',
				}));
				grad.appendChild(svg.make('stop', {
					'offset': (100 * 11 / 12) + '%',
					'stop-color': '#000000',
				}));
				return grad;
			});

			env.maskLayer.appendChild(svg.make('rect', {
				'x': x - config.width / 2,
				'y': y - config.height * 0.1,
				'width': config.width,
				'height': config.height * 1.2,
				'fill': 'url(#' + gradID + ')',
			}));

			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - config.width / 2,
				'y': y,
				'width': config.width,
				'height': config.height,
				'fill': 'transparent',
			}));

			return {
				lineTop: config.height,
				lineBottom: 0,
				height: config.height,
			};
		}
	}

	class CapNone {
		separation({currentRad}) {
			return {
				left: currentRad,
				right: currentRad,
				radius: currentRad,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.none;
			return config.height;
		}

		render(y, {x}, env) {
			const config = env.theme.agentCap.none;

			const w = 10;
			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - w / 2,
				'y': y,
				'width': w,
				'height': config.height,
				'fill': 'transparent',
			}));

			return {
				lineTop: config.height,
				lineBottom: 0,
				height: config.height,
			};
		}
	}

	const AGENT_CAPS = {
		'box': new CapBox(),
		'cross': new CapCross(),
		'bar': new CapBar(),
		'fade': new CapFade(),
		'none': new CapNone(),
	};

	class AgentCap extends BaseComponent {
		constructor(begin) {
			super();
			this.begin = begin;
		}

		separationPre({mode, agentNames}, env) {
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				const cap = AGENT_CAPS[mode];
				const sep = cap.separation(agentInfo, env, this.begin);
				env.addSpacing(name, sep);
				agentInfo.currentMaxRad = Math.max(
					agentInfo.currentMaxRad,
					sep.radius
				);
			});
		}

		separation({mode, agentNames}, env) {
			if(this.begin) {
				array.mergeSets(env.visibleAgents, agentNames);
			} else {
				array.removeAll(env.visibleAgents, agentNames);
			}
		}

		renderPre({mode, agentNames}, env) {
			let maxTopShift = 0;
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				const cap = AGENT_CAPS[mode];
				const topShift = cap.topShift(agentInfo, env, this.begin);
				maxTopShift = Math.max(maxTopShift, topShift);

				const r = cap.separation(agentInfo, env, this.begin).radius;
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
			return {
				agentNames,
				topShift: maxTopShift,
			};
		}

		render({mode, agentNames}, env) {
			let maxEnd = 0;
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				const cap = AGENT_CAPS[mode];
				const topShift = cap.topShift(agentInfo, env, this.begin);
				const y0 = env.primaryY - topShift;
				const shifts = cap.render(
					y0,
					agentInfo,
					env,
					this.begin
				);
				maxEnd = Math.max(maxEnd, y0 + shifts.height);
				if(this.begin) {
					env.drawAgentLine(name, y0 + shifts.lineBottom);
				} else {
					env.drawAgentLine(name, y0 + shifts.lineTop, true);
				}
			});
			return maxEnd + env.theme.actionMargin;
		}
	}

	BaseComponent.register('agent begin', new AgentCap(true));
	BaseComponent.register('agent end', new AgentCap(false));

	return AgentCap;
});

define('sequence/components/AgentHighlight',['./BaseComponent'], (BaseComponent) => {
	'use strict';

	class AgentHighlight extends BaseComponent {
		radius(highlighted, env) {
			return highlighted ? env.theme.agentLineHighlightRadius : 0;
		}

		separationPre({agentNames, highlighted}, env) {
			const r = this.radius(highlighted, env);
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				agentInfo.currentRad = r;
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		renderPre({agentNames, highlighted}, env) {
			const r = this.radius(highlighted, env);
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		render({agentNames, highlighted}, env) {
			const r = this.radius(highlighted, env);
			agentNames.forEach((name) => {
				env.drawAgentLine(name, env.primaryY);
				env.agentInfos.get(name).currentRad = r;
			});
			return env.primaryY + env.theme.actionMargin;
		}
	}

	BaseComponent.register('agent highlight', new AgentHighlight());

	return AgentHighlight;
});

define('sequence/components/Connect',[
	'./BaseComponent',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseComponent,
	svg,
	SVGShapes
) => {
	'use strict';

	function drawHorizontalArrowHead(container, {x, y, dx, dy, attrs}) {
		container.appendChild(svg.make(
			attrs.fill === 'none' ? 'polyline' : 'polygon',
			Object.assign({
				'points': (
					(x + dx) + ' ' + (y - dy) + ' ' +
					x + ' ' + y + ' ' +
					(x + dx) + ' ' + (y + dy)
				),
			}, attrs)
		));
	}

	class Arrowhead {
		constructor(propName) {
			this.propName = propName;
		}

		getConfig(theme) {
			return theme.connect.arrow[this.propName];
		}

		short(theme) {
			const arrow = this.getConfig(theme);
			const join = arrow.attrs['stroke-linejoin'] || 'miter';
			const t = arrow.attrs['stroke-width'] * 0.5;
			const lineStroke = theme.agentLineAttrs['stroke-width'] * 0.5;
			if(join === 'round') {
				return lineStroke + t;
			} else {
				const h = arrow.height / 2;
				const w = arrow.width;
				const arrowDistance = t * Math.sqrt((w * w) / (h * h) + 1);
				return lineStroke + arrowDistance;
			}
		}

		render(layer, theme, {x, y, dir}) {
			const config = this.getConfig(theme);
			drawHorizontalArrowHead(layer, {
				x: x + this.short(theme) * dir,
				y,
				dx: config.width * dir,
				dy: config.height / 2,
				attrs: config.attrs,
			});
		}

		width(theme) {
			return this.short(theme) + this.getConfig(theme).width;
		}

		height(theme) {
			return this.getConfig(theme).height;
		}

		lineGap(theme, lineAttrs) {
			const arrow = this.getConfig(theme);
			const short = this.short(theme);
			if(arrow.attrs.fill === 'none') {
				const h = arrow.height / 2;
				const w = arrow.width;
				const safe = short + (lineAttrs['stroke-width'] / 2) * (w / h);
				return (short + safe) / 2;
			} else {
				return short + arrow.width / 2;
			}
		}
	}

	const ARROWHEADS = [
		{
			render: () => {},
			width: () => 0,
			height: () => 0,
			lineGap: () => 0,
		},
		new Arrowhead('single'),
		new Arrowhead('double'),
	];

	function makeWavyLineHeights(height) {
		return [
			0,
			-height * 2 / 3,
			-height,
			-height * 2 / 3,
			0,
			height * 2 / 3,
			height,
			height * 2 / 3,
		];
	}

	class ConnectingLine {
		renderFlat(container, {x1, x2, y}, attrs) {
			const ww = attrs['wave-width'];
			const hh = attrs['wave-height'];

			if(!ww || !hh) {
				container.appendChild(svg.make('line', Object.assign({
					'x1': x1,
					'y1': y,
					'x2': x2,
					'y2': y,
				}, attrs)));
				return;
			}

			const heights = makeWavyLineHeights(hh);
			const dw = ww / heights.length;
			let p = 0;

			let points = '';
			for(let x = x1; x + dw <= x2; x += dw) {
				points += (
					x + ' ' +
					(y + heights[(p ++) % heights.length]) + ' '
				);
			}
			points += x2 + ' ' + y;
			container.appendChild(svg.make('polyline', Object.assign({
				points,
			}, attrs)));
		}

		renderRev(container, {xL1, xL2, y1, y2, xR}, attrs) {
			const r = (y2 - y1) / 2;
			const ww = attrs['wave-width'];
			const hh = attrs['wave-height'];

			if(!ww || !hh) {
				container.appendChild(svg.make('path', Object.assign({
					'd': (
						'M ' + xL1 + ' ' + y1 +
						' L ' + xR + ' ' + y1 +
						' A ' + r + ' ' + r + ' 0 0 1 ' + xR + ' ' + y2 +
						' L ' + xL2 + ' ' + y2
					),
				}, attrs)));
				return;
			}

			const heights = makeWavyLineHeights(hh);
			const dw = ww / heights.length;
			let p = 0;

			let points = '';
			for(let x = xL1; x + dw <= xR; x += dw) {
				points += (
					x + ' ' +
					(y1 + heights[(p ++) % heights.length]) + ' '
				);
			}

			const ym = (y1 + y2) / 2;
			for(let t = 0; t + dw / r <= Math.PI; t += dw / r) {
				const h = heights[(p ++) % heights.length];
				points += (
					(xR + Math.sin(t) * (r - h)) + ' ' +
					(ym - Math.cos(t) * (r - h)) + ' '
				);
			}

			for(let x = xR; x - dw >= xL2; x -= dw) {
				points += (
					x + ' ' +
					(y2 - heights[(p ++) % heights.length]) + ' '
				);
			}

			points += xL2 + ' ' + y2;
			container.appendChild(svg.make('polyline', Object.assign({
				points,
			}, attrs)));
		}
	}

	const CONNECTING_LINE = new ConnectingLine();

	class Connect extends BaseComponent {
		separation({label, agentNames, options}, env) {
			const config = env.theme.connect;

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			let labelWidth = (
				env.textSizer.measure(config.label.attrs, label).width
			);
			if(labelWidth > 0) {
				labelWidth += config.label.padding * 2;
			}

			const info1 = env.agentInfos.get(agentNames[0]);
			if(agentNames[0] === agentNames[1]) {
				env.addSpacing(agentNames[0], {
					left: 0,
					right: (
						info1.currentMaxRad +
						Math.max(
							labelWidth + lArrow.width(env.theme),
							rArrow.width(env.theme)
						) +
						config.loopbackRadius
					),
				});
			} else {
				const info2 = env.agentInfos.get(agentNames[1]);
				env.addSeparation(
					agentNames[0],
					agentNames[1],

					info1.currentMaxRad +
					info2.currentMaxRad +
					labelWidth +
					Math.max(
						lArrow.width(env.theme),
						rArrow.width(env.theme)
					) * 2
				);
			}
		}

		renderSelfConnect({label, agentNames, options}, env) {
			/* jshint -W071 */ // TODO: find appropriate abstractions
			const config = env.theme.connect;
			const from = env.agentInfos.get(agentNames[0]);

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const height = label ? (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			) : 0;

			const lineX = from.x + from.currentMaxRad;
			const y0 = env.primaryY;
			const x0 = (
				lineX +
				lArrow.width(env.theme) +
				(label ? config.label.padding : 0)
			);

			const clickable = env.makeRegion();

			const renderedText = SVGShapes.renderBoxedText(label, {
				x: x0 - config.mask.padding.left,
				y: y0 - height + config.label.margin.top,
				padding: config.mask.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.label.loopbackAttrs,
				boxLayer: env.maskLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});
			const labelW = (label ? (
				renderedText.width +
				config.label.padding -
				config.mask.padding.left -
				config.mask.padding.right
			) : 0);
			const r = config.loopbackRadius;
			const x1 = Math.max(lineX + rArrow.width(env.theme), x0 + labelW);
			const y1 = y0 + r * 2;

			const lineAttrs = config.lineAttrs[options.line];
			CONNECTING_LINE.renderRev(env.shapeLayer, {
				xL1: lineX + lArrow.lineGap(env.theme, lineAttrs),
				xL2: lineX + rArrow.lineGap(env.theme, lineAttrs),
				y1: y0,
				y2: y1,
				xR: x1,
			}, lineAttrs);

			lArrow.render(env.shapeLayer, env.theme, {x: lineX, y: y0, dir: 1});
			rArrow.render(env.shapeLayer, env.theme, {x: lineX, y: y1, dir: 1});

			const raise = Math.max(height, lArrow.height(env.theme) / 2);
			const arrowDip = rArrow.height(env.theme) / 2;

			clickable.insertBefore(svg.make('rect', {
				'x': lineX,
				'y': y0 - raise,
				'width': x1 + r - lineX,
				'height': raise + r * 2 + arrowDip,
				'fill': 'transparent',
			}), clickable.firstChild);

			return y1 + Math.max(
				arrowDip + env.theme.minActionMargin,
				env.theme.actionMargin
			);
		}

		renderSimpleConnect({label, agentNames, options}, env) {
			const config = env.theme.connect;
			const from = env.agentInfos.get(agentNames[0]);
			const to = env.agentInfos.get(agentNames[1]);

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const dir = (from.x < to.x) ? 1 : -1;

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			const x0 = from.x + from.currentMaxRad * dir;
			const x1 = to.x - to.currentMaxRad * dir;
			const y = env.primaryY;

			const clickable = env.makeRegion();

			SVGShapes.renderBoxedText(label, {
				x: (x0 + x1) / 2,
				y: y - height + config.label.margin.top,
				padding: config.mask.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.label.attrs,
				boxLayer: env.maskLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const lineAttrs = config.lineAttrs[options.line];
			CONNECTING_LINE.renderFlat(env.shapeLayer, {
				x1: x0 + lArrow.lineGap(env.theme, lineAttrs) * dir,
				x2: x1 - rArrow.lineGap(env.theme, lineAttrs) * dir,
				y,
			}, lineAttrs);

			lArrow.render(env.shapeLayer, env.theme, {x: x0, y, dir});
			rArrow.render(env.shapeLayer, env.theme, {x: x1, y, dir: -dir});

			const arrowSpread = Math.max(
				lArrow.height(env.theme),
				rArrow.height(env.theme)
			) / 2;

			clickable.insertBefore(svg.make('rect', {
				'x': Math.min(x0, x1),
				'y': y - Math.max(height, arrowSpread),
				'width': Math.abs(x1 - x0),
				'height': Math.max(height, arrowSpread) + arrowSpread,
				'fill': 'transparent',
			}), clickable.firstChild);

			return y + Math.max(
				arrowSpread + env.theme.minActionMargin,
				env.theme.actionMargin
			);
		}

		renderPre({label, agentNames, options}, env) {
			const config = env.theme.connect;

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			let arrowH = lArrow.height(env.theme);
			if(agentNames[0] !== agentNames[1]) {
				arrowH = Math.max(arrowH, rArrow.height(env.theme));
			}

			return {
				agentNames,
				topShift: Math.max(arrowH / 2, height),
			};
		}

		render(stage, env) {
			if(stage.agentNames[0] === stage.agentNames[1]) {
				return this.renderSelfConnect(stage, env);
			} else {
				return this.renderSimpleConnect(stage, env);
			}
		}
	}

	BaseComponent.register('connect', new Connect());

	return Connect;
});

define('sequence/components/Note',['./BaseComponent', 'svg/SVGUtilities'], (BaseComponent, svg) => {
	'use strict';

	function findExtremes(agentInfos, agentNames) {
		let min = null;
		let max = null;
		agentNames.forEach((name) => {
			const info = agentInfos.get(name);
			if(min === null || info.index < min.index) {
				min = info;
			}
			if(max === null || info.index > max.index) {
				max = info;
			}
		});
		return {
			left: min.label,
			right: max.label,
		};
	}

	class NoteComponent extends BaseComponent {
		renderPre({agentNames}) {
			return {agentNames};
		}

		renderNote({
			xMid = null,
			x0 = null,
			x1 = null,
			anchor,
			mode,
			label,
		}, env) {
			const config = env.theme.note[mode];

			const clickable = env.makeRegion();

			const y = env.topY + config.margin.top + config.padding.top;
			const labelNode = new env.SVGTextBlockClass(clickable, {
				attrs: config.labelAttrs,
				text: label,
				y,
			});

			const fullW = (
				labelNode.width +
				config.padding.left +
				config.padding.right
			);
			const fullH = (
				config.padding.top +
				labelNode.height +
				config.padding.bottom
			);
			if(x0 === null && xMid !== null) {
				x0 = xMid - fullW / 2;
			}
			if(x1 === null && x0 !== null) {
				x1 = x0 + fullW;
			} else if(x0 === null) {
				x0 = x1 - fullW;
			}
			switch(config.labelAttrs['text-anchor']) {
			case 'middle':
				labelNode.set({
					x: (
						x0 + config.padding.left +
						x1 - config.padding.right
					) / 2,
					y,
				});
				break;
			case 'end':
				labelNode.set({x: x1 - config.padding.right, y});
				break;
			default:
				labelNode.set({x: x0 + config.padding.left, y});
				break;
			}

			env.shapeLayer.appendChild(config.boxRenderer({
				x: x0,
				y: env.topY + config.margin.top,
				width: x1 - x0,
				height: fullH,
			}));

			clickable.insertBefore(svg.make('rect', {
				'x': x0,
				'y': env.topY + config.margin.top,
				'width': x1 - x0,
				'height': fullH,
				'fill': 'transparent',
			}), clickable.firstChild);

			return (
				env.topY +
				config.margin.top +
				fullH +
				config.margin.bottom +
				env.theme.actionMargin
			);
		}
	}

	class NoteOver extends NoteComponent {
		separation({agentNames, mode, label}, env) {
			const config = env.theme.note[mode];
			const width = (
				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right
			);

			const {left, right} = findExtremes(env.agentInfos, agentNames);
			const infoL = env.agentInfos.get(left);
			const infoR = env.agentInfos.get(right);
			if(infoL !== infoR) {
				const hangL = infoL.currentMaxRad + config.overlap.left;
				const hangR = infoR.currentMaxRad + config.overlap.right;

				env.addSeparation(left, right, width - hangL - hangR);

				env.addSpacing(left, {left: hangL, right: 0});
				env.addSpacing(right, {left: 0, right: hangR});
			} else {
				env.addSpacing(left, {
					left: width / 2,
					right: width / 2,
				});
			}
		}

		render({agentNames, mode, label}, env) {
			const config = env.theme.note[mode];

			const {left, right} = findExtremes(env.agentInfos, agentNames);
			const infoL = env.agentInfos.get(left);
			const infoR = env.agentInfos.get(right);
			if(infoL !== infoR) {
				return this.renderNote({
					x0: infoL.x - infoL.currentMaxRad - config.overlap.left,
					x1: infoR.x + infoR.currentMaxRad + config.overlap.right,
					anchor: 'middle',
					mode,
					label,
				}, env);
			} else {
				const xMid = infoL.x;
				return this.renderNote({
					xMid,
					anchor: 'middle',
					mode,
					label,
				}, env);
			}
		}
	}

	class NoteSide extends NoteComponent {
		constructor(isRight) {
			super();
			this.isRight = isRight;
		}

		separation({agentNames, mode, label}, env) {
			const config = env.theme.note[mode];
			const {left, right} = findExtremes(env.agentInfos, agentNames);
			const width = (
				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right +
				config.margin.left +
				config.margin.right
			);

			if(this.isRight) {
				const info = env.agentInfos.get(right);
				env.addSpacing(right, {
					left: 0,
					right: width + info.currentMaxRad,
				});
			} else {
				const info = env.agentInfos.get(left);
				env.addSpacing(left, {
					left: width + info.currentMaxRad,
					right: 0,
				});
			}
		}

		render({agentNames, mode, label}, env) {
			const config = env.theme.note[mode];
			const {left, right} = findExtremes(env.agentInfos, agentNames);
			if(this.isRight) {
				const info = env.agentInfos.get(right);
				const x0 = info.x + info.currentMaxRad + config.margin.left;
				return this.renderNote({
					x0,
					anchor: 'start',
					mode,
					label,
				}, env);
			} else {
				const info = env.agentInfos.get(left);
				const x1 = info.x - info.currentMaxRad - config.margin.right;
				return this.renderNote({
					x1,
					anchor: 'end',
					mode,
					label,
				}, env);
			}
		}
	}

	class NoteBetween extends NoteComponent {
		separation({agentNames, mode, label}, env) {
			const config = env.theme.note[mode];
			const {left, right} = findExtremes(env.agentInfos, agentNames);
			const infoL = env.agentInfos.get(left);
			const infoR = env.agentInfos.get(right);

			env.addSeparation(
				left,
				right,

				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right +
				config.margin.left +
				config.margin.right +
				infoL.currentMaxRad +
				infoR.currentMaxRad
			);
		}

		render({agentNames, mode, label}, env) {
			const {left, right} = findExtremes(env.agentInfos, agentNames);
			const infoL = env.agentInfos.get(left);
			const infoR = env.agentInfos.get(right);
			const xMid = (
				infoL.x + infoL.currentMaxRad +
				infoR.x - infoR.currentMaxRad
			) / 2;

			return this.renderNote({
				xMid,
				anchor: 'middle',
				mode,
				label,
			}, env);
		}
	}

	NoteComponent.NoteOver = NoteOver;
	NoteComponent.NoteSide = NoteSide;
	NoteComponent.NoteBetween = NoteBetween;

	BaseComponent.register('note over', new NoteOver());
	BaseComponent.register('note left', new NoteSide(false));
	BaseComponent.register('note right', new NoteSide(true));
	BaseComponent.register('note between', new NoteBetween());

	return NoteComponent;
});

/* jshint -W072 */ // Allow several required modules
define('sequence/Renderer',[
	'core/ArrayUtilities',
	'core/EventObject',
	'svg/SVGUtilities',
	'svg/SVGShapes',
	'./components/BaseComponent',
	'./components/Block',
	'./components/Parallel',
	'./components/Marker',
	'./components/AgentCap',
	'./components/AgentHighlight',
	'./components/Connect',
	'./components/Note',
], (
	array,
	EventObject,
	svg,
	SVGShapes,
	BaseComponent
) => {
	/* jshint +W072 */
	'use strict';

	function findExtremes(agentInfos, agentNames) {
		let min = null;
		let max = null;
		agentNames.forEach((name) => {
			const info = agentInfos.get(name);
			if(min === null || info.index < min.index) {
				min = info;
			}
			if(max === null || info.index > max.index) {
				max = info;
			}
		});
		return {
			left: min.label,
			right: max.label,
		};
	}

	function makeThemes(themes) {
		if(themes.length === 0) {
			throw new Error('Cannot render without a theme');
		}
		const themeMap = new Map();
		themes.forEach((theme) => {
			themeMap.set(theme.name, theme);
		});
		themeMap.set('', themes[0]);
		return themeMap;
	}

	let globalNamespace = 0;

	function parseNamespace(namespace) {
		if(namespace === null) {
			namespace = 'R' + globalNamespace;
			++ globalNamespace;
		}
		return namespace;
	}

	return class Renderer extends EventObject {
		constructor({
			themes = [],
			namespace = null,
			components = null,
			SVGTextBlockClass = SVGShapes.TextBlock,
		} = {}) {
			super();

			if(components === null) {
				components = BaseComponent.getComponents();
			}

			this.separationStage = this.separationStage.bind(this);
			this.renderStage = this.renderStage.bind(this);

			this.addSeparation = this.addSeparation.bind(this);
			this.addDef = this.addDef.bind(this);

			this.state = {};
			this.width = 0;
			this.height = 0;
			this.themes = makeThemes(themes);
			this.theme = null;
			this.namespace = parseNamespace(namespace);
			this.components = components;
			this.SVGTextBlockClass = SVGTextBlockClass;
			this.knownDefs = new Set();
			this.highlights = new Map();
			this.currentHighlight = -1;
			this.buildStaticElements();
			this.components.forEach((component) => {
				component.makeState(this.state);
			});
		}

		addTheme(theme) {
			this.themes.set(theme.name, theme);
		}

		buildStaticElements() {
			this.base = svg.makeContainer();

			this.defs = svg.make('defs');
			this.mask = svg.make('mask', {
				'id': this.namespace + 'LineMask',
				'maskUnits': 'userSpaceOnUse',
			});
			this.maskReveal = svg.make('rect', {'fill': '#FFFFFF'});
			this.agentLines = svg.make('g', {
				'mask': 'url(#' + this.namespace + 'LineMask)',
			});
			this.blocks = svg.make('g');
			this.sections = svg.make('g');
			this.actionShapes = svg.make('g');
			this.actionLabels = svg.make('g');
			this.base.appendChild(this.defs);
			this.base.appendChild(this.agentLines);
			this.base.appendChild(this.blocks);
			this.base.appendChild(this.sections);
			this.base.appendChild(this.actionShapes);
			this.base.appendChild(this.actionLabels);
			this.title = new this.SVGTextBlockClass(this.base);

			this.sizer = new this.SVGTextBlockClass.SizeTester(this.base);
		}

		addDef(name, generator) {
			const namespacedName = this.namespace + name;
			if(this.knownDefs.has(name)) {
				return namespacedName;
			}
			this.knownDefs.add(name);
			const def = generator();
			def.setAttribute('id', namespacedName);
			this.defs.appendChild(def);
			return namespacedName;
		}

		addSeparation(agentName1, agentName2, dist) {
			const info1 = this.agentInfos.get(agentName1);
			const info2 = this.agentInfos.get(agentName2);

			const d1 = info1.separations.get(agentName2) || 0;
			info1.separations.set(agentName2, Math.max(d1, dist));

			const d2 = info2.separations.get(agentName1) || 0;
			info2.separations.set(agentName1, Math.max(d2, dist));
		}

		separationStage(stage) {
			const agentSpaces = new Map();
			const agentNames = this.visibleAgents.slice();

			const addSpacing = (agentName, {left, right}) => {
				const current = agentSpaces.get(agentName);
				current.left = Math.max(current.left, left);
				current.right = Math.max(current.right, right);
			};

			this.agentInfos.forEach((agentInfo) => {
				const rad = agentInfo.currentRad;
				agentInfo.currentMaxRad = rad;
				agentSpaces.set(agentInfo.label, {left: rad, right: rad});
			});
			const env = {
				theme: this.theme,
				agentInfos: this.agentInfos,
				visibleAgents: this.visibleAgents,
				textSizer: this.sizer,
				addSpacing,
				addSeparation: this.addSeparation,
				components: this.components,
			};
			const component = this.components.get(stage.type);
			if(!component) {
				throw new Error('Unknown component: ' + stage.type);
			}
			component.separationPre(stage, env);
			component.separation(stage, env);
			array.mergeSets(agentNames, this.visibleAgents);

			agentNames.forEach((agentNameR) => {
				const infoR = this.agentInfos.get(agentNameR);
				const sepR = agentSpaces.get(agentNameR);
				infoR.maxRPad = Math.max(infoR.maxRPad, sepR.right);
				infoR.maxLPad = Math.max(infoR.maxLPad, sepR.left);
				agentNames.forEach((agentNameL) => {
					const infoL = this.agentInfos.get(agentNameL);
					if(infoL.index >= infoR.index) {
						return;
					}
					const sepL = agentSpaces.get(agentNameL);
					this.addSeparation(
						agentNameR,
						agentNameL,
						sepR.left + sepL.right + this.theme.agentMargin
					);
				});
			});
		}

		checkAgentRange(agentNames, topY = 0) {
			if(agentNames.length === 0) {
				return topY;
			}
			const {left, right} = findExtremes(this.agentInfos, agentNames);
			const leftX = this.agentInfos.get(left).x;
			const rightX = this.agentInfos.get(right).x;
			let baseY = topY;
			this.agentInfos.forEach((agentInfo) => {
				if(agentInfo.x >= leftX && agentInfo.x <= rightX) {
					baseY = Math.max(baseY, agentInfo.latestY);
				}
			});
			return baseY;
		}

		markAgentRange(agentNames, y) {
			if(agentNames.length === 0) {
				return;
			}
			const {left, right} = findExtremes(this.agentInfos, agentNames);
			const leftX = this.agentInfos.get(left).x;
			const rightX = this.agentInfos.get(right).x;
			this.agentInfos.forEach((agentInfo) => {
				if(agentInfo.x >= leftX && agentInfo.x <= rightX) {
					agentInfo.latestY = y;
				}
			});
		}

		drawAgentLine(agentInfo, toY) {
			if(
				agentInfo.latestYStart === null ||
				toY <= agentInfo.latestYStart
			) {
				return;
			}

			const r = agentInfo.currentRad;

			if(r > 0) {
				this.agentLines.appendChild(svg.make('rect', Object.assign({
					'x': agentInfo.x - r,
					'y': agentInfo.latestYStart,
					'width': r * 2,
					'height': toY - agentInfo.latestYStart,
					'class': 'agent-' + agentInfo.index + '-line',
				}, this.theme.agentLineAttrs)));
			} else {
				this.agentLines.appendChild(svg.make('line', Object.assign({
					'x1': agentInfo.x,
					'y1': agentInfo.latestYStart,
					'x2': agentInfo.x,
					'y2': toY,
					'class': 'agent-' + agentInfo.index + '-line',
				}, this.theme.agentLineAttrs)));
			}
		}

		addHighlightObject(line, o) {
			let list = this.highlights.get(line);
			if(!list) {
				list = [];
				this.highlights.set(line, list);
			}
			list.push(o);
		}

		renderStage(stage) {
			this.agentInfos.forEach((agentInfo) => {
				const rad = agentInfo.currentRad;
				agentInfo.currentMaxRad = rad;
			});

			const envPre = {
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				state: this.state,
				components: this.components,
			};
			const component = this.components.get(stage.type);
			const result = component.renderPre(stage, envPre);
			const {topShift, agentNames, asynchronousY} =
				BaseComponent.cleanRenderPreResult(result, this.currentY);

			const topY = this.checkAgentRange(agentNames, asynchronousY);

			const eventOut = () => {
				this.trigger('mouseout');
			};

			const makeRegion = (o, stageOverride = null) => {
				if(!o) {
					o = svg.make('g');
				}
				const targetStage = (stageOverride || stage);
				this.addHighlightObject(targetStage.ln, o);
				o.setAttribute('class', 'region');
				o.addEventListener('mouseenter', () => {
					this.trigger('mouseover', [targetStage]);
				});
				o.addEventListener('mouseleave', eventOut);
				o.addEventListener('click', () => {
					this.trigger('click', [targetStage]);
				});
				this.actionLabels.appendChild(o);
				return o;
			};

			const env = {
				topY,
				primaryY: topY + topShift,
				blockLayer: this.blocks,
				sectionLayer: this.sections,
				shapeLayer: this.actionShapes,
				labelLayer: this.actionLabels,
				maskLayer: this.mask,
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				SVGTextBlockClass: this.SVGTextBlockClass,
				state: this.state,
				drawAgentLine: (agentName, toY, andStop = false) => {
					const agentInfo = this.agentInfos.get(agentName);
					this.drawAgentLine(agentInfo, toY);
					agentInfo.latestYStart = andStop ? null : toY;
				},
				addDef: this.addDef,
				makeRegion,
				components: this.components,
			};

			const bottomY = Math.max(topY, component.render(stage, env) || 0);
			this.markAgentRange(agentNames, bottomY);

			this.currentY = bottomY;
		}

		positionAgents() {
			// Map guarantees insertion-order iteration
			const orderedInfos = [];
			this.agentInfos.forEach((agentInfo) => {
				let currentX = 0;
				agentInfo.separations.forEach((dist, otherAgent) => {
					const otherAgentInfo = this.agentInfos.get(otherAgent);
					if(otherAgentInfo.index < agentInfo.index) {
						currentX = Math.max(currentX, otherAgentInfo.x + dist);
					}
				});
				agentInfo.x = currentX;
				orderedInfos.push(agentInfo);
			});

			let previousInfo = {x: 0};
			orderedInfos.reverse().forEach((agentInfo) => {
				let currentX = previousInfo.x;
				previousInfo = agentInfo;
				if(!agentInfo.anchorRight) {
					return;
				}
				agentInfo.separations.forEach((dist, otherAgent) => {
					const otherAgentInfo = this.agentInfos.get(otherAgent);
					if(otherAgentInfo.index > agentInfo.index) {
						currentX = Math.min(currentX, otherAgentInfo.x - dist);
					}
				});
				agentInfo.x = currentX;
			});

			this.agentInfos.forEach(({label, x, maxRPad, maxLPad}) => {
				this.minX = Math.min(this.minX, x - maxLPad);
				this.maxX = Math.max(this.maxX, x + maxRPad);
			});
		}

		buildAgentInfos(agents, stages) {
			this.agentInfos = new Map();
			agents.forEach((agent, index) => {
				this.agentInfos.set(agent.name, {
					label: agent.name,
					anchorRight: agent.anchorRight,
					index,
					x: null,
					latestYStart: null,
					currentRad: 0,
					currentMaxRad: 0,
					latestY: 0,
					maxRPad: 0,
					maxLPad: 0,
					separations: new Map(),
				});
			});

			this.visibleAgents = ['[', ']'];
			stages.forEach(this.separationStage);

			this.positionAgents();
		}

		updateBounds(stagesHeight) {
			const cx = (this.minX + this.maxX) / 2;
			const titleY = ((this.title.height > 0) ?
				(-this.theme.titleMargin - this.title.height) : 0
			);
			this.title.set({x: cx, y: titleY});

			const halfTitleWidth = this.title.width / 2;
			const margin = this.theme.outerMargin;
			const x0 = Math.min(this.minX, cx - halfTitleWidth) - margin;
			const x1 = Math.max(this.maxX, cx + halfTitleWidth) + margin;
			const y0 = titleY - margin;
			const y1 = stagesHeight + margin;

			this.maskReveal.setAttribute('x', x0);
			this.maskReveal.setAttribute('y', y0);
			this.maskReveal.setAttribute('width', x1 - x0);
			this.maskReveal.setAttribute('height', y1 - y0);

			this.base.setAttribute('viewBox', (
				x0 + ' ' + y0 + ' ' +
				(x1 - x0) + ' ' + (y1 - y0)
			));
			this.width = (x1 - x0);
			this.height = (y1 - y0);
		}

		_reset() {
			this.knownDefs.clear();
			this.highlights.clear();
			this.currentHighlight = -1;
			svg.empty(this.defs);
			svg.empty(this.mask);
			svg.empty(this.agentLines);
			svg.empty(this.blocks);
			svg.empty(this.sections);
			svg.empty(this.actionShapes);
			svg.empty(this.actionLabels);
			this.mask.appendChild(this.maskReveal);
			this.defs.appendChild(this.mask);
			this.components.forEach((component) => {
				component.resetState(this.state);
			});
		}

		setHighlight(line = null) {
			if(line === null || !this.highlights.has(line)) {
				line = -1;
			}
			if(this.currentHighlight === line) {
				return;
			}
			if(this.currentHighlight !== -1) {
				this.highlights.get(this.currentHighlight).forEach((o) => {
					o.setAttribute('class', 'region');
				});
			}
			if(line !== -1) {
				this.highlights.get(line).forEach((o) => {
					o.setAttribute('class', 'region focus');
				});
			}
			this.currentHighlight = line;
		}

		render(sequence) {
			const prevHighlight = this.currentHighlight;
			this._reset();

			const themeName = sequence.meta.theme;
			this.theme = this.themes.get(themeName);
			if(!this.theme) {
				this.theme = this.themes.get('');
			}

			this.title.set({
				attrs: this.theme.titleAttrs,
				text: sequence.meta.title,
			});

			this.minX = 0;
			this.maxX = 0;
			this.buildAgentInfos(sequence.agents, sequence.stages);

			this.currentY = 0;
			sequence.stages.forEach(this.renderStage);
			const bottomY = this.checkAgentRange(['[', ']'], this.currentY);

			const stagesHeight = Math.max(bottomY - this.theme.actionMargin, 0);
			this.updateBounds(stagesHeight);

			this.sizer.resetCache();
			this.sizer.detach();
			this.setHighlight(prevHighlight);
		}

		getThemeNames() {
			return (Array.from(this.themes.keys())
				.filter((name) => (name !== ''))
			);
		}

		getThemes() {
			return this.getThemeNames().map((name) => this.themes.get(name));
		}

		getAgentX(name) {
			return this.agentInfos.get(name).x;
		}

		svg() {
			return this.base;
		}
	};
});

define('sequence/Exporter',[],() => {
	'use strict';

	// Thanks, https://stackoverflow.com/a/23522755/1180785
	const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

	// Thanks, https://stackoverflow.com/a/9851769/1180785
	const firefox = (typeof window.InstallTrigger !== 'undefined');

	return class Exporter {
		constructor() {
			this.latestSVG = null;
			this.latestInternalSVG = null;
			this.canvas = null;
			this.context = null;
			this.indexPNG = 0;
			this.latestPNGIndex = 0;
			this.latestPNG = null;
		}

		getSVGContent(renderer, size = null) {
			let code = renderer.svg().outerHTML;
			if(firefox && size) {
				// Firefox fails to render SVGs unless they have size
				// attributes on the <svg> tag
				code = code.replace(
					/^<svg/,
					'<svg width="' + size.width +
					'" height="' + size.height + '" '
				);
			}
			return code;
		}

		getSVGBlob(renderer, size = null) {
			return new Blob(
				[this.getSVGContent(renderer, size)],
				{type: 'image/svg+xml'}
			);
		}

		getSVGURL(renderer, size = null) {
			const blob = this.getSVGBlob(renderer, size);
			if(size) {
				if(this.latestInternalSVG) {
					URL.revokeObjectURL(this.latestInternalSVG);
				}
				this.latestInternalSVG = URL.createObjectURL(blob);
				return this.latestInternalSVG;
			} else {
				if(this.latestSVG) {
					URL.revokeObjectURL(this.latestSVG);
				}
				this.latestSVG = URL.createObjectURL(blob);
				return this.latestSVG;
			}
		}

		getPNGBlob(renderer, resolution, callback) {
			if(!this.canvas) {
				window.devicePixelRatio = 1;
				this.canvas = document.createElement('canvas');
				this.context = this.canvas.getContext('2d');
			}

			const width = renderer.width * resolution;
			const height = renderer.height * resolution;
			const img = new Image(width, height);
			let safariHackaround = null;
			if(safari) {
				// Safari fails to resize SVG images unless they are displayed
				// on the page somewhere, so we must add it before drawing the
				// image. For some reason, doing this inside the load listener
				// is too late, so we do it here and do our best to ensure it
				// doesn't change the page rendering (display:none fails too)
				safariHackaround = document.createElement('div');
				safariHackaround.style.position = 'absolute';
				safariHackaround.style.visibility = 'hidden';
				safariHackaround.appendChild(img);
				document.body.appendChild(safariHackaround);
			}

			img.addEventListener('load', () => {
				this.canvas.width = width;
				this.canvas.height = height;
				this.context.drawImage(img, 0, 0);
				if(safariHackaround) {
					document.body.removeChild(safariHackaround);
				}
				this.canvas.toBlob(callback, 'image/png');
			}, {once: true});

			img.src = this.getSVGURL(renderer, {width, height});
		}

		getPNGURL(renderer, resolution, callback) {
			++ this.indexPNG;
			const index = this.indexPNG;

			this.getPNGBlob(renderer, resolution, (blob) => {
				const url = URL.createObjectURL(blob);
				const isLatest = index >= this.latestPNGIndex;
				if(isLatest) {
					if(this.latestPNG) {
						URL.revokeObjectURL(this.latestPNG);
					}
					this.latestPNG = url;
					this.latestPNGIndex = index;
					callback(url, true);
				} else {
					callback(url, false);
					URL.revokeObjectURL(url);
				}
			});
		}
	};
});

define('sequence/themes/Basic',['core/ArrayUtilities', 'svg/SVGShapes'], (array, SVGShapes) => {
	'use strict';

	const LINE_HEIGHT = 1.3;

	const SETTINGS = {
		titleMargin: 10,
		outerMargin: 5,
		agentMargin: 10,
		actionMargin: 10,
		minActionMargin: 3,
		agentLineHighlightRadius: 4,

		agentCap: {
			box: {
				padding: {
					top: 5,
					left: 10,
					right: 10,
					bottom: 5,
				},
				arrowBottom: 5 + 12 * 1.3 / 2,
				boxAttrs: {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 1,
				},
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 12,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
			},
			cross: {
				size: 20,
				attrs: {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				},
			},
			bar: {
				attrs: {
					'fill': '#000000',
					'stroke': '#000000',
					'stroke-width': 1,
					'height': 4,
				},
			},
			fade: {
				width: 5,
				height: 6,
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 6,
			lineAttrs: {
				'solid': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				},
				'dash': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
					'stroke-dasharray': '4, 2',
				},
				'wave': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
					'stroke-linejoin': 'round',
					'stroke-linecap': 'round',
					'wave-width': 6,
					'wave-height': 0.5,
				},
			},
			arrow: {
				single: {
					width: 5,
					height: 10,
					attrs: {
						'fill': '#000000',
						'stroke-width': 0,
						'stroke-linejoin': 'miter',
					},
				},
				double: {
					width: 4,
					height: 6,
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
						'stroke-linejoin': 'miter',
					},
				},
			},
			label: {
				padding: 6,
				margin: {top: 2, bottom: 1},
				attrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				loopbackAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			mask: {
				padding: {
					top: 0,
					left: 3,
					right: 3,
					bottom: 1,
				},
			},
		},

		block: {
			margin: {
				top: 0,
				bottom: 0,
			},
			modes: {
				'ref': {
					boxAttrs: {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1.5,
						'rx': 2,
						'ry': 2,
					},
				},
				'': {
					boxAttrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1.5,
						'rx': 2,
						'ry': 2,
					},
				},
			},
			section: {
				padding: {
					top: 3,
					bottom: 2,
				},
				mode: {
					padding: {
						top: 1,
						left: 3,
						right: 3,
						bottom: 0,
					},
					boxAttrs: {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
						'rx': 2,
						'ry': 2,
					},
					labelAttrs: {
						'font-family': 'sans-serif',
						'font-weight': 'bold',
						'font-size': 9,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'left',
					},
				},
				label: {
					padding: {
						top: 1,
						left: 5,
						right: 3,
						bottom: 0,
					},
					labelAttrs: {
						'font-family': 'sans-serif',
						'font-size': 8,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'left',
					},
				},
			},
			separator: {
				attrs: {
					'stroke': '#000000',
					'stroke-width': 1.5,
					'stroke-dasharray': '4, 2',
				},
			},
		},

		note: {
			'text': {
				margin: {top: 0, left: 2, right: 2, bottom: 0},
				padding: {top: 2, left: 2, right: 2, bottom: 2},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderBox.bind(null, {
					'fill': '#FFFFFF',
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			'note': {
				margin: {top: 0, left: 5, right: 5, bottom: 0},
				padding: {top: 5, left: 5, right: 10, bottom: 5},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderNote.bind(null, {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 1,
				}, {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			'state': {
				margin: {top: 0, left: 5, right: 5, bottom: 0},
				padding: {top: 7, left: 7, right: 7, bottom: 7},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderBox.bind(null, {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 1,
					'rx': 10,
					'ry': 10,
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
		},

		titleAttrs: {
			'font-family': 'sans-serif',
			'font-size': 20,
			'line-height': LINE_HEIGHT,
			'text-anchor': 'middle',
			'class': 'title',
		},

		agentLineAttrs: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
		},
	};

	return class BasicTheme {
		constructor() {
			this.name = 'basic';
			Object.assign(this, SETTINGS);
		}
	};
});

define('sequence/themes/Chunky',['core/ArrayUtilities', 'svg/SVGShapes'], (array, SVGShapes) => {
	'use strict';

	const LINE_HEIGHT = 1.3;

	const SETTINGS = {
		titleMargin: 12,
		outerMargin: 5,
		agentMargin: 8,
		actionMargin: 5,
		minActionMargin: 5,
		agentLineHighlightRadius: 4,

		agentCap: {
			box: {
				padding: {
					top: 1,
					left: 3,
					right: 3,
					bottom: 1,
				},
				arrowBottom: 2 + 14 * 1.3 / 2,
				boxAttrs: {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 3,
					'rx': 4,
					'ry': 4,
				},
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-weight': 'bold',
					'font-size': 14,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
			},
			cross: {
				size: 20,
				attrs: {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
					'stroke-linecap': 'round',
				},
			},
			bar: {
				attrs: {
					'fill': '#000000',
					'stroke': '#000000',
					'stroke-width': 3,
					'height': 4,
					'rx': 2,
					'ry': 2,
				},
			},
			fade: {
				width: 5,
				height: 10,
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 8,
			lineAttrs: {
				'solid': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
				},
				'dash': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
					'stroke-dasharray': '10, 4',
				},
				'wave': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
					'stroke-linejoin': 'round',
					'stroke-linecap': 'round',
					'wave-width': 10,
					'wave-height': 1,
				},
			},
			arrow: {
				single: {
					width: 10,
					height: 12,
					attrs: {
						'fill': '#000000',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-linejoin': 'round',
					},
				},
				double: {
					width: 10,
					height: 12,
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
					},
				},
			},
			label: {
				padding: 7,
				margin: {top: 2, bottom: 3},
				attrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				loopbackAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			mask: {
				padding: {
					top: 1,
					left: 5,
					right: 5,
					bottom: 3,
				},
			},
		},

		block: {
			margin: {
				top: 0,
				bottom: 0,
			},
			modes: {
				'ref': {
					boxAttrs: {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 4,
						'rx': 5,
						'ry': 5,
					},
				},
				'': {
					boxAttrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 4,
						'rx': 5,
						'ry': 5,
					},
				},
			},
			section: {
				padding: {
					top: 3,
					bottom: 4,
				},
				mode: {
					padding: {
						top: 2,
						left: 5,
						right: 5,
						bottom: 1,
					},
					boxAttrs: {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 2,
						'rx': 3,
						'ry': 3,
					},
					labelAttrs: {
						'font-family': 'sans-serif',
						'font-weight': 'bold',
						'font-size': 9,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'left',
					},
				},
				label: {
					padding: {
						top: 2,
						left: 5,
						right: 3,
						bottom: 0,
					},
					labelAttrs: {
						'font-family': 'sans-serif',
						'font-size': 8,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'left',
					},
				},
			},
			separator: {
				attrs: {
					'stroke': '#000000',
					'stroke-width': 2,
					'stroke-dasharray': '5, 3',
				},
			},
		},

		note: {
			'text': {
				margin: {top: 0, left: 2, right: 2, bottom: 0},
				padding: {top: 2, left: 2, right: 2, bottom: 2},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderBox.bind(null, {
					'fill': '#FFFFFF',
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			'note': {
				margin: {top: 0, left: 5, right: 5, bottom: 0},
				padding: {top: 3, left: 3, right: 10, bottom: 3},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderNote.bind(null, {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 2,
					'stroke-linejoin': 'round',
				}, {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			'state': {
				margin: {top: 0, left: 5, right: 5, bottom: 0},
				padding: {top: 5, left: 7, right: 7, bottom: 5},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderBox.bind(null, {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 3,
					'rx': 10,
					'ry': 10,
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
		},

		titleAttrs: {
			'font-family': 'sans-serif',
			'font-weight': 'bolder',
			'font-size': 20,
			'line-height': LINE_HEIGHT,
			'text-anchor': 'middle',
			'class': 'title',
		},

		agentLineAttrs: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 3,
		},
	};

	return class ChunkyTheme {
		constructor() {
			this.name = 'chunky';
			Object.assign(this, SETTINGS);
		}
	};
});

/* jshint -W072 */ // Allow several required modules
define('sequence/SequenceDiagram',[
	'core/EventObject',
	'./Parser',
	'./Generator',
	'./Renderer',
	'./Exporter',
	'./themes/Basic',
	'./themes/Chunky',
], (
	EventObject,
	Parser,
	Generator,
	Renderer,
	Exporter,
	BasicTheme,
	ChunkyTheme
) => {
	/* jshint +W072 */
	'use strict';

	const themes = [
		new BasicTheme(),
		new ChunkyTheme(),
	];

	const SharedParser = new Parser();
	const SharedGenerator = new Generator();
	const CMMode = SharedParser.getCodeMirrorMode();
	const CMHints = SharedParser.getCodeMirrorHints();

	function registerCodeMirrorMode(CodeMirror, modeName = 'sequence') {
		if(!CodeMirror) {
			CodeMirror = window.CodeMirror;
		}
		CodeMirror.defineMode(modeName, () => CMMode);
		CodeMirror.registerHelper('hint', modeName, CMHints);
	}

	function addTheme(theme) {
		themes.push(theme);
	}

	class SequenceDiagram extends EventObject {
		constructor(code = null, options = {}) {
			super();

			if(code && typeof code === 'object') {
				options = code;
				code = options.code;
			}

			this.registerCodeMirrorMode = registerCodeMirrorMode;

			this.code = code;
			this.parser = SharedParser;
			this.generator = SharedGenerator;
			this.renderer = new Renderer(Object.assign({themes}, options));
			this.exporter = new Exporter();
			this.renderer.addEventForwarding(this);
			if(options.container) {
				options.container.appendChild(this.dom());
			}
			if(typeof this.code === 'string') {
				this.render();
			}
		}

		clone(options = {}) {
			return new SequenceDiagram(Object.assign({
				code: this.code,
				container: null,
				themes: this.renderer.getThemes(),
				namespace: null,
				components: this.renderer.components,
				SVGTextBlockClass: this.renderer.SVGTextBlockClass,
			}, options));
		}

		set(code = '') {
			if(this.code === code) {
				return;
			}

			this.code = code;
			this.render();
		}

		process(code) {
			const parsed = this.parser.parse(code);
			return this.generator.generate(parsed);
		}

		addTheme(theme) {
			this.renderer.addTheme(theme);
		}

		setHighlight(line = null) {
			this.renderer.setHighlight(line);
		}

		getThemeNames() {
			return this.renderer.getThemeNames();
		}

		getThemes() {
			return this.renderer.getThemes();
		}

		getSVGSynchronous() {
			return this.exporter.getSVGURL(this.renderer);
		}

		getSVG() {
			return Promise.resolve({
				url: this.getSVGSynchronous(),
				latest: true,
			});
		}

		getPNG({resolution = 1, size = null} = {}) {
			if(size) {
				this.renderer.width = size.width;
				this.renderer.height = size.height;
			}
			return new Promise((resolve) => {
				this.exporter.getPNGURL(
					this.renderer,
					resolution,
					(url, latest) => {
						resolve({url, latest});
					}
				);
			});
		}

		getSize() {
			return {
				width: this.renderer.width,
				height: this.renderer.height,
			};
		}

		render(processed = null) {
			const dom = this.renderer.svg();
			const originalParent = dom.parentNode;
			if(!document.body.contains(dom)) {
				if(originalParent) {
					originalParent.removeChild(dom);
				}
				document.body.appendChild(dom);
			}
			try {
				if(!processed) {
					processed = this.process(this.code);
				}
				this.renderer.render(processed);
			} finally {
				if(dom.parentNode !== originalParent) {
					document.body.removeChild(dom);
					if(originalParent) {
						originalParent.appendChild(dom);
					}
				}
			}
		}

		setContainer(node = null) {
			const dom = this.dom();
			if(dom.parentNode) {
				dom.parentNode.removeChild(dom);
			}
			if(node) {
				node.appendChild(dom);
			}
		}

		dom() {
			return this.renderer.svg();
		}
	}

	function convert(element, code = null, options = {}) {
		if(element.tagName === 'svg') {
			return null;
		}

		if(code === null) {
			code = element.innerText;
		} else if(typeof code === 'object') {
			options = code;
			code = options.code;
		}
		const diagram = new SequenceDiagram(code, options);
		const newElement = diagram.dom();
		element.parentNode.insertBefore(newElement, element);
		element.parentNode.removeChild(element);
		const attrs = element.attributes;
		for(let i = 0; i < attrs.length; ++ i) {
			newElement.setAttribute(
				attrs[i].nodeName,
				attrs[i].nodeValue
			);
		}
		return diagram;
	}

	function convertAll(root = null, className = 'sequence-diagram') {
		if(typeof root === 'string') {
			className = root;
			root = null;
		}
		let elements = null;
		if(root && root.length !== undefined) {
			elements = root;
		} else {
			elements = (root || document).getElementsByClassName(className);
		}
		// Convert from "live" collection to static to avoid infinite loops:
		const els = [];
		for(let i = 0; i < elements.length; ++ i) {
			els.push(elements[i]);
		}
		// Convert elements
		els.forEach((el) => convert(el));
	}

	return Object.assign(SequenceDiagram, {
		Parser,
		Generator,
		Renderer,
		Exporter,
		themes,
		addTheme,
		registerCodeMirrorMode,
		convert,
		convertAll,
	});
});

requirejs(['sequence/SequenceDiagram'], (SequenceDiagram) => {
	'use strict';

	document.addEventListener('DOMContentLoaded', () => {
		SequenceDiagram.convertAll();
	}, {once: true});

	if(window.CodeMirror) {
		SequenceDiagram.registerCodeMirrorMode(window.CodeMirror);
	}

	window.SequenceDiagram = SequenceDiagram;
}, null, true);

define("standalone", function(){});

}());