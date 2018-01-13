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

			const allAgents = array.flatMap(colAgents, this.expandGroupedAgent);
			this.defineAgents(allAgents);

			colAgents = this.expandGroupedAgentConnection(colAgents);
			const agentNames = colAgents.map(Agent.getName);

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

define('svg/PatternedLine',[],() => {
	'use strict';

	return class PatternedLine {
		constructor(pattern = null, phase = 0) {
			this.pattern = pattern;
			this.dw = pattern && pattern.partWidth;
			this.points = [];
			this.phase = phase;
			this.x = null;
			this.y = null;
			this.disconnect = 0;
		}

		_nextDelta() {
			return this.pattern.getDelta(this.phase ++);
		}

		_link() {
			if(this.disconnect === 2) {
				this.points.push(this.x + ' ' + this.y);
				this.disconnect = 0;
			}
		}

		cap() {
			if(this.disconnect > 0) {
				this.points.push(this.x + ' ' + this.y);
				this.disconnect = 0;
			}
			return this;
		}

		move(x, y) {
			this.cap();
			this.x = x;
			this.y = y;
			this.disconnect = 2;
			return this;
		}

		line(x, y) {
			if(this.pattern) {
				const len = Math.sqrt(
					(x - this.x) * (x - this.x) +
					(y - this.y) * (y - this.y)
				);
				const dx1 = (x - this.x) / len;
				const dy1 = (y - this.y) / len;
				const dx2 = -dy1;
				const dy2 = dx1;

				for(let pos = 0; pos + this.dw <= len; pos += this.dw) {
					const delta = this._nextDelta();
					this.points.push(
						(this.x + pos * dx1 + delta * dx2) + ' ' +
						(this.y + pos * dy1 + delta * dy2)
					);
				}
				this.disconnect = 1;
			} else {
				this._link();
				this.disconnect = 2;
			}

			this.x = x;
			this.y = y;
			return this;
		}

		arc(cx, cy, theta) {
			const radius = Math.sqrt(
				(cx - this.x) * (cx - this.x) +
				(cy - this.y) * (cy - this.y)
			);
			const theta1 = Math.atan2(cx - this.x, cy - this.y);
			const nextX = cx + Math.sin(theta1 + theta) * radius;
			const nextY = cy - Math.cos(theta1 + theta) * radius;

			if(this.pattern) {
				const dir = (theta < 0 ? 1 : -1);
				const dt = this.dw / radius;

				for(let t = theta1; t + dt <= theta1 + theta; t += dt) {
					const delta = this._nextDelta() * dir;
					this.points.push(
						(cx + Math.sin(t) * (radius + delta)) + ' ' +
						(cy - Math.cos(t) * (radius + delta))
					);
				}
				this.disconnect = 1;
			} else {
				this.points.push(
					this.x + ' ' + this.y +
					'A' + radius + ' ' + radius + ' 0 ' +
					((theta < 0) ? '0 ' : '1 ') +
					'1 ' +
					nextX + ' ' + nextY
				);
				this.disconnect = 0;
			}

			this.x = nextX;
			this.y = nextY;

			return this;
		}

		asPath() {
			this._link();
			return 'M' + this.points.join('L');
		}
	};
});

define('svg/SVGShapes',[
	'./SVGUtilities',
	'./SVGTextBlock',
	'./PatternedLine',
], (
	svg,
	SVGTextBlock,
	PatternedLine
) => {
	'use strict';

	function renderBox(attrs, position) {
		return svg.make('rect', Object.assign({}, position, attrs));
	}

	function renderLine(attrs, position) {
		return svg.make('line', Object.assign({}, position, attrs));
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
		renderLine,
		renderNote,
		renderBoxedText,
		TextBlock: SVGTextBlock,
		PatternedLine,
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
			state,
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
			state,
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
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.mode).section;
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
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.mode);
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);

			let y = env.primaryY;

			if(!first) {
				y += config.section.padding.bottom;
			}

			const clickable = env.makeRegion();

			const modeRender = SVGShapes.renderBoxedText(mode, {
				x: agentInfoL.x,
				y,
				padding: config.section.mode.padding,
				boxAttrs: config.section.mode.boxAttrs,
				boxRenderer: config.section.mode.boxRenderer,
				labelAttrs: config.section.mode.labelAttrs,
				boxLayer: blockInfo.hold,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const labelRender = SVGShapes.renderBoxedText(label, {
				x: agentInfoL.x + modeRender.width,
				y,
				padding: config.section.label.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.section.label.labelAttrs,
				boxLayer: env.maskLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const labelHeight = Math.max(modeRender.height, labelRender.height);

			clickable.insertBefore(svg.make('rect', {
				'x': agentInfoL.x,
				'y': y,
				'width': agentInfoR.x - agentInfoL.x,
				'height': labelHeight,
				'fill': 'transparent',
			}), clickable.firstChild);

			if(!first) {
				blockInfo.hold.appendChild(config.sepRenderer({
					'x1': agentInfoL.x,
					'y1': y,
					'x2': agentInfoR.x,
					'y2': y,
				}));
			}

			return y + labelHeight + config.section.padding.top;
		}
	}

	class BlockBegin extends BlockSplit {
		makeState(state) {
			state.blocks = new Map();
		}

		resetState(state) {
			state.blocks.clear();
		}

		storeBlockInfo(stage, env) {
			env.state.blocks.set(stage.left, {
				mode: stage.mode,
				hold: null,
				startY: null,
			});
		}

		separationPre(stage, env) {
			this.storeBlockInfo(stage, env);
		}

		separation(stage, env) {
			array.mergeSets(env.visibleAgents, [stage.left, stage.right]);
			super.separation(stage, env);
		}

		renderPre(stage, env) {
			this.storeBlockInfo(stage, env);

			const config = env.theme.getBlock(stage.mode);

			return {
				agentNames: [stage.left, stage.right],
				topShift: config.margin.top,
			};
		}

		render(stage, env) {
			const hold = svg.make('g');
			env.blockLayer.appendChild(hold);

			const blockInfo = env.state.blocks.get(stage.left);
			blockInfo.hold = hold;
			blockInfo.startY = env.primaryY;

			return super.render(stage, env, true);
		}
	}

	class BlockEnd extends BaseComponent {
		separation({left, right}, env) {
			array.removeAll(env.visibleAgents, [left, right]);
		}

		renderPre({left, right}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.mode);

			return {
				agentNames: [left, right],
				topShift: config.section.padding.bottom,
			};
		}

		render({left, right}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.mode);
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);

			blockInfo.hold.appendChild(config.boxRenderer({
				x: agentInfoL.x,
				y: blockInfo.startY,
				width: agentInfoR.x - agentInfoL.x,
				height: env.primaryY - blockInfo.startY,
			}));

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
				boxRenderer: config.boxRenderer,
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

			env.shapeLayer.appendChild(config.render({x, y: y + d, radius: d}));

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
			return config.height / 2;
		}

		render(y, {x, label}, env) {
			const configB = env.theme.agentCap.box;
			const config = env.theme.agentCap.bar;
			const width = (
				env.textSizer.measure(configB.labelAttrs, label).width +
				configB.padding.left +
				configB.padding.right
			);
			const height = config.height;

			env.shapeLayer.appendChild(config.render({
				x: x - width / 2,
				y,
				width,
				height,
			}));

			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - width / 2,
				'y': y,
				'width': width,
				'height': height,
				'fill': 'transparent',
			}));

			return {
				lineTop: 0,
				lineBottom: height,
				height: height,
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
			const ratio = config.height / (config.height + config.extend);

			const gradID = env.addDef(isBegin ? 'FadeIn' : 'FadeOut', () => {
				const grad = svg.make('linearGradient', {
					'x1': '0%',
					'y1': isBegin ? '100%' : '0%',
					'x2': '0%',
					'y2': isBegin ? '0%' : '100%',
				});
				grad.appendChild(svg.make('stop', {
					'offset': '0%',
					'stop-color': '#FFFFFF',
				}));
				grad.appendChild(svg.make('stop', {
					'offset': (100 * ratio).toFixed(3) + '%',
					'stop-color': '#000000',
				}));
				return grad;
			});

			env.maskLayer.appendChild(svg.make('rect', {
				'x': x - config.width / 2,
				'y': y - (isBegin ? config.extend : 0),
				'width': config.width,
				'height': config.height + config.extend,
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

		render(layer, theme, pt, dir) {
			const config = this.getConfig(theme);
			layer.appendChild(config.render(config.attrs, {
				x: pt.x + this.short(theme) * dir,
				y: pt.y,
				dx: config.width * dir,
				dy: config.height / 2,
			}));
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

			const line = config.line[options.line];
			const rendered = line.renderRev(line.attrs, {
				xL: lineX,
				dx1: lArrow.lineGap(env.theme, line.attrs),
				dx2: rArrow.lineGap(env.theme, line.attrs),
				y1: y0,
				y2: y1,
				xR: x1,
			});
			env.shapeLayer.appendChild(rendered.shape);

			lArrow.render(env.shapeLayer, env.theme, rendered.p1, 1);
			rArrow.render(env.shapeLayer, env.theme, rendered.p2, 1);

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

			const line = config.line[options.line];
			const rendered = line.renderFlat(line.attrs, {
				x1: x0,
				dx1: lArrow.lineGap(env.theme, line.attrs) * dir,
				x2: x1,
				dx2: -rArrow.lineGap(env.theme, line.attrs) * dir,
				y,
			});
			env.shapeLayer.appendChild(rendered.shape);

			lArrow.render(env.shapeLayer, env.theme, rendered.p1, dir);
			rArrow.render(env.shapeLayer, env.theme, rendered.p2, -dir);

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
			const config = env.theme.getNote(mode);

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
			const config = env.theme.getNote(mode);
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
			const config = env.theme.getNote(mode);

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
			const config = env.theme.getNote(mode);
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
			const config = env.theme.getNote(mode);
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
			const config = env.theme.getNote(mode);
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

			this._bindMethods();

			this.state = {};
			this.width = 0;
			this.height = 0;
			this.themes = makeThemes(themes);
			this.theme = null;
			this.namespace = parseNamespace(namespace);
			this.components = components;
			this.SVGTextBlockClass = SVGTextBlockClass;
			this.knownThemeDefs = new Set();
			this.knownDefs = new Set();
			this.highlights = new Map();
			this.currentHighlight = -1;
			this.buildStaticElements();
			this.components.forEach((component) => {
				component.makeState(this.state);
			});
		}

		_bindMethods() {
			this.separationStage = this.separationStage.bind(this);
			this.renderStage = this.renderStage.bind(this);
			this.addSeparation = this.addSeparation.bind(this);
			this.addThemeDef = this.addThemeDef.bind(this);
			this.addDef = this.addDef.bind(this);
		}

		addTheme(theme) {
			this.themes.set(theme.name, theme);
		}

		buildStaticElements() {
			this.base = svg.makeContainer();

			this.themeDefs = svg.make('defs');
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
			this.actionShapes = svg.make('g');
			this.actionLabels = svg.make('g');
			this.base.appendChild(this.themeDefs);
			this.base.appendChild(this.defs);
			this.base.appendChild(this.agentLines);
			this.base.appendChild(this.blocks);
			this.base.appendChild(this.actionShapes);
			this.base.appendChild(this.actionLabels);
			this.title = new this.SVGTextBlockClass(this.base);

			this.sizer = new this.SVGTextBlockClass.SizeTester(this.base);
		}

		addThemeDef(name, generator) {
			const namespacedName = this.namespace + name;
			if(this.knownThemeDefs.has(name)) {
				return namespacedName;
			}
			this.knownThemeDefs.add(name);
			const def = generator();
			def.setAttribute('id', namespacedName);
			this.themeDefs.appendChild(def);
			return namespacedName;
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
				state: this.state,
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

			this.agentLines.appendChild(this.theme.renderAgentLine({
				x: agentInfo.x,
				y0: agentInfo.latestYStart,
				y1: toY,
				width: agentInfo.currentRad * 2,
				className: 'agent-' + agentInfo.index + '-line',
			}));
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

		_resetState() {
			this.components.forEach((component) => {
				component.resetState(this.state);
			});
			this.currentY = 0;
		}

		_reset(theme) {
			if(theme) {
				this.knownThemeDefs.clear();
				svg.empty(this.themeDefs);
			}

			this.knownDefs.clear();
			this.highlights.clear();
			this.currentHighlight = -1;
			svg.empty(this.defs);
			svg.empty(this.mask);
			svg.empty(this.agentLines);
			svg.empty(this.blocks);
			svg.empty(this.actionShapes);
			svg.empty(this.actionLabels);
			this.mask.appendChild(this.maskReveal);
			this.defs.appendChild(this.mask);
			this._resetState();
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
			const oldTheme = this.theme;

			this.theme = this.getThemeNamed(sequence.meta.theme);

			const themeChanged = (this.theme !== oldTheme);
			this._reset(themeChanged);

			this.theme.reset();
			this.theme.addDefs(this.addThemeDef);

			this.title.set({
				attrs: this.theme.titleAttrs,
				text: sequence.meta.title,
			});

			this.minX = 0;
			this.maxX = 0;
			this.buildAgentInfos(sequence.agents, sequence.stages);

			this._resetState();
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

		getThemeNamed(themeName) {
			const theme = this.themes.get(themeName);
			if(theme) {
				return theme;
			}
			return this.themes.get('');
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

define('sequence/themes/BaseTheme',[
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	svg,
	SVGShapes
) => {
	'use strict';

	function deepCopy(o) {
		if(typeof o !== 'object' || !o) {
			return o;
		}
		const r = {};
		for(let k in o) {
			if(o.hasOwnProperty(k)) {
				r[k] = deepCopy(o[k]);
			}
		}
		return r;
	}

	class BaseTheme {
		constructor({name, settings, blocks, notes}) {
			this.name = name;
			this.blocks = deepCopy(blocks);
			this.notes = deepCopy(notes);
			Object.assign(this, deepCopy(settings));
		}

		reset() {
		}

		addDefs() {
		}

		getBlock(type) {
			return this.blocks[type] || this.blocks[''];
		}

		getNote(type) {
			return this.notes[type] || this.notes[''];
		}

		renderAgentLine({x, y0, y1, width, className}) {
			if(width > 0) {
				return svg.make('rect', Object.assign({
					'x': x - width / 2,
					'y': y0,
					'width': width,
					'height': y1 - y0,
					'class': className,
				}, this.agentLineAttrs));
			} else {
				return svg.make('line', Object.assign({
					'x1': x,
					'y1': y0,
					'x2': x,
					'y2': y1,
					'class': className,
				}, this.agentLineAttrs));
			}
		}
	}

	BaseTheme.renderHorizArrowHead = (attrs, {x, y, dx, dy}) => {
		return svg.make(
			attrs.fill === 'none' ? 'polyline' : 'polygon',
			Object.assign({
				'points': (
					(x + dx) + ' ' + (y - dy) + ' ' +
					x + ' ' + y + ' ' +
					(x + dx) + ' ' + (y + dy)
				),
			}, attrs)
		);
	};

	BaseTheme.renderTag = (attrs, {x, y, width, height}) => {
		const {rx, ry} = attrs;
		const x2 = x + width;
		const y2 = y + height;

		const line = (
			'M' + x2 + ' ' + y +
			'L' + x2 + ' ' + (y2 - ry) +
			'L' + (x2 - rx) + ' ' + y2 +
			'L' + x + ' ' + y2
		);

		const g = svg.make('g');
		if(attrs.fill !== 'none') {
			g.appendChild(svg.make('path', Object.assign({
				'd': line + 'L' + x + ' ' + y,
			}, attrs, {'stroke': 'none'})));
		}

		if(attrs.stroke !== 'none') {
			g.appendChild(svg.make('path', Object.assign({
				'd': line,
			}, attrs, {'fill': 'none'})));
		}

		return g;
	};

	BaseTheme.renderCross = (attrs, {x, y, radius}) => {
		return svg.make('path', Object.assign({
			'd': (
				'M' + (x - radius) + ' ' + (y - radius) +
				'l' + (radius * 2) + ' ' + (radius * 2) +
				'm0 ' + (-radius * 2) +
				'l' + (-radius * 2) + ' ' + (radius * 2)
			),
		}, attrs));
	};

	BaseTheme.WavePattern = class WavePattern {
		constructor(width, height) {
			if(Array.isArray(height)) {
				this.deltas = height;
			} else {
				this.deltas = [
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
			this.partWidth = width / this.deltas.length;
		}

		getDelta(p) {
			return this.deltas[p % this.deltas.length];
		}
	};

	BaseTheme.renderFlatConnector = (pattern, attrs, {x1, dx1, x2, dx2, y}) => {
		return {
			shape: svg.make('path', Object.assign({
				d: new SVGShapes.PatternedLine(pattern)
					.move(x1 + dx1, y)
					.line(x2 + dx2, y)
					.cap()
					.asPath(),
			}, attrs)),
			p1: {x: x1, y},
			p2: {x: x2, y},
		};
	};

	BaseTheme.renderRevConnector = (
		pattern,
		attrs,
		{xL, dx1, dx2, y1, y2, xR}
	) => {
		return {
			shape: svg.make('path', Object.assign({
				d: new SVGShapes.PatternedLine(pattern)
					.move(xL + dx1, y1)
					.line(xR, y1)
					.arc(xR, (y1 + y2) / 2, Math.PI)
					.line(xL + dx2, y2)
					.cap()
					.asPath(),
			}, attrs)),
			p1: {x: xL, y: y1},
			p2: {x: xL, y: y2},
		};
	};

	return BaseTheme;
});

define('sequence/themes/Basic',[
	'./BaseTheme',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseTheme,
	svg,
	SVGShapes
) => {
	'use strict';

	const FONT = 'sans-serif';
	const LINE_HEIGHT = 1.3;

	const WAVE = new BaseTheme.WavePattern(6, 0.5);

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
					'font-family': FONT,
					'font-size': 12,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
			},
			cross: {
				size: 20,
				render: BaseTheme.renderCross.bind(null, {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				}),
			},
			bar: {
				height: 4,
				render: SVGShapes.renderBox.bind(null, {
					'fill': '#000000',
					'stroke': '#000000',
					'stroke-width': 1,
				}),
			},
			fade: {
				width: 5,
				height: 6,
				extend: 1,
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 6,
			line: {
				'solid': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, null),
					renderRev: BaseTheme.renderRevConnector.bind(null, null),
				},
				'dash': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
						'stroke-dasharray': '4, 2',
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, null),
					renderRev: BaseTheme.renderRevConnector.bind(null, null),
				},
				'wave': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, WAVE),
					renderRev: BaseTheme.renderRevConnector.bind(null, WAVE),
				},
			},
			arrow: {
				'single': {
					width: 5,
					height: 10,
					render: BaseTheme.renderHorizArrowHead,
					attrs: {
						'fill': '#000000',
						'stroke-width': 0,
						'stroke-linejoin': 'miter',
					},
				},
				'double': {
					width: 4,
					height: 6,
					render: BaseTheme.renderHorizArrowHead,
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
					'font-family': FONT,
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				loopbackAttrs: {
					'font-family': FONT,
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

		titleAttrs: {
			'font-family': FONT,
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

	const SHARED_BLOCK_SECTION = {
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
			boxRenderer: BaseTheme.renderTag.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1,
				'rx': 2,
				'ry': 2,
			}),
			labelAttrs: {
				'font-family': FONT,
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
				'font-family': FONT,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
				'text-anchor': 'left',
			},
		},
	};

	const BLOCKS = {
		'ref': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1.5,
				'rx': 2,
				'ry': 2,
			}),
			section: SHARED_BLOCK_SECTION,
		},
		'': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': 'none',
				'stroke': '#000000',
				'stroke-width': 1.5,
				'rx': 2,
				'ry': 2,
			}),
			section: SHARED_BLOCK_SECTION,
			sepRenderer: SVGShapes.renderLine.bind(null, {
				'stroke': '#000000',
				'stroke-width': 1.5,
				'stroke-dasharray': '4, 2',
			}),
		},
	};

	const NOTE_ATTRS = {
		'font-family': FONT,
		'font-size': 8,
		'line-height': LINE_HEIGHT,
	};

	const NOTES = {
		'text': {
			margin: {top: 0, left: 2, right: 2, bottom: 0},
			padding: {top: 2, left: 2, right: 2, bottom: 2},
			overlap: {left: 10, right: 10},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
			}),
			labelAttrs: NOTE_ATTRS,
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
			labelAttrs: NOTE_ATTRS,
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
			labelAttrs: NOTE_ATTRS,
		},
	};

	return class BasicTheme extends BaseTheme {
		constructor() {
			super({
				name: 'basic',
				settings: SETTINGS,
				blocks: BLOCKS,
				notes: NOTES,
			});
		}
	};
});

define('sequence/themes/Chunky',[
	'./BaseTheme',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseTheme,
	svg,
	SVGShapes
) => {
	'use strict';

	const FONT = 'sans-serif';
	const LINE_HEIGHT = 1.3;

	const WAVE = new BaseTheme.WavePattern(10, 1);

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
					'font-family': FONT,
					'font-weight': 'bold',
					'font-size': 14,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
			},
			cross: {
				size: 20,
				render: BaseTheme.renderCross.bind(null, {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
					'stroke-linecap': 'round',
				}),
			},
			bar: {
				height: 4,
				render: SVGShapes.renderBox.bind(null, {
					'fill': '#000000',
					'stroke': '#000000',
					'stroke-width': 3,
					'rx': 2,
					'ry': 2,
				}),
			},
			fade: {
				width: 5,
				height: 10,
				extend: 1,
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 8,
			line: {
				'solid': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, null),
					renderRev: BaseTheme.renderRevConnector.bind(null, null),
				},
				'dash': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-dasharray': '10, 4',
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, null),
					renderRev: BaseTheme.renderRevConnector.bind(null, null),
				},
				'wave': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, WAVE),
					renderRev: BaseTheme.renderRevConnector.bind(null, WAVE),
				},
			},
			arrow: {
				single: {
					width: 10,
					height: 12,
					render: BaseTheme.renderHorizArrowHead,
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
					render: BaseTheme.renderHorizArrowHead,
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
					'font-family': FONT,
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				loopbackAttrs: {
					'font-family': FONT,
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

		titleAttrs: {
			'font-family': FONT,
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

	const SHARED_BLOCK_SECTION = {
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
			boxRenderer: BaseTheme.renderTag.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 2,
				'rx': 3,
				'ry': 3,
			}),
			labelAttrs: {
				'font-family': FONT,
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
				'font-family': FONT,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
				'text-anchor': 'left',
			},
		},
	};

	const BLOCKS = {
		'ref': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 4,
				'rx': 5,
				'ry': 5,
			}),
			section: SHARED_BLOCK_SECTION,
		},
		'': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': 'none',
				'stroke': '#000000',
				'stroke-width': 4,
				'rx': 5,
				'ry': 5,
			}),
			section: SHARED_BLOCK_SECTION,
			sepRenderer: SVGShapes.renderLine.bind(null, {
				'stroke': '#000000',
				'stroke-width': 2,
				'stroke-dasharray': '5, 3',
			}),
		},
	};

	const NOTE_ATTRS = {
		'font-family': FONT,
		'font-size': 8,
		'line-height': LINE_HEIGHT,
	};

	const NOTES = {
		'text': {
			margin: {top: 0, left: 2, right: 2, bottom: 0},
			padding: {top: 2, left: 2, right: 2, bottom: 2},
			overlap: {left: 10, right: 10},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
			}),
			labelAttrs: NOTE_ATTRS,
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
			labelAttrs: NOTE_ATTRS,
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
			labelAttrs: NOTE_ATTRS,
		},
	};

	return class ChunkyTheme extends BaseTheme {
		constructor() {
			super({
				name: 'chunky',
				settings: SETTINGS,
				blocks: BLOCKS,
				notes: NOTES,
			});
		}
	};
});

define('sequence/themes/HandleeFontData',[],() => {
	'use strict';

	// Handlee font, by Joe Prince
	// Downloaded from Google Fonts and converted to Base64 for embedding in
	// generated SVGs
	// https://fonts.google.com/specimen/Handlee

	/* License

	SIL OPEN FONT LICENSE
	Version 1.1 - 26 February 2007

	PREAMBLE
	The goals of the Open Font License (OFL) are to stimulate worldwide
	development of collaborative font projects, to support the font creation
	efforts of academic and linguistic communities, and to provide a free and
	open framework in which fonts may be shared and improved in partnership
	with others.

	The OFL allows the licensed fonts to be used, studied, modified and
	redistributed freely as long as they are not sold by themselves. The
	fonts, including any derivative works, can be bundled, embedded,
	redistributed and/or sold with any software provided that any reserved
	names are not used by derivative works. The fonts and derivatives,
	however, cannot be released under any other type of license. The
	requirement for fonts to remain under this license does not apply
	to any document created using the fonts or their derivatives.

	DEFINITIONS
	"Font Software" refers to the set of files released by the Copyright
	Holder(s) under this license and clearly marked as such. This may
	include source files, build scripts and documentation.

	"Reserved Font Name" refers to any names specified as such after the
	copyright statement(s).

	"Original Version" refers to the collection of Font Software components as
	distributed by the Copyright Holder(s).

	"Modified Version" refers to any derivative made by adding to, deleting,
	or substituting — in part or in whole — any of the components of the
	Original Version, by changing formats or by porting the Font Software to a
	new environment.

	"Author" refers to any designer, engineer, programmer, technical
	writer or other person who contributed to the Font Software.

	PERMISSION & CONDITIONS
	Permission is hereby granted, free of charge, to any person obtaining
	a copy of the Font Software, to use, study, copy, merge, embed, modify,
	redistribute, and sell modified and unmodified copies of the Font
	Software, subject to the following conditions:

	1) Neither the Font Software nor any of its individual components,
	in Original or Modified Versions, may be sold by itself.

	2) Original or Modified Versions of the Font Software may be bundled,
	redistributed and/or sold with any software, provided that each copy
	contains the above copyright notice and this license. These can be
	included either as stand-alone text files, human-readable headers or
	in the appropriate machine-readable metadata fields within text or
	binary files as long as those fields can be easily viewed by the user.

	3) No Modified Version of the Font Software may use the Reserved Font
	Name(s) unless explicit written permission is granted by the corresponding
	Copyright Holder. This restriction only applies to the primary font name as
	presented to the users.

	4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
	Software shall not be used to promote, endorse or advertise any
	Modified Version, except to acknowledge the contribution(s) of the
	Copyright Holder(s) and the Author(s) or with their explicit written
	permission.

	5) The Font Software, modified or unmodified, in part or in whole,
	must be distributed entirely under this license, and must not be
	distributed under any other license. The requirement for fonts to
	remain under this license does not apply to any document created
	using the Font Software.

	TERMINATION
	This license becomes null and void if any of the above conditions are
	not met.

	DISCLAIMER
	THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
	OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
	COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
	INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
	DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
	OTHER DEALINGS IN THE FONT SOFTWARE.

	*/

	return {
		name: 'Handlee',
		woff2: (
			'd09GMgABAAAAAD3EAA4AAAAAi4QAAD1qAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
			'GhYbxV4cKgZgAIF8EQgKgbpIgZNlC4MGAAE2AiQDhggEIAWEDgeDKxuhdSXsmCEe' +
			'ByC2jBgVNYuS+mQUpZq0k+z/vyY3BgzxIa3ugqhFRlV1T4WqHliFgkLvX+Fguaf/' +
			'tXTReCMU5hvZIfpErawhdoJhvGi60udSmcpUmZV+33txIHLMbEhRhomyZs7N2ods' +
			'iOl7OmXseNPFL9fnzsBxPmouBP/3/Wbmvt+Om/2FCihaDcM063gCEX9NLAt4u0Mw' +
			't27RRQwYMGqMWgUxxtioahM7sANfMfL9svpDv1r7QwmKw9y7bx3k5w1Kx2CplAiG' +
			'qIJEAx6gUICjf39+y0xK/qS6vwbT8sAy+yrlEHe3vNdJ+jauiqvOOWRpffhe8mec' +
			'SXiGF4IGTtgLKLV2M6lzDvAXO0QkRtk8v62KREEBwaihHQPHQUZ7YfchZmHtcm8+' +
			'Z6+az/v4cS/auKr51LlyEhygfzOnr94kmRQnbJcIXjvUGdVV1xbM/AtMwQWbE4Nk' +
			'WTgj7VNM7tsSphi6w7Xer64GAF9ZWaEQhamQGZvYSbJ32eOle7QPGCaZ8v8BQACc' +
			'a4LR5sPtg6JABnLj1wL8AT7Ig0UXwD88/7/XfvbvhPOLI9BloMsIxZsiDEJjTHLf' +
			'vMw6c9alqsNd71f1JrRMfmuZUDJl+RESNELxW1Gh1Kq+QyiUQwiLBqH532XN5lbd' +
			'0eXiwCGbNynX8me2JbTMXE2omWuTmaWEddCFA4eSW9ospRR3QvI8/vf70bJLSBva' +
			'prCxqOq7/933bfWsOurVtGuIZKolhswQGbJVhtI2JyxEQs+omyBJQJ8+owwHUkQk' +
			'9Jq/DeT7/htzRkREiHgi8hDpxlIJr0M6CN3euB9bfbmXPn+2CXsKDDCEMYJ7/34I' +
			'cAYeiOz8vQ8DOCFHDXS5TvYA4vNtWwMgggPgFUc9PbY0ADRwdw846HXQ9qjp/yfP' +
			'OqIoWmIoLqQrIZ6SqqBHYVhYHuwXuBjuB6+DD8Cvwm8h4Ag1woQoQNQhBhDLkELk' +
			'EPJTVBHqK/QJ9DOMB3MNm4x9hJuNe49vIxAJfYTnRDKxhrSKLCU/oRRQvqE+o1XR' +
			'ntOL6AMMPGOC8Q3Ty2KzVrCesC3srRwkh85xcJo4/3D7eEjeVj6Xr+EfFrgEt4Ry' +
			'4VzhXyKtyCRyiLJEJaI+0YholbhEXCVuEfeJDaikK5mTGlM7t1SUSKl6LLDOJUBR' +
			'QUACHMOBIhCAIEYMExlJsDBRRCQllJBOGWW4qaWODJppJpN22vEyYoSPMeOyWGyx' +
			'HJZbLpeNNstj2oxCzjqvHATKXNhGKJv4sVkAM92BP3MEW+Ire+UeHEou02UugSF/' +
			'Rs/TIybjDymoqi7KSkiF6oAu1aMNYyukNRbNnNoSLHVMXEt37sm9Y7bg5hdVaCbs' +
			'i/upZWaddaJAqWgRL6FlVUXVott4B+lhffVQrslH4jEyVTyVfQSAYVb8waSwLLM8' +
			'lCJTlUVxSVrBOnhX1cOGOUw6YRhaoC1hu9k5e/ToQ7yNH5zSuXZ9Z+6+7Un407GQ' +
			'SJOH0uPsndyp/KgsbYABNaImzMyhwcMcf9/0Z2zgmLtn3ntcEcqFVFwkT6TkY+O7' +
			'OCirR7zNn7Z//Pv7/3yfhr7CluKlI3OuXUNRTscMuL1AKYjzN0Ae6LtWimNVo6hT' +
			'clTRajlvSzraXc2eRl8+cK7xR/jY6eTC49n92zeszJcQcIXM0BGeuqtkki1yWT6T' +
			'Elmqowa+D+34DJgKSwUPcGccS++aWAi1OMar1CLtuRSePK/6ut9vZHYEDEVDpTW5' +
			'jKNMJZghGbqPVUzlRunA+JHtSjqM0zxcWjT7qY49n08atNHzpffVINN4Sq/G5oZr' +
			'DyLo07HU38/J87ubnQy1SGHDkest3yN4eqbkt2+w16d440jae0Jdv779BDgORYvk' +
			'OjdUeiSZsjnjUOuomIiEfN/GMVP2ZXp+spVRjBi0OHXFqNqouqloUb7TM2lYgCpX' +
			'4spEhauytaSujarNNy1tg472oP2zGjLaao7U4+aEmzJf3Cy3Ws0ZVf64WnKYneVC' +
			'PornpBypzk3RdtK3weAEo4HAoJsRumuZG366FYc1HApypjYODbVCFJNEa/JZqktf' +
			'LNNmX+RaqWA0l3U96YoNC0yRp+gLfE6Jhxv0kzvpAdHTOSmVJwreSIFVQRGWmApk' +
			'URDAYnFuuw49BuWYtUs6ny/TD1g7cR5nLxyVN+dm7ktapYkWT+tMKaMisSAsTAQA' +
			'FAb33mwfHyIaPhKOyQk9RdnVO98TgFlCHKpmpX8FX9uhTlNd+7fkyXx79JB5zvUC' +
			'IdTnPykMxMl1l5immsxKMVsAqpWi9ZJ5H9QKrMoXBs0GB2wz81mt9nUG9ocqTWOk' +
			'N7Y24U0dzpzeaoXXJvcWbO5u7IoHtQmyRp24X2fnOVpekShDlQUBzGvKyytUgVHJ' +
			'Il0yChoEQRAAQdfdpKd92cAsGCwGbC9mOtflVkzWIH5wQP17NTlxkZe5KC+mAlkA' +
			'gJkUWlBAoG7unUMaRvbNdgqQpqtpgZH7CggKAlgcsNkWNgY5WTxFgyP5CWjMqTeb' +
			'3PNQv/BC7LPnUoXWzyZ3RmELJHQgIeRG1VM2MbOhni57avjglIAW+aSBntktvobY' +
			'TcKALMrfG/Qn+N/YBGfmuO6ee49RhiTEp9U8TH7N22n/jWTq3GXpREGtUuZEPRzq' +
			'JyxZiOa8xx+mTw79qklH/htTU8mt8HWfbf6y/cvu6oPSB80VCqAwUWrlBatUzHSY' +
			'hSwYODGrRWbEAy8IWFpwLk2f0AioQrUB4wDAJ6NPSQTgsFhQrFgQJw4HRBtMyY0V' +
			'3HQ6Qgl8Noc84AJ5jD7CC7pmIv+v7CJvaK0ERwZELmUt/qzFCYo68lgwA7WNecRJ' +
			'al+RD1+HElgzOTaUCgwjcDqLxYnNuhqevCOoFljO3ijgFI6QfCEH0cMtmUB7qZ8d' +
			'Wq6Rx+uOKrfVfPDl7tDFBzQOhcNE0Nhkdgmx4rcWUA1IIH4ZZ2Zw0ZY5Iojjd1J5' +
			'S99pihV9irnNXQ+wF7oVjvL7fyfciJfiTiT9MJgJEoAcQfFwQaJ6uOiRkgfL9ioe' +
			'qYprSIOnZR7mUR7hAR7m9Wv5qaF9zWMjP449MPHu1EMzL+ghbsWGv+b3X/z04y99' +
			'8rVPv/j5z776/jefW4hZVevhd7///v9+/OpPX/3tzh9fu/vN7uyDBQonj0RGaB9X' +
			'II6cPIJhQdFJVeTCjhtgAUEsgHxEQ1rUXJ1pZUjnvcHl/694s5dHAWaCYNhfIbfR' +
			'nMyV+mZ0n1lyaQDgQnr94jaFQiwznRxOcag6KmqU7JXZihO7nL3V1uk47jpJNESp' +
			'MYwemgialHToM5PChX4B8HrQ3WtwtyAgkH5kwLR8mnI0r40K4XY1VcSxABaNEY2G' +
			'o0B0RFcPem91hmxe4qk8CCZjX/gZzpWXXivjRqGhkC6OEUkYPg0rEGJin9ZlfUGj' +
			'ixecSAxtco4Ql8/1LG6p3VgOyH0VCb4yGY5zhnPhNN6pa+ApfBv0XeYptxuoLlrQ' +
			'BRniAiQGsccaORvFX77Mf4ye7rcyWTFS9Q9Bxny2s77Irv/1DPbtD/w5xDRjI8HY' +
			'xERzampmL9q/m8Lw43znxYGvDix4rSDWSN9f+u3m3endzgNKAvj3zFEO9SbcKpRN' +
			'YSnOoey4g28cFhoRY8dd7KG7YXKsGCo0YmE02GO3GIQfvoai2BaJNi9nSmdZARih' +
			'NqIH2lT4VZjkBhpBSpGSssW917pp2/WOVPSpIoNpiSwBjsGnyIIleD+4h+mSLcd6' +
			'jrGrdI+9O2zNjdAA16dbSs3S9zM1QWoX0MfLZu90fXoo1LAKZM4MPbY9A4TVmeSX' +
			'mhq03uuKNJMz00PRTAFMoBKp83+ilmbt/Efu+XrxroJ1WBqB8ouoXmZrrLyq4nZd' +
			'+mD8wZTK9GZq5OjIkfxM6uX+wbJLXVlvnG6zt038QJVYEn8VtWKbFRdD2Rppo91l' +
			'qJfiVVbdGO/yKnciaQvYoFdfXnouYwOXmstJWjyT3NR2cDOpkwS4sODUhg1rZGuU' +
			'XBLjCoE4ol2nSCDZfOppxa25+IAlvNgHOgbD88HiAAAD4IC6K5Pv2IsGloJhbO2s' +
			'YPS7UDHHSCYOIBwkA+4hKTrx5ZQoesVUrJOdLRRuGjQbp+KfXdJNaU/Kist5XF6M' +
			'xEnucQqiIkV1yR8HWS1Qq1SEQZVIzLtVz3LQyzIEC92WDq1g1p50V3hsFT4ji93q' +
			'HFRxlZthwaXhQoUGS+ZKzC8xGHRlhBbRCBLUiONaao4UyDjWTqysQ5QjWLkMcsQR' +
			'S2woVNzq9Lge5TuG3z4aZiY517CJI11C7p0ynbnlbjBdxPXnJS8IO25VJSC25goi' +
			'Mu2Snu2AM5361usYnnUz2ayNRl017ABzf+cE70ZbnZCTa27zAYw8ykqsWSouI8vb' +
			'WsHr5mmdqtkEkJsGE5Ox3eyQ3DE9wOsiiPnJrM4g3Gg2yW+m2rSVqw1pZGN1m3un' +
			'968zQOI31gnCHtyD0ZbNhJ9uXpFyupDQY+5yOFFTzMkOhxCJAbgWJcc0GaCiSc/l' +
			'COUMOB0AaQhCKSjWQxYQRKGyEgDluuyJDEsr5L9xOx12OkOBaivgYs5i09nZ2ukQ' +
			'K1dyiGFEICug/fIe4N+wAA/7Qo7Bt8tfOxHG6JJ+B2eXAh/RC+3g/+CaxWXumDkY' +
			'5ZQ+Sqepw0dzT/NP0l2RZFUCg6MKcM4lGDGZPjLt38KzFTgbnM6A3IqSJiQ7SI3r' +
			'6VNwZRo/Vz0U38luR39+jyashWIExGBWQ+lUQwwod8k5DeYpCGOPCRMyUWMlI6g6' +
			'vsAo4kQ5xxwreaSM7wc3GNjALXxeLhfToKSo4CAwEZQLOmkXBWwULhIva1+47RnK' +
			'ak3fgmZDei4ux42tUeioCccNSGniMxYlQTA4XGSWPrfEHMGAzlj52YeTDxobyYMz' +
			'Vb8WcjGvlPxdepTrSVkl0EHzntW/yQVm1pjmloETsSMiZBQVUNZFox7mLrl7kvoT' +
			'SOAYQUHBkZAiAIDcA6cJRBeRR3ooc207xTV6rkO9Uy4JZVNYiGG9XpZdGWqpEKFi' +
			'dPG0Pm0EOUgcyWYfGcOZx+b04/XYR3Ksj1d6MqHRhyVKzw0cuc+VH8MKMDs8ZL53' +
			'99OmSMDM2AW3DCwuFsHlioQ1spv886heJjG7AnYncSByPXcGjQPHSo8y0qw012vN' +
			'jxX9gqpLi4ylyKgqnajeqpqsoaopb21t97RD7TnWh6tj06FaU5yRyBKbOX3y93Wo' +
			'B99eikR4hT9BSLiJIOCUaB4+AlnI6qjAQVSEsxh16mdqNFINuWBQoDgVgUByM/9H' +
			'/7FhH8TlGIRCAciF6XltWFgcsTkmMImBYCgWhVyquTTCNTv1rBC9U7ed2gjYSkEd' +
			'wbqqCJC1SeT0ORIPOUYh94BX1sLUBxH5q6M2rm1dskL+xKT84SP6dF6dvVfDwJLF' +
			'Cm8tygb5I3qK3mC09LQKNZckZJwSUkIpIW/s3xWfNc6u3FfvzNEPOWCuh+zwg3bB' +
			'vZRx4PhLTbkdzjadznJ7QLXLOAVn7JnW2sLMUnvQwypQ3Vl6sx9seTAnYwRsYZ90' +
			'v7+YE4sgfnt/51yA96vn8Jeaf4BcvvwNuOa9z+TltaUV6BBv/xjbzo2A8RmLF0Fm' +
			'AHiI4wDbRtKhO8+BgTTgfvJbxPO3yGSALbbZY79DTjjlunue+NN/Plhk5JV8lE8W' +
			'dMJN+AmK4IgM8cf8ALBls2122O+go04666YHvvZ3j7jvpBFOwkv6b4MP9TcX58Kc' +
			'd9qMkz5y3DFHHXbIAQOz4K/8/curjTZYa5UJDADxcFCQikTsHV9y0+U+6w/AzUJT' +
			'76y7DwWDAFkN+ibCWvN73b6CRjwS6GwhQFeDjBvufWF9+Y1iqQi/ssyNCHsEfGjl' +
			'4sXQF0/+RBYyDn93PfCe+Rv5jZEXAElXlutg/6DzqCnQ/7D5EwCKxJ4jc2oEIbAK' +
			'0t5stXSyUpE6lYCYtIxqlHFCVRUYXYv0dtbvyaQTjbtMFXRx3yyKqj/1q9UKtx3b' +
			'snJcq2gntl61tZHF1J26qGPtdG00r+f7/rY2MLNC01ge7lOFBJQn5D1KpxDqIU9H' +
			'UAbIszJWlU3ERYxi5OtINELipnRc2iUv4yUSh4FBJq90PJNNEKMY+R1IPZLVLTEw' +
			'diAty8pqxChGHgfYvVHiXImDE1YhRvEIJG0161gjdT22WCJGMZGvgaQAmwh1W+d6' +
			'XEfarhzxxpYWsUQfRZIDRcxGAN4v9u7HjJTYKkfyCrDEgNoTFqflHMxQlcBqaHIk' +
			'xofGhhwEKtSqI25KAo6X0f5A16QZfMx0EG2XU3bNakAsRinrn1mtqNFqFX3uHG08' +
			'qiat72zxPP8u7Wzc3dlgq7zsxoEnIjkR8IGGWA2aySuoonsKQ117x5u/iwK9XL5U' +
			'b+8Sc1N7R/dSIErgsZCRoWoW3b3wXUiVDUQIYlSfmDjAVL2/eT5HKxYvSQ2Xr8zj' +
			'DXUWlvosujQxsuMX/P2EMlIzuE6VmcdFtQC1MUmel/BCGe2thONf9wKdYP/mw9NU' +
			'3V9Va2wV3Vi2K6IGJSch6u4Y8Q54yenE5S3HdoJk3VCV1I1QM4yBUsJu0eGn5/pJ' +
			'dP2pAMcuBlf+LHyFnJrVpp+jnNKOPuRh/E3pZuO9kKUKTVfjXG0KCn6v9cN9RjWx' +
			'XC7XXSgU46eB/j4ShpyFkpkz1ENrsTRBBbAAqDqQ3wsvFXzHkQgQKsrn+IX6BHKt' +
			'IU0N0+5IbmbUItbl3MAmsUOfa4/45ZWktKE5OYMnlLWq827prUQYcy1RRC9OMfCq' +
			'qkUVg6MIHti+tXcJJ8rIFDJYcwqg6soB7ubGcoAVStktBWrlC3jeiIXHzaeOOG60' +
			'mBI62FB+A5cHANhXIIR0tFylJqtQL2Y8wQwWaRGryAj7DT7bLb15NeyQbnvx2sBL' +
			'manJgK0x185xSmRnObotg3GUBVApFq2GKucqVOO1lpbbWGRalI8HqihQ6QwyeELZ' +
			'dT0aDPSX5xKYxdFXXt84wp7zL48wxHLEgDJG6qMU6OnydD1O3C6hveCtRVD2yf0o' +
			'8za1NGjVM61jU/dy94m8QvfJDXSKTEU8NKkmeMwQcuQ8R2uNZD6FRuyV6Oxi3OeE' +
			'IqqeGMMu5s3i6MuUQpWXia19PTggagERm87qa/VL2a19WtYYeOvp5bShFm1zsZmf' +
			'wRhZzkhZzyuYRAdfhGVQFswKaAqmavO5kEbG/d/BXJq+5s49qOWcrs3VMgUkmMJB' +
			'Y1slGK27sMRY1tGw1qrz8GSqbplioBbjEasQBbupS1RuXhqORZmVlqYj77aYRMxV' +
			'obLWN/K+wzcjBt5w2hEgiHXb5GZn3x7ecoJm8h+ug95JAWNo0lR8hC9htWePN/IR' +
			'YhDvcLSmm+AeIc1JiCa+NufJFa298UMsVUbOesegNWFQ2MVmOUsadqpx5+RzudlQ' +
			'u573AHEPGSENgbgp29fMLx54oTZFUyyCnibJdI1xgWWCRWNrae0afmJ/4UORLg0x' +
			'pvt3TOmgKMXGwOOdezd1Y/Y09HjyDJpBTrj6C2O67iAVMfBAtdR6uHvD8n5AQv6j' +
			'MqGfSydi1yFMLIAGBMDPE0xHIDOqf+g4ul7e7ErAa1ORQkBkaCLV6vxnr4rU5Ilh' +
			'QyU/3Cnfsk0cELfgLt7ei/X6MlqVqiYmL0QXwH9nEbOkgy2zzYcFpGm6H3VGBAUr' +
			'0KTIMXktwjUupr6Ykk/jJscYIjAKxx09JHepX9FEf0kYFImON2azl10zxOd58M1P' +
			'Fl1PJsiFeWakMXJ2JD2bbg+RP8U+49dRL2bTTf7W/z39gNz8YVOE3wW+agdT0Cei' +
			'kSXk8duJYlJpA3uK6UCFCVfPh8B/VwRdV0/XyR7Ob37kW5TL+p7pfYI5+0sZfDg0' +
			'Ouwd4oWogUeqJWAFbMWBYw9SMBV2jahWzetBNH08RNiPhUM9QjssuPtgBd/5a6t0' +
			'CUY8w8A1C50Lb5z+tYkR+hv6ViqL1oYbL7QHojdhL9FYrc9gbZL0ZnXbhKicIupV' +
			'khSAl+wOVCVmTm6ZcEMgVbmFjsoMoqCTSHcNmponknf6smbMEQgu2qzzsqUzkb6/' +
			'PUS+UyjvWI7qVMU5/pACb7bNeMtp2sHPetzNYqzvXOVozLHS2hsc+519257bUnLM' +
			'TnY4X9o9QHQaz0Qm+Yb87g71UjDG+3Bfk301REZ/F/8HwWyohGqLMgGxqSVsfkYE' +
			'WG9v5XMiMb5V/PF/hsJB8MK/xCvltp+SGhiovEXLuRoeHnY1ed8mSxMsAN/lbYzM' +
			'10tru3dTQ6HfFwsb3vY+HXq0B+bqLqUeeo6q6oAmIZCGs8BXot//XGyqcPRzM7Su' +
			'rqYe3ZNAaiHJ0Bdavqkxs70HtNJti5yqo2/P+HaeyKeqpZ5UO2au4qUuIg6l/QWc' +
			'fWmBvaO1tUbdrlNRgYguIEKh/emPU2Exgc2+2sZDdq7Ucruzdk0V35yBRTbgc44Q' +
			'UYBqueAvcHSbumWIVgXdizJfQMdgLJS3q47TMFIZWXkUccy6119+vfhy0+/Fa7vc' +
			'rcPAWag5ESGJsru+o51IGnk6VmG/RQAgI4tX1jBVkUCnrR357Bv3qngHHTm3QmA7' +
			'4OGszU+44iJS6LaAPdskku2o1Weoou+wF7ZYzBLp/QkzllWoogp0aj9St6t0jMsk' +
			'ZI8eTFBVrZaTX75w7Yzt5k3aibTe6MP+bf7eAq6n2wODOWKtJDZ7XfymoUrAdmbQ' +
			'dQ6f4OqAcmNwLSs4ViTkefZtv+RowjH7pMHvRhc/LQQVQrk3gyIjvfb4h++kIG4r' +
			'mBdosa+QSQe0MTHSpLA6R7d2q93Z1+3bV/jys9RCo9FWo+Wrb05ztDAJH+Kruf6Z' +
			'sjuYm0nEcnKVdjDh74uhkasiFqsTtZ6CxKiEbAiX4aoNkY3MBhY3Fdftsw6LbsW0' +
			'syg1/9ISFAoNBgH1V8+DlpfWOMzsg/Y45meoupym15eviQxGCrHsgGb1gLOdvCX0' +
			'LjUH7nkKPoZPgUWbeBbLXN40akcYDxLhEO4YoeqOaqHKMawpOWRrI1NslmP3UaEP' +
			'P126qZ5uOu7ISMELfTEkfHBCYpcN2cW3rd+2CtnZWOZjwiihW+HsyFlv2Ovll8zU' +
			'ZdzLTbHIDV/rtv75Q1Mc/XJ81DOyGd84PQVew3aGtB+mjJC3CG6X+HAWVBXhC/Fx' +
			'TgEzZ8+mrwG1Nkma84OFEljYLglooOrxZws3VoL0p9Cui/+UULM4Lj9lcD1N081G' +
			'+TOWUrAXOI6PObQ20q8sZbbW6RjXgCrJf7jV1x0hFr21Mxk0Lbl+Xhmdyth8udPR' +
			'SHWP+7wPDEqlEaoudNlsa/Y7DnKQrnJ1QfkrepJ4jnTEtCXImL59BWGF/lbTRL9g' +
			'4NHafItFqfd6SbqYguqUJv9SUV454KzvkNy60uUA5YsvnsmyXZPo/pcinGArd7jp' +
			'0ZeToAVOHQn0w72rW85alQ7FXoyaxIVXEdPGz2WlYk+uGEjPUpWPrXWzbSNvj8W6' +
			'dAaDsGrhrqLt1TpUsGhZ1xVq6daxaJSH6JsBAR9+OkeEDiDu6X50ERpU5XfM1Dq+' +
			'P1D18MLD08FPtevemdThe5lHcx5PrphtbaW58o3uSSHdGG+c0s8I42fL+qRV4BzG' +
			'4yFYWC17mFzB0Z8gX2zTCQunrpf0kjyDdo1psG9uhTPp+crlyvX1r4vtmnBGUVkN' +
			'tslLC+nmf5fcUtInBvu8OaXZc30v3rSVpBGviI3SZtqNK2lu68edxhFXuLyIsOQd' +
			'R6/YaDHpOjVn8IZagCXxiqCxI5a3AAtJ1wbW5aaxVNKN4FU6JciRlUMTHaZzXq3Y' +
			'Jr5LlPRBDJjaf3eKL+3jqKqW3aGwZe5NZcnbBrUJoW9q5GoHUGHjjMUy6aa0oluB' +
			'DkZyr5C35FqDbQilWGlrBPefmvQ4wVp7Qx7efbp5pxQguoSzkpx1Rv0lal1WFHvn' +
			'1XQaF9WMEcY7hcxy+VL52vD+MWrkcz+vCArx+LzZ9C9z0mIZkWJ7Nfq96xpb5Txt' +
			'j7XWchmfyhpqlqOc2wucidonSszBySNP+O0D/7p7cnpdzPH3bOCjUuXeu9JewOn6' +
			'vK38z96BNIcXPwXvvO0dRCsZFgV6jfq203Lk5bYzIeLe8biN59yzvofidHluqzxB' +
			'1/GcaniTpBPkfT7SKUN6r6QCNOQyKdCg3pes6MWGzR5iJiQ36We/vT3U36RNnqo5' +
			'ahlD+1TjbHegXTStQlqmH9hhRRThhYPwlk4yFEXWclImNj03A6ENcJeWf0ICNw+L' +
			'pzVZnGCWyAEBWB9bJ5RCUJLTG9tI2lGTJENGkjZddJfL8VFUhNCiWwu7Wxwv/TfV' +
			'VCzlWVpn3i+Ixm5mLam0lqSIGttOfDxuixikxB+m0K5xH9bGnAIaSiQCyzs5f9Iz' +
			'3TY35/V1efrqn9DePuSWCCca2+/0m0GSIWofGIpwyLxPTTKtzSxUMiWtMJnulPzX' +
			'ECpMOVIVZYtX4s6sGTEvxeaGLRyDOEkHXkxHF4NRqDQo2WQJOidUBdMgGhSuEWu1' +
			'LSYOlJqZetLR3XRFNOPWZ02eUbaTR0QeL6eLKY3hT+wMJ/ei1VRtCXtdG7v2wvRi' +
			'wHBjHhucYYjZZ8ZmKGlDM/SjzJMUJ5iOZYvFcha7giZh4BaU9LOgnnrm2Nva/dqz' +
			'pn2vuNLSSiiSlpKWTUu3CY7GSsFiiBPgpibhXvBd8QhJTdwfyztVVPMDfzovG3tv' +
			'4DgaHzy3u5fFdG9qA3N7iCg0oTC59sKoJVmSSpScFAGNCtJNgZwkkkORhcVP8+mr' +
			'dbV7io9IdnRaON+Ejex6xbeEeX4RFgSxTIjaRdzFeKjxT3YwOnBZr8x5ZKy0O7M3' +
			'k+9eZgvjof3kz/RElKWpB00Vn2RF/FkuC7OX59n0AG9MywR7CJvJ3BeoND4quFB1' +
			'stdExMRU/JbZsu4RfTkw+ouLtdtHlgm6V99hlD9xX973XOZySlX3HywWj1iuE62r' +
			'Wc6NWpMcPSWIuSR63R8OfuLGYVSnL/ZGMm9BztMLcP/Yyd6O20Dm0SF++KXYa0QO' +
			'nbAEpd0sYimnFGtIYUCbEpBJ2kIVtyLxOKbDMjeCMXcraQZ3E07eSvoCdx5OAfvd' +
			'lBaxoowmiBV1wUiZLKcniIwmK3r0L9NwrBSClfs5jkXiyZqVN4/Nozze2uzXxHEN' +
			'fvpUg0U/TMHeUlNS0mbwLLKA4WSumqrYiZ4h6PAduLQGKIGvhxLVj8cKcId9uJQi' +
			'Pe5f8O86UIdaw6K1evQm+0FomwUHOQSyDV87w3xPD4Rya38M7HkDWQhs6NVsOmQl' +
			'xDE7OTYcilzMMHzmQ8HgdoXL3p6bzR6Pz9K6IOuRsdZZ3w8LdBwVhzZy+z1kLZBq' +
			'moylT3Iqcur+eIpMUie9Tm496xmMEeVs6T5cu7H/6IGwxLjisFNNLFWyOqskLc6f' +
			'IRtJXIgI2Z8YFXU2noIAzT9TNLwgAi1NSkMiKzG/oZgMdL1/NRBGrCTLo5MXmH+g' +
			'v+GS7xrmRVOwLTzKkUoheehpK5ZMJOvc24BlDuVyEYJGJpaWE/biFr0glYF775uO' +
			'XXmx40IEHEPCEXx7Pv73i7dOTUahYQCyFAkwe6jyus/ON19VvOPImj49Da5de8/3' +
			'J2XCJOP4I9s2ykgOd/RejzI1HsuiES2KPCoUnYcK1CFQyeKKtbOjGeeqOny236wx' +
			'q48QXDTf2fhXGQgVEnQQwyGdWrxIhhFDBkUjg2S+omaqmACHNMRgftPhEbshcCs0' +
			'iSIYbwGvMO4ggtBPXLi1zj3NjCV95DWAocCzSMNcpIjMNLFyoJEGUI5E83EUHQrk' +
			'Ctb4HVa9858C85+PBFPZhjn3E7K2bVZSERBK1rb7CWCk9EhecHzH1muTeanbV9Ze' +
			'bjpY8eBbR0dJ/JJJ3VhzdmKwIY4oySnRUDp4yV+AvdtyHpUxrBgyihWIrCLQTPMk' +
			'rHefC3xumwlcTv0VTkD43VUj/g4seWVcNTESTRMra5oa6tsn5+Y26PWSu/+TWfP8' +
			'u/Md9k+eP9GBvmB3TL83LqF83KvD5iRrvGsGc0OLg6MiENgIZnm+J7bQYYxwGCIl' +
			'kMu/83+4XlYqvRHu0UszyFNeIrCvQH2DFcjQNPR0uRFCXfQXhMLesuwvJHKlHxpl' +
			'MP4chK5HzdELV0H7uFBo6KR0d0LcEO1LjciQ8Gf5T5AUcMX7DCZxrW1lW83IWoiT' +
			'mCwmBWVtnhhzNekJeiwExdJuKo5Myq+pthb/iUY3wkkh++gbVEDA2x2d5G2F8d5a' +
			'wf6fo9ZPiqKNR0YsSpO1obRmTtzA61zb3MK0maWDPgmL0nWHpCf5SSqDs1yB/D/Z' +
			'2u2z3CsBP5sKiVpDLc5SR8sD0i+uHFGwSEiFcVXpKWhE9PQTf22dbC4pBaTtlRVz' +
			'vFqz0jyiiymOzziRfHJYadnrzw1eHF/9ZVOwLcOmXuXbd3DoKi2hOGp/BkmXbvL5' +
			'z6rihWWUci8ETg753MuDpcMhIa66FJBJxKeuogM3q6CgVqMzmvM7Vq5pSoNYEVXG' +
			'64Q6agAb80KSnR4MVyYvqPxDou3oA4n5h/wOKYTylthSlkUZFjREDwBjR2iz8Izs' +
			'eEE0UUJjk59HdnanUVGh2LW4EWJjx0xOOphAYM3GkFPDROKbq/dT26KV8V9+R5ym' +
			'ocOTKhP62+szsOqRnKtuHR6pAf1uHdL0hsKboF2DXpQFf9H7FkgaS2AcIvX6fdw0' +
			'9CKLoARpCqzZED4zyapdXd9gSWEWtyOnS5ZYbp08xpdiPXOawqQ7//X/LnJmbTtt' +
			'Ie1jvV/TnF9vmeMqrJ7EUgrhOh4NAyEJ1aZUTaHBt1Angizz/+AOxLaBYs+eEmdf' +
			'UY1qfoPKWMaVp1lilqc3aJhHMzg2Cu5XVmH5Ra06vVS5dKmk1mNN8icOIwlYSj5N' +
			'UdU9+mFmAV1m4nssV0lCZVY6WAZ/JUQ3p9OPJ9fBHmWiZ9OnnPGX/HGVaBulkewS' +
			'lImsKvv2W0uKGsOPCaZ5Z0+HH89KzxxUdmDLSrGf5iMSGY1MD/AloGw6WM/WXG+s' +
			'r7zeRC9LGyqqzntyQtd43ymTRa0oCNJtdFw4RjVDN+y+4DvlX8jz8qegHb3rOvOI' +
			'eaIDYCzy91x7e5FMtXl+ReaO3KZlk2/yTL8EDheblRlX894fmJzliVlX0rXM6lsL' +
			'UAg31GL4hNpMaqgIXBnu23JveqlD3Z+Zs7A58bfq4f3755nyg9NJhl5Mj27qxnqQ' +
			'/MVqaMr5oHDpfai7bUc1XgDuOzqAKQHtV/wMicJAuupfaA5twaQ/ouGvLnu2WbwJ' +
			'Q7yIjtmmguR5GJRpXRn8W3Dyi3O8Z1sM/3Zr0aigI5C6k82Y5KUChYosdaKbTCgy' +
			'YkEoLUgfW/hGDye8wVVR3Puj2JicEsAFU2EaGnMOe8GbEMLRPbuMx9fPO/f9H3uc' +
			'4wnfPOY601OkQeMXnq3pOTyna47GE5XS3cEl3+wkAPWeH0X45ci6O2gzaVDY4olB' +
			'fJuJutNCR10uGBWNiQ+z15AuibGjQV7cQWkX7VoqUr4ITJ3FXAT//+loawiEfIPZ' +
			'EssHA6ecjNi09oz2BkNzTMGY4qfJnyqV2btp/3YmScD689Bf1CqfdHaR3RudPCnH' +
			'B1QsW9ac7Cgo+dM75tRg9LkVKf2lHWtbdELFLngLJVRQC5Mek+DAhp3wk5WI3CPh' +
			'N2HhfMmtiI0YLLz6L3jhUjIP5E1OkccZ2sIG32hWg5+nzT23qC2OjO65AOlCIi5Q' +
			'vuPiliN6UqGHk2xtxpbMPEdBbcsJJjzjGAxshI+8lGJaABhIQdd+kH+KHPOirtGp' +
			'DOahZVuZ2fq+qp0f5cxalFysi4OPKBE7D8VEwUYkcszGD9V3zhDA2cjEob3m5b0t' +
			'2azLR9fnaBfyKnMXzK91s8XDS1b3TO7ei9mz/vXUJuDTr8N3iBL2ZDIqx1e1Pb84' +
			'n7SlCtLcgI2xHDMshqajKRBHvPkjW9hnYF7f8YXZnySHwHXg4ezPuqp9H6okjXxU' +
			'+lBxzR3evnjX0fEi06H5XTlLmlLKDX3nwxmZbtXWhXOT6svilgxx82Nc5aq1z73e' +
			's2U7CEFg+VnoCtEx9hS+5nM8BDhc95pLVTF6b21opl3zMlVWhPuntuJ9cVgk4mW6' +
			'kijNLC12Hhgu8/gY6DVUzwpPm/3PNMw5G1iKdbG87K0p4NBH2aysZKyLEyUnLhD9' +
			'0aBIHvI12K0BbJeoiFMkcgWFp8a41jV25h1ICcQt4RR8tN0ZWmDod5lUxvhyboek' +
			'XGZMa1S5AX5NWFbaG3wcP51Vi0mh3MfsSg3EJcAPpNL1xkmsIAaUHHnZdUQiuLyc' +
			'XBfQ4bMlZY3dC7Us0ktG0lpOrEyZo9D1umflaSK9GH5p50GA2z9Lgm2VOHyknF9j' +
			'XI2Jv3CKos4aR+XEN6ti98R8mnjFOxpu8n2v6gydm3gFfHQlkDpoI/ZswmaxUn8X' +
			'qyyl/uv4G7krT23mlxTi/2POkxfbdcUJ2QQHe1zAShtWCvRubO4K3krtSFWy+YZN' +
			'eVLEMVFqApd8bJnoBa5uGTrfP2JHFHSDCCRdzdrfui8+6+Q3b7BfkSVlLf0fnYPF' +
			'ZEVn6DPS1AE4lyGlvm4kuVutn1xvcIt+J3OcBbVr5qzWDfo514jQIC1ptbKxx8+3' +
			'gvF9KAae2fhr3v8V18SE7wNMh4fmLlv2dRx2QJgutARnFY+CpunDWM4MBhnduvcm' +
			'vLQvxj6SEIQ0bHF7urHjEkyPrd4yK6WDjF0fxBaDaV5YJpNMYy0pwfeziFXiryid' +
			'BE7mOhgTT15zBJ+zmxAeLQoDvA8nY/fYmeq10i5hMuruPbZcmCztAlbSEIy1WER3' +
			'seuJfJjQP6tEUkmkixH6YQPVg2aPmLG7w9V9EBoBaFtB2bH+MDxMFikaDawv+UzY' +
			'sya2zr2RwViCI+ROVFxh7FSdAhOpDsymC+hzZDQMOTy1DYlgYAeAMvUSBpVCQUrS' +
			'+WWucrxjmINyl6aCDhG8xZdwhIGcMj8uSQq6vRvjUul6P/3dHZy6Knx7YUusm2us' +
			'hjYRipzfc6JLP8uKvROjj3QAy7VjYlQx/QUgRbwf++doy3d0R3bPqpDZheWDnvxu' +
			'gmXh/F7/7xJtE7aYhgjBiTPMrPo8DwbM7ZD6Fd3T8UuTKgS99fGpkfGxT8+/42Lg' +
			'iomuDTllrsrwiuFMXY3OAngREoVPwV0cIVxKt8O87Y1ngixRqpK10vmZFUl+H/7m' +
			'whrh3jxsoR+huW+Z+Z42eUmoIE+gTKsPWhDLA/Wf0lDxNn3Zr1/HC3HfLxpxlVrK' +
			'stbEL2qp6LSFhfrWNPlYx0LtcUJ99Cq+2jOHYj8BxpHU0CEsnfjX0Lct35Noibx0' +
			'GJEqqT0cfrWoVp74lI4qFp1XD9f/3org4jwoNYv0zga5w8vFXKpygp9f5Ertfixz' +
			'PCLv96b5D63miFB3QMGjH9imchK0kJteWjOgbVrkPzu7WHMRl5ImLhQnFc8USeLd' +
			'KjEO6K6hz0a6RQpizU41+pjqv+4gVQ5uGKbDrFVBGL1m3A1usCoHOwwfYuRwxZFz' +
			'BTuUc5kyMPw1UhPyNVsYBuXCQyrDNC8u5WvoNXBPGYA8Ee1kHYMPg54hnv/fmVgs' +
			'RkIb3YV+MZwXn4z9lqoMYHFxPCd+ehG+SlRm1ITxz+CJfPFzMO97YDYDI+ICOru6' +
			'brsx/uOdMcsscYXOszZMkFVMDvEWRERK5FaZ0hvLc9O6Ym+REelZKPgktqY8NJQH' +
			'cjNLN18QI4tmd+kRmbjlltN2YMH4ZI1xBmKZAZKKspOWg+qjuDEGyIVimujpOdff' +
			'KqMiq4GPfbRWpcjXQ1eu0M9G6Da4uBHqHFiZHJIVjE1jSRP5yEHIInTJKHjOWqjk' +
			'C/hFzM8L5XrmU8L2N5vBXR6VFRSYixyFjFJzubKwfkwy795qNneEnov4BtJIThGO' +
			'OAAGZiLmz3DS/2qRhSo9sH4wLKwFC38717L24/45F3x1pcMuAj7FuKLtvcSYU7/O' +
			'vSReng7ahFAXeamUi3AhubSllNqC4KJuZ+GWem/jcGlC3uFMno/lGAtDZlHFWmOe' +
			'sVTbD7qXMXuh1Wmoqg3/3fVgWuuzIMPefPWEXvy1ny7cN5teEZSTEtVGaGWmWhif' +
			'sF3xE5HBeuNzcSlYVxzAHOJcZLQys5m/Sy7Gwy4HEDJkNo0uzJlo4GF7BK9yoigh' +
			'IldYF4haOMFx6IIcn3oZPvZVlbHBnKpaFi7jBhPS3hvla19HiC57GT7O56EJ9c70' +
			'mCxNtDyQsocI4qZCXpE3vwxXAg8BmqqfxWiGWkmI5WSMFZrKlh67IKtihwXHQj34' +
			'9iCPlPKIo0QxPH7CBu71Xtji52D+nUXFS6K9z7P3v6sYiv/PzmMkUPvdslxZjrqv' +
			'QTs3OX2bjea8FzEKcN+MCAnjvGRuinpBkJve3fVGTfqhZUX429XTV/m/1u6Rl58B' +
			'1tb/c5JqtTWF+DTss9C9DN+EYpmMKlAz9H4/x8NEAtPqYEUTHeskqXyLU2S+6ES6' +
			'zuhwrqdeMI0xPrNe2WLKs0fkaAD3LpKLXUYfNzQGpScs6xOM0HRRjaH52w5XKb4M' +
			'ZHRuVlrM0ctml/d+pqZypv5KbN4anqKdAIFbbCrMML6Gl5A24Cu8nWdkCDb1WwJD' +
			'LbG+Kg58DXQm//sPd43N2+w4XTk0BRYQv4gr5yKKBqOmBUwRxYtLoUFTwVLjKnyP' +
			'gFFKbd6Lj6Owf5r5YiDaJww0SwZYOib/KF/fag11jyzZAX7BY+XMv8U2fpiNmo3L' +
			'l+R890D8wCQwi/l5Qvf/WvKaX58aEDcWQqpW5i1Iu8yG+VBOiQ4k3MILGQIC9SrU' +
			'R3Ggbt8DUB84/EuRv0qAnRWCWhhAqAu2BDKOyPHS4/T0w2ENUUCf3ccLLAgB6DKl' +
			'BHmM/C+ZcVlgTkerrODTRTIGpoCUYHZrZfVuhSYio190hxQdkKKLlrdlxc0Go3cz' +
			'PX/PUtbQ/TkfLBR+9qeKGJYvmgfJkMGwc7EMoigODYHatNk6j38a5ICXBfEQ6DEM' +
			'WAbGV/BgD4ch3XDbDU3G36I9VDWCRQ0jEBd1yI8kWJ9tVy8OZBDg9KjsjMD1Fam+' +
			'2OTYaDKhI7WFsSD3ecA+oXgjBlUWahlzK/ubSzlpdNYUx8lzF0RU0z+3QbKZODK4' +
			'UlMCo4fHE1mcIB2EYdvbjaBk6qi1r3Lvr8tY/tW9einA0//rPnJTL+DkSRM+WYwk' +
			'SHGCHgNAf2BduCQ8Knm/A1Ikwv1BqENQ/oKA8oWkEP/haF7QePhIZHKg06Y55Zc0' +
			'uWx7OiMAjUdE13ergtMYbE4aKyKgbvjH8gi9yZlQxA9ibvdvPN6pSpReDtz7XbMt' +
			'BstuDwELhwhhBEGgg5X4QAoLMRE5P7NCmOBB8tTu15fv/tmzBxzbOhtdNtn7aPvQ' +
			'12ObSnr27S7YufI3IjNNIIhw6RtS8kJYNj866hE9kySMSrX+aAU/5UGd/rAXGg5+' +
			'ASlUG2RWCWp8ugwl7XYd7EQYWRHq2jrlwoLKCeL5jIRUPmYDk/jT/3B6e94qn7RJ' +
			'Dse9Jh5rp8ov1xxXEN2u7pBtme4TEfXug7Sf+zfvxzqosk+HQUz6/MkT5PMH8Wem' +
			'18PRsrbp/d8eWFGTVBC+Oyrzefcoagj2K8nCyLEEhemq+OFuTTPnHva39rR/lFie' +
			'KFauYeAiL+FoKA/hJTswgX1ShwcBuQXeWnt8RV1uW0iwkdKh7dTGxO0Cx5+h7QY4' +
			'30PA+mywIYRNQiDiVaqPGRnUiu+elfzVjIA2CgktHscLpGulH4LkQqFvIFnpy6KR' +
			'RBcGNGVMeA7zlGhk4ywvp52bi4Zngu9XZmUHxpbiHLRxN2fBvjgYOIIMq4tmC2Mv' +
			'/RZbhDaFnCq2eyZLmCXMaXqRmCLMhsFod3Cz0ZmMb4Nn0mTrCYD34RSMoJjGpD5F' +
			'P0ac1l6ktOHC9mjgHHQOEbo2sgp2Qpk7ryTTZC943R64wdGNOXcYTWOCEkX26rP1' +
			'G1WyXqwuiZh7A3OTikJqk7lKAeQpHRdY0iEmI4jmalByvjIlKsP7e+7Zmjhm1HT8' +
			'6tDVIHTaZFeVx9t+Pz1AVVysOOz3cGVGSXCPW5+0IqLuIpR/NgDyq5MKUYmARcQB' +
			'3+mhSRzMDn/Od/SysO8KXbdSzNXM6VV3x/QrPu5evn5UzRQs3qpTxdWH9sjpR/Yf' +
			'9jBOSGFIh1+qi3VcoNEiaBlcP76XtuzVEhBRSU6NODOC/llU77aFAij0ICUgKDuF' +
			'6w4nMPmD2ZciiXKePzQY8sIGttphihTrJBy1R49tjxJ/JnU8vaYE1iwk/L04EsE+' +
			'HoMkN5sQ/4LFqijo2oBDOCvI7wp39Up8ZEusbd/rqfsuL6RJTuJu90eQ2tKxB09B' +
			'ReRS2Hwrut2tYLFVZAsSi9bkzbwFN3cHuM7ltUIVSRrZgMg9AoNOUHr6t7Zhl87r' +
			'S//MRj0vU1QCQifTOxUTwMYsQkIP17/wNiLT4UGidsMU2sdF1cZUzqLkEDTsxq1K' +
			'huDfw5hVWGHsTbyq5AhZt3G0eeATYnZO6ZiI/KKF1QqiWgFNo9BEhdVLBaE6wZjl' +
			'oxtwiEOnHj6MfJ0humz1bmtt/VRl4V0+Q7y66NRwrBa9riypNKelbK/MeI9KJKVN' +
			'LKY2nRV71qcWyCNjEofmdT7C9nQ1sAwEFzzQcFT4fIfCWPoehAMy4eFMkz5e0NlN' +
			'rcVjhV27pou2/2oOeDZHzi1iJFgHPGvtglTqGa5eQZxjTikviDMP+M/M5RdRf2Qm' +
			'y+aU2fc7Rwrj4lL+SNW77cGX0xbJ6zwpSek/W7XOM+KmS/MSUXu6qajTFjD/uVH4' +
			'+oPLH3TDVuE9PPPwDYfH2NB+F3FK5p+NhSB3dzZuw2zy0BEkriC9qsoYrdKnVxGX' +
			'4pcjLMECOQYGryaML0z2LTyaW6gbKfCY6bmeJGPvpmr8WMZSXT7noHz3JDkEYI/B' +
			'VcAF48kwq+A0F8QZ11DBE2DJhlTCZ3ZzChdn8x1JrbcIz3fswc7BkjMrQqFGPOOb' +
			'N8bZCIUpZGLr2Mq0yJTXTBnGM00vnZsEu/VOsM/JxMj/0KOSS+ypODsVKbsHiRvr' +
			'LXiFyCZNEatzImbP6/sdrHxHSb/Bx5XY42YCYNW4Y64waTXmuLlA1GJcZI8Is3Rv' +
			'8ioyJ+v7kgC4x/OZ9GQn0H9DPKrC9W+nT7ZDPf+PUFFybS6BZB+Tyr7B8zMwSA0A' +
			'2POQyFQY+Rs8Un0WErdFOIj8Q9kzVHMvMoOOjRe6v/2AFUaEPenk3pFOhdaS/2qt' +
			'jZtECzkBFirMmraFE/WGDZGI611QluzrtOzKijxHYcWcjkXDnTqppURqT2sUNIyn' +
			'8+BMnQZ4+gJKpyFYKszaqhOeoZCwVbXqs39w3we22fpX6feYYmXN1LWj6VVdzUSe' +
			'vLGE02UF2uba3Ysvdvbzjlv9TExU9uXqh/6weHjJatjIFvrY2r+nNoET0cj7enL7' +
			'a6LimLKBbMzdvGxtkTU3i2LjW0ty2mLTjHl9ljhT/bajkFmsHFL97D6dXpbmNKj2' +
			'hnupQ0RkZi6rE2rygUEk8n+A+vvtR6bng0Cw6d/XaGItgXpqwUok4ipY8j2yrvdR' +
			'5qgdcj5DxG/mk7YohEVg4RSfU8cUCD1sUnVsHktkYr3yyGT2kNuHZczgztPJPE4d' +
			'n/QF7hA9WL3HwXc/yR1BwiLFFhKf3yxiNH3EFa0ZeaGXc87yxKbo9S59cJZd89qm' +
			'rG/gtz5PUBg0J+ve5ZIoBO6H0OlWquJiOVBN17duYVDehB5uxHO8VAWuHL0F5zbx' +
			'dX32LGdoEfPpcLE5KHNXztdrCzi5L7lKKkQYYYs4hIx8ReFkYATjB3fMcWVb2Kad' +
			'9Sdiz547l1dteAv/Vqb8fJ4ANCdo7W5wUBhnRPkJAFvQgN6G/5EBP+HV7PdWAwn8' +
			'5p8tzy/w5+q52mCISx67cg0IgMDDz+leoYn/R3PYTwB8ti59OaJ++aZlZWM7Q6A5' +
			'0dyuf+q5EbB81VYHd+XkPezjJTXw9Kl9AXyL1CSqDIp4+H1NplsoJ2mk8ucPdN/8' +
			'mq4QMV1fJqHjGbW/YjUmWjdKGpTwICAxTgaKzCL8gaAsGt+KeCWJlwQ+JCxH6otd' +
			'niD130lwx/l1gqtnwnqVUgd3OZJ7p003PwFeyvBLmBzjjSVz5EseBOAZocLbyDmI' +
			'1GOd/3qtAhqvF51lbhN8k8XYKNAFWmM41on1Kb6lyM4I6a4Syzg9L8BL4jwjwIeC' +
			'fMhfLWjcgouf6LlKxyf1yzyQyB/0rZPkE1p/EeR9UV4X7AJqj+JYUR9iIZ6Hz01i' +
			'HMXzZL13CksnLp9IVI6fShD3hDlXaHfJChTgLX4+ZeqhaGuFtIaoz2ksFugRGjvY' +
			'Wy+2GWJ+E+uQEGWCW0nifgIORz05bDwEz2+EcTpEt/ESbltZDh9u8bk8JQE1DVEy' +
			'0XA2irYO2lZPBw6H6HauFnDO3MMz/C1LhyUQVQzZlSEK1O60MCxHhA/5uzlDr5PB' +
			'x+JaSjdQwMgpQZwWptFdOijlYbr3JAOS+5nabThuIu4DmSmae14QhnVwI+Dp23Sw' +
			'AhhIE9MUwZu7IYguAJUbd8Po+OpuOKHCuxG4xivyJt5PiijSx2kzNjZ1t1RXVrWJ' +
			'L24CCSF29dEIWx+X1Vd39ZTy1tYbGlpDT0fNJu1l/d0dqpfaV5Rd71wbN40WOkHf' +
			'DW+rCus0VOUtHaFlh6uNos0bxbaWDy8Vn1VZXTlWUb2b91eV7XWsWhyNNNdm3lDK' +
			'1bXdq4nbx7Rbv5Am864ZdqJRxa5GO9PHpglZjqn0ZulqqamNlzDq6nWqV1sqQ5uW' +
			'ZG99lRlTP3z4/iVw968DnxaQhFS/xRpWdHxXGG53OF1uj9fnPydIimZYLnARDIUj' +
			'fPRyp3+9Qly8TiRT6Uw2l38kyXqD0WS2WG12hzM5JTXNle7O8GR6fVnZObl5+QWF' +
			'RcVbxsZRWmHCAvOst8tco5aatNJsFy++s9uUfT5Z/09J6SJln916dWt/Z3fvttsH' +
			'h/9Tudi9k8Ydc9RU19bXNWzS2NzU0tre1tHZ1dPd2993wmaDA0OGnXR/wCEPzjtD' +
			'jjhu2qURx1x+3R5nnI2W/z0OAAA='
		),
	};
});

define('sequence/themes/Sketch',[
	'./BaseTheme',
	'svg/SVGUtilities',
	'svg/SVGShapes',
	'./HandleeFontData',
], (
	BaseTheme,
	svg,
	SVGShapes,
	Handlee
) => {
	'use strict';

	const FONT = Handlee.name;
	const FONT_FAMILY = '\'' + FONT + '\',cursive';
	const LINE_HEIGHT = 1.5;
	const MAX_CHAOS = 5;

	const PENCIL = {
		'stroke': 'rgba(0,0,0,0.7)',
		'stroke-width': 0.8,
		'stroke-linejoin': 'round',
		'stroke-linecap': 'round',
	};

	const THICK_PENCIL = {
		'stroke': 'rgba(0,0,0,0.8)',
		'stroke-width': 1.2,
		'stroke-linejoin': 'round',
		'stroke-linecap': 'round',
	};

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
				labelAttrs: {
					'font-family': FONT_FAMILY,
					'font-size': 12,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				boxRenderer: null,
			},
			cross: {
				size: 15,
				render: null,
			},
			bar: {
				height: 6,
				render: null,
			},
			fade: {
				width: Math.ceil(MAX_CHAOS * 2 + 2),
				height: 6,
				extend: Math.ceil(MAX_CHAOS * 0.3 + 1),
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 6,
			line: {
				'solid': {
					attrs: Object.assign({
						'fill': 'none',
					}, PENCIL),
					renderFlat: null,
					renderRev: null,
				},
				'dash': {
					attrs: Object.assign({
						'fill': 'none',
						'stroke-dasharray': '4, 2',
					}, PENCIL),
					renderFlat: null,
					renderRev: null,
				},
				'wave': {
					attrs: Object.assign({
						'fill': 'none',
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
					}, PENCIL),
					renderFlat: null,
					renderRev: null,
				},
			},
			arrow: {
				'single': {
					width: 5,
					height: 6,
					attrs: Object.assign({
						'fill': 'rgba(0,0,0,0.9)',
					}, PENCIL),
					render: null,
				},
				'double': {
					width: 4,
					height: 8,
					attrs: Object.assign({
						'fill': 'none',
					}, PENCIL),
					render: null,
				},
			},
			label: {
				padding: 6,
				margin: {top: 2, bottom: 1},
				attrs: {
					'font-family': FONT_FAMILY,
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				loopbackAttrs: {
					'font-family': FONT_FAMILY,
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

		titleAttrs: {
			'font-family': FONT_FAMILY,
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

	const SHARED_BLOCK_SECTION = {
		padding: {
			top: 3,
			bottom: 2,
		},
		mode: {
			padding: {
				top: 2,
				left: 3,
				right: 5,
				bottom: 0,
			},
			boxRenderer: null,
			labelAttrs: {
				'font-family': FONT_FAMILY,
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
				'font-family': FONT_FAMILY,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
				'text-anchor': 'left',
			},
		},
	};

	const BLOCKS = {
		'ref': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: null,
			section: SHARED_BLOCK_SECTION,
		},
		'': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: null,
			section: SHARED_BLOCK_SECTION,
			sepRenderer: null,
		},
	};

	const NOTE_ATTRS = {
		'font-family': FONT_FAMILY,
		'font-size': 8,
		'line-height': LINE_HEIGHT,
	};

	const NOTES = {
		'text': {
			margin: {top: 0, left: 2, right: 2, bottom: 0},
			padding: {top: 2, left: 2, right: 2, bottom: 2},
			overlap: {left: 10, right: 10},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
			}),
			labelAttrs: NOTE_ATTRS,
		},
		'note': {
			margin: {top: 0, left: 5, right: 5, bottom: 0},
			padding: {top: 5, left: 5, right: 10, bottom: 5},
			overlap: {left: 10, right: 10},
			boxRenderer: null,
			labelAttrs: NOTE_ATTRS,
		},
		'state': {
			margin: {top: 0, left: 5, right: 5, bottom: 0},
			padding: {top: 7, left: 7, right: 7, bottom: 7},
			overlap: {left: 10, right: 10},
			boxRenderer: null,
			labelAttrs: NOTE_ATTRS,
		},
	};

	class Random {
		// xorshift+ 64-bit random generator
		// https://en.wikipedia.org/wiki/Xorshift

		constructor() {
			this.s = new Uint32Array(4);
		}

		reset() {
			// Arbitrary random seed with roughly balanced 1s / 0s
			// (taken from running Math.random a few times)
			this.s[0] = 0x177E9C74;
			this.s[1] = 0xAE6FFDCE;
			this.s[2] = 0x3CF4F32B;
			this.s[3] = 0x46449F88;
		}

		nextFloat() {
			/* jshint -W016 */ // bit-operations are part of the algorithm
			const range = 0x100000000;
			let x0 = this.s[0];
			let x1 = this.s[1];
			const y0 = this.s[2];
			const y1 = this.s[3];
			this.s[0] = y0;
			this.s[1] = y1;
			x0 ^= (x0 << 23) | (x1 >>> 9);
			x1 ^= (x1 << 23);
			this.s[2] = x0 ^ y0 ^ (x0 >>> 17) ^ (y0 >>> 26);
			this.s[3] = (
				x1 ^ y1 ^
				(x0 << 15 | x1 >>> 17) ^
				(y0 << 6 | y1 >>> 26)
			);
			return (((this.s[3] + y1) >>> 0) % range) / range;
		}
	}

	const RIGHT = {};
	const LEFT = {};

	class SketchWavePattern extends BaseTheme.WavePattern {
		constructor(width, handedness) {
			const heights = [
				+0.0,
				-0.3,
				-0.6,
				-0.75,
				-0.45,
				+0.0,
				+0.45,
				+0.75,
				+0.6,
				+0.3,
			];
			if(handedness !== RIGHT) {
				heights.reverse();
			}
			super(6, heights);
		}

		getDelta(p) {
			return super.getDelta(p) + Math.sin(p * 0.03) * 0.5;
		}
	}

	class SketchTheme extends BaseTheme {
		constructor(handedness = RIGHT) {
			super({
				name: '',
				settings: SETTINGS,
				blocks: BLOCKS,
				notes: NOTES,
			});

			if(handedness === RIGHT) {
				this.name = 'sketch';
				this.handedness = 1;
			} else {
				this.name = 'sketch left handed';
				this.handedness = -1;
			}
			this.random = new Random();
			this.wave = new SketchWavePattern(4, handedness);

			this._assignCapFunctions();
			this._assignConnectFunctions();
			this._assignNoteFunctions();
			this._assignBlockFunctions();
		}

		_assignCapFunctions() {
			this.renderBar = this.renderBar.bind(this);
			this.renderBox = this.renderBox.bind(this);

			this.agentCap.cross.render = this.renderCross.bind(this);
			this.agentCap.bar.render = this.renderBar;
			this.agentCap.box.boxRenderer = this.renderBox;
		}

		_assignConnectFunctions() {
			this.renderArrowHead = this.renderArrowHead.bind(this);
			this.renderFlatConnector = this.renderFlatConnector.bind(this);
			this.renderRevConnector = this.renderRevConnector.bind(this);

			this.connect.arrow.single.render = this.renderArrowHead;
			this.connect.arrow.double.render = this.renderArrowHead;

			this.connect.line.solid.renderFlat = this.renderFlatConnector;
			this.connect.line.solid.renderRev = this.renderRevConnector;
			this.connect.line.dash.renderFlat = this.renderFlatConnector;
			this.connect.line.dash.renderRev = this.renderRevConnector;
			this.connect.line.wave.renderFlat =
				this.renderFlatConnectorWave.bind(this);
			this.connect.line.wave.renderRev =
				this.renderRevConnectorWave.bind(this);
		}

		_assignNoteFunctions() {
			this.notes.note.boxRenderer = this.renderNote.bind(this);
			this.notes.state.boxRenderer = this.renderState.bind(this);
		}

		_assignBlockFunctions() {
			this.renderTag = this.renderTag.bind(this);

			this.blocks.ref.boxRenderer = this.renderRefBlock.bind(this);
			this.blocks[''].boxRenderer = this.renderBlock.bind(this);
			this.blocks.ref.section.mode.boxRenderer = this.renderTag;
			this.blocks[''].section.mode.boxRenderer = this.renderTag;
			this.blocks[''].sepRenderer = this.renderSeparator.bind(this);
		}

		reset() {
			this.random.reset();
		}

		addDefs(builder) {
			builder('sketch_font', () => {
				const style = document.createElement('style');
				// For some uses, it is fine to load this font externally,
				// but this fails when exporting as SVG / PNG (svg tags must
				// have no external dependencies).
//				const url = 'https://fonts.googleapis.com/css?family=' + FONT;
//				style.innerText = '@import url("' + url + '")';
				style.innerText = (
					'@font-face{' +
					'font-family:"' + Handlee.name + '";' +
					'src:url("data:font/woff2;base64,' + Handlee.woff2 + '");' +
					'}'
				);
				return style;
			});
		}

		vary(range, centre = 0) {
			if(!range) {
				return centre;
			}
			// cosine distribution [-pi/2 pi/2] scaled to [-range range]
			// int(cos(x))dx = sin(x)
			// from -pi/2: sin(x) - sin(-pi/2) = sin(x) + 1
			// total: sin(pi/2) + 1 = 2
			// normalise to area 1: /2
			// (sin(x) + 1) / 2
			// inverse: p = (sin(x) + 1) / 2
			// asin(2p - 1) = x
			// normalise range
			// x = asin(2p - 1) * range / (pi/2)
			const rand = this.random.nextFloat(); // [0 1)
			return centre + Math.asin(rand * 2 - 1) * 2 * range / Math.PI;
		}

		lineNodes(p1, p2, {
			var1 = 1,
			var2 = 1,
			varX = 1,
			varY = 1,
			move = true,
		}) {
			const length = Math.sqrt(
				(p2.x - p1.x) * (p2.x - p1.x) +
				(p2.y - p1.y) * (p2.y - p1.y)
			);
			const rough = Math.min(Math.sqrt(length) * 0.2, MAX_CHAOS);
			const x1 = this.vary(var1 * varX * rough, p1.x);
			const y1 = this.vary(var1 * varY * rough, p1.y);
			const x2 = this.vary(var2 * varX * rough, p2.x);
			const y2 = this.vary(var2 * varY * rough, p2.y);

			// -1 = p1 higher, 1 = p2 higher
			const upper = Math.max(-1, Math.min(1,
				(y1 - y2) / (Math.abs(x1 - x2) + 0.001)
			));
			const frac = upper / 6 + 0.5;

			// Line curve is to top / left (simulates right-handed drawing)
			// or top / right (left-handed)
			const curveX = this.vary(0.5, 0.5) * rough;
			const curveY = this.vary(0.5, 0.5) * rough;
			const xc = x1 * (1 - frac) + x2 * frac - curveX * this.handedness;
			const yc = y1 * (1 - frac) + y2 * frac - curveY;
			const nodes = (
				(move ? ('M' + x1 + ' ' + y1) : '') +
				'C' + xc + ' ' + yc +
				',' + x2 + ' ' + y2 +
				',' + x2 + ' ' + y2
			);
			return {
				nodes,
				p1: {x: x1, y: y1},
				p2: {x: x2, y: y2},
			};
		}

		renderLine(p1, p2, lineOptions) {
			const line = this.lineNodes(p1, p2, lineOptions);
			const shape = svg.make('path', Object.assign({
				'd': line.nodes,
				'fill': 'none',
				'stroke-dasharray': lineOptions.dash ? '6, 5' : 'none',
			}, lineOptions.thick ? THICK_PENCIL : PENCIL));
			return shape;
		}

		renderBox({x, y, width, height}, {fill = null, thick = false} = {}) {
			const lT = this.lineNodes(
				{x, y},
				{x: x + width, y},
				{}
			);
			const lB = this.lineNodes(
				{x: x + width, y: y + height},
				{x, y: y + height},
				{move: false}
			);
			const lR = this.lineNodes(
				lT.p2,
				lB.p1,
				{var1: 0, var2: 0, move: false}
			);
			const lL = this.lineNodes(
				lB.p2,
				lT.p1,
				{var1: 0, var2: 0.3, move: false}
			);

			const shape = svg.make('path', Object.assign({
				'd': lT.nodes + lR.nodes + lB.nodes + lL.nodes,
				'fill': fill || '#FFFFFF',
			}, thick ? THICK_PENCIL : PENCIL));

			return shape;
		}

		renderNote({x, y, width, height}) {
			const flickSize = 5;
			const lT = this.lineNodes(
				{x, y},
				{x: x + width - flickSize, y},
				{}
			);
			const lF = this.lineNodes(
				lT.p2,
				{x: x + width, y: y + flickSize},
				{move: false, var1: 0}
			);
			const lB = this.lineNodes(
				{x: x + width, y: y + height},
				{x, y: y + height},
				{move: false}
			);
			const lR = this.lineNodes(
				lF.p2,
				lB.p1,
				{var1: 0, var2: 0, move: false}
			);
			const lL = this.lineNodes(
				lB.p2,
				lT.p1,
				{var1: 0, var2: 0.3, move: false}
			);
			const lF1 = this.lineNodes(
				lF.p1,
				{x: x + width - flickSize, y: y + flickSize},
				{var1: 0.3}
			);
			const lF2 = this.lineNodes(
				lF1.p2,
				lF.p2,
				{var1: 0, move: false}
			);

			const g = svg.make('g');
			g.appendChild(svg.make('path', Object.assign({
				'd': (
					lT.nodes +
					lF.nodes +
					lR.nodes +
					lB.nodes +
					lL.nodes
				),
				'fill': '#FFFFFF',
			}, PENCIL)));
			g.appendChild(svg.make('path', Object.assign({
				'd': lF1.nodes + lF2.nodes,
				'fill': 'none',
			}, PENCIL)));

			return g;
		}

		renderFlatConnector(attrs, {x1, dx1, x2, dx2, y}) {
			const ln = this.lineNodes(
				{x: x1 + dx1, y},
				{x: x2 + dx2, y},
				{varX: 0.3}
			);
			return {
				shape: svg.make('path', Object.assign({'d': ln.nodes}, attrs)),
				p1: {x: ln.p1.x - dx1, y: ln.p2.y},
				p2: {x: ln.p2.x - dx2, y: ln.p2.y},
			};
		}

		renderRevConnector(attrs, {xL, dx1, dx2, y1, y2, xR}) {
			const variance = Math.min((xR - xL) * 0.06, 3);
			const overshoot = Math.min((xR - xL) * 0.5, 6);
			const p1x = xL + dx1 + this.vary(variance, -1);
			const p1y = y1 + this.vary(variance, -1);
			const b1x = xR - overshoot * this.vary(0.2, 1);
			const b1y = y1 - this.vary(1, 2);
			const p2x = xR;
			const p2y = y1 + this.vary(1, 1);
			const b2x = xR;
			const b2y = y2 + this.vary(2);
			const p3x = xL + dx2 + this.vary(variance, -1);
			const p3y = y2 + this.vary(variance, -1);

			return {
				shape: svg.make('path', Object.assign({
					d: (
						'M' + p1x + ' ' + p1y +
						'C' + p1x + ' ' + p1y +
						',' + b1x + ' ' + b1y +
						',' + p2x + ' ' + p2y +
						'S' + b2x + ' ' + b2y +
						',' + p3x + ' ' + p3y
					),
				}, attrs)),
				p1: {x: p1x - dx1, y: p1y},
				p2: {x: p3x - dx2, y: p3y},
			};
		}

		renderFlatConnectorWave(attrs, {x1, dx1, x2, dx2, y}) {
			const x1v = x1 + this.vary(0.3);
			const x2v = x2 + this.vary(0.3);
			const y1v = y + this.vary(1);
			const y2v = y + this.vary(1);
			return {
				shape: svg.make('path', Object.assign({
					d: new SVGShapes.PatternedLine(this.wave)
						.move(x1v + dx1, y1v)
						.line(x2v + dx2, y2v)
						.cap()
						.asPath(),
				}, attrs)),
				p1: {x: x1v, y: y1v},
				p2: {x: x2v, y: y2v},
			};
		}

		renderRevConnectorWave(attrs, {xL, dx1, dx2, y1, y2, xR}) {
			const x1v = xL + this.vary(0.3);
			const x2v = xL + this.vary(0.3);
			const y1v = y1 + this.vary(1);
			const y2v = y2 + this.vary(1);
			return {
				shape: svg.make('path', Object.assign({
					d: new SVGShapes.PatternedLine(this.wave)
						.move(x1v + dx1, y1v)
						.line(xR, y1)
						.arc(xR, (y1 + y2) / 2, Math.PI)
						.line(x2v + dx2, y2v)
						.cap()
						.asPath(),
				}, attrs)),
				p1: {x: x1v, y: y1v},
				p2: {x: x2v, y: y2v},
			};
		}

		renderArrowHead(attrs, {x, y, dx, dy}) {
			const w = dx * this.vary(0.2, 1);
			const h = dy * this.vary(0.3, 1);
			const l1 = this.lineNodes(
				{x: x + w, y: y - h},
				{x, y},
				{var1: 2.0, var2: 0.2}
			);
			const l2 = this.lineNodes(
				l1.p2,
				{x: x + w, y: y + h},
				{var1: 0, var2: 2.0, move: false}
			);
			const l3 = (attrs.fill === 'none') ? {nodes: ''} : this.lineNodes(
				l2.p2,
				l1.p1,
				{var1: 0, var2: 0, move: false}
			);
			return svg.make('path', Object.assign({
				'd': l1.nodes + l2.nodes + l3.nodes,
			}, attrs));
		}

		renderState({x, y, width, height}) {
			const dx = Math.min(width * 0.06, 3);
			const dy = Math.min(height * 0.06, 3);
			const tlX = x + dx * this.vary(0.6, 1);
			const tlY = y + dy * this.vary(0.6, 1);
			const trX = x + width - dx * this.vary(0.6, 1);
			const trY = y + dy * this.vary(0.6, 1);
			const blX = x + dx * this.vary(0.6, 1);
			const blY = y + height - dy * this.vary(0.6, 1);
			const brX = x + width - dx * this.vary(0.6, 1);
			const brY = y + height - dy * this.vary(0.6, 1);
			const mX = x + width / 2;
			const mY = y + height / 2;
			const cx = dx * this.vary(0.2, 1.2);
			const cy = dy * this.vary(0.2, 1.2);
			const bentT = y - Math.min(width * 0.005, 1);
			const bentB = y + height - Math.min(width * 0.01, 2);
			const bentL = x - Math.min(height * 0.01, 2) * this.handedness;
			const bentR = bentL + width;

			return svg.make('path', Object.assign({
				'd': (
					'M' + tlX + ' ' + tlY +
					'C' + (tlX + cx) + ' ' + (tlY - cy) +
					',' + (mX - width * this.vary(0.03, 0.3)) + ' ' + bentT +
					',' + mX + ' ' + bentT +
					'S' + (trX - cx) + ' ' + (trY - cy) +
					',' + trX + ' ' + trY +
					'S' + bentR + ' ' + (mY - height * this.vary(0.03, 0.3)) +
					',' + bentR + ' ' + mY +
					'S' + (brX + cx) + ' ' + (brY - cy) +
					',' + brX + ' ' + brY +
					'S' + (mX + width * this.vary(0.03, 0.3)) + ' ' + bentB +
					',' + mX + ' ' + bentB +
					'S' + (blX + cx) + ' ' + (blY + cy) +
					',' + blX + ' ' + blY +
					'S' + bentL + ' ' + (mY + height * this.vary(0.03, 0.3)) +
					',' + bentL + ' ' + mY +
					'S' + (tlX - cx) + ' ' + (tlY + cy) +
					',' + tlX + ' ' + tlY +
					'Z'
				),
				'fill': '#FFFFFF',
			}, PENCIL));
		}

		renderRefBlock({x, y, width, height}) {
			return this.renderBox(
				{x, y, width, height},
				{fill: '#FFFFFF', thick: true}
			);
		}

		renderBlock({x, y, width, height}) {
			return this.renderBox(
				{x, y, width, height},
				{fill: 'none', thick: true}
			);
		}

		renderTag({x, y, width, height}) {
			const x2 = x + width;
			const y2 = y + height;

			const l1 = this.lineNodes(
				{x: x2 + 3, y},
				{x: x2 - 2, y: y2},
				{}
			);
			const l2 = this.lineNodes(
				l1.p2,
				{x, y: y2 + 1},
				{var1: 0, move: false}
			);

			const line = l1.nodes + l2.nodes;

			const g = svg.make('g');

			g.appendChild(svg.make('path', {
				'd': line + 'L' + x + ' ' + y,
				'fill': '#FFFFFF',
			}));

			g.appendChild(svg.make('path', Object.assign({
				'd': line,
				'fill': '#FFFFFF',
			}, PENCIL)));

			return g;
		}

		renderSeparator({x1, y1, x2, y2}) {
			return this.renderLine(
				{x: x1, y: y1},
				{x: x2, y: y2},
				{thick: true, dash: true}
			);
		}

		renderBar({x, y, width, height}) {
			return this.renderBox({x, y, width, height}, {fill: '#000000'});
		}

		renderCross({x, y, radius}) {
			const r1 = this.vary(0.2, 1) * radius;
			const l1 = this.lineNodes(
				{x: x - r1, y: y - r1},
				{x: x + r1, y: y + r1},
				{}
			);
			const r2 = this.vary(0.2, 1) * radius;
			const l2 = this.lineNodes(
				{x: x + r2, y: y - r2},
				{x: x - r2, y: y + r2},
				{}
			);

			return svg.make('path', Object.assign({
				'd': l1.nodes + l2.nodes,
				'fill': 'none',
			}, PENCIL));
		}

		renderAgentLine({x, y0, y1, width, className}) {
			if(width > 0) {
				const shape = this.renderBox({
					x: x - width / 2,
					y: y0,
					width,
					height: y1 - y0,
				}, {fill: 'none'});
				shape.setAttribute('class', className);
				return shape;
			} else {
				const shape = this.renderLine(
					{x, y: y0},
					{x, y: y1},
					{varY: 0.3}
				);
				shape.setAttribute('class', className);
				return shape;
			}
		}
	}

	SketchTheme.RIGHT = RIGHT;
	SketchTheme.LEFT = LEFT;

	return SketchTheme;
});

/* jshint -W072 */ // Allow several required modules
define('sequence/SequenceDiagram',[
	'core/EventObject',
	'./Parser',
	'./Generator',
	'./Renderer',
	'./Exporter',
	'./themes/BaseTheme',
	'./themes/Basic',
	'./themes/Chunky',
	'./themes/Sketch',
], (
	EventObject,
	Parser,
	Generator,
	Renderer,
	Exporter,
	BaseTheme,
	BasicTheme,
	ChunkyTheme,
	SketchTheme
) => {
	/* jshint +W072 */
	'use strict';

	const themes = [
		new BasicTheme(),
		new ChunkyTheme(),
		new SketchTheme(SketchTheme.RIGHT),
		new SketchTheme(SketchTheme.LEFT),
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
		BaseTheme,
		themes,
		addTheme,
		registerCodeMirrorMode,
		convert,
		convertAll,
	});
});

requirejs(['sequence/SequenceDiagram'], (SequenceDiagram) => {
	'use strict';

	const def = window.define;
	if(def && def.amd) {
		def(() => {
			return SequenceDiagram;
		});
		return;
	}

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