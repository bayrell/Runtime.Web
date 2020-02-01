"use strict;"
/*!
 *  Bayrell Core Library
 *
 *  (c) Copyright 2018-2019 "Ildar Bikmamatov" <support@bayrell.org>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

if (typeof Runtime == 'undefined') Runtime = {};
if (typeof Runtime.Web == 'undefined') Runtime.Web = {};
if (typeof Runtime.Web.Drivers == 'undefined') Runtime.Web.Drivers = {};
var use = (typeof Runtime != 'undefined' && typeof Runtime.rtl != 'undefined') ? Runtime.rtl.find_class : null;


/**
 * Change model detector
 */
Runtime.CoreStruct.prototype.initData = function (old_model, changed)
{
	if (changed == undefined) changed=null;
	
	/*
	if (old_model != null)
	{
		console.log(old_model);
		console.log(changed);
	}
	*/
}


/**
 * Control object
 */
Runtime.Web.Drivers.Control = function()
{
	this.component = null;
	this.driver = null;
	this.model = null;
	this.parent = null;
	this.path = null;
	this.index = 0;
}
Object.assign(Runtime.Web.Drivers.Control.prototype,
{
	copy: function(obj)
	{
		var item = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
		item = Object.assign(item, obj);
		return item;
	}
});


/**
 * Render driver
 */
Runtime.Web.Drivers.RenderDriver = function()
{
	this.remove_keys = [];
	this.animation_id = null;
	this.layout_model = null;
	this.root_elem = null;
	this.components = {};
	this.context = null;
}
Object.assign(Runtime.Web.Drivers.RenderDriver.prototype,
{
	
	onModelUpdate: function(ctx, key, model)
	{
		this.layout_model = model;
		this.repaint();
	},
	
	repaint: function()
	{
		if (this.animation_id == null)
		{
			this.animation_id = requestAnimationFrame( this._repaint.bind(this) );
		}
	},
	
	_repaint: function()
	{
		this.animation_id = null;
		this.remove_keys = [];
		
		var control = new Runtime.Web.Drivers.Control();
		control.driver = this;
		control.component = this;
		control.parent = this.root_elem;
		control.path = "";
		var childs = Runtime.Web.Drivers.RenderDriver.component
		(
			this.layout_model,
			this.layout_model.layout_class,
			{"@model":this.layout_model,"@key":""},
			null,
			control,
			0
		);
		childs = this.constructor.normalizeChilds(childs);
		this.constructor.patchElemChilds(this.root_elem, childs, this);
	},
	
	findComponent: function(path, class_name)
	{
		if (this.components[path] == undefined) return null;
		if (this.components[path].getClassName() == class_name) return null;
		return this.components[path];
	},
	saveComponent: function(component)
	{
		this.components[component.path] = component;
	},
	
});
Object.assign(Runtime.Web.Drivers.RenderDriver,
{
	getCurrentNamespace: function()
	{
		return "Runtime.Web.Drivers";
	},
	getCurrentClassName: function()
	{
		return "Runtime.Web.Drivers.RenderDriver";
	},
	getParentClassName: function()
	{
		return "";
	},
	
	
	
	/**
	 * Warning
	 */
	warning: function()
	{
		var arr = Array.apply(null, arguments);
		arr.unshift("[Warning]");
		console.log.apply(null, arr);
	},
	
	
	
	/**
	 * Returns true if is elem
	 */
	isElem(o)
	{
		if (o instanceof HTMLElement || o instanceof Node) return true;
		return false;
	},
	
	
	
	/**
	 * Return HTML elems from string
	 */
	createElementFromHTML(s)
	{
		var res = [];
		var e = document.createElement('div');
		e.innerHTML = s.trim();
		for (var i = 0; i < e.childNodes.length; i++) res.push( e.childNodes[i] );
		return res;
	},
	
	
	
	/**
	 * Decode html entities
	 */
	decodeHtmlEntities(s)
	{
		var e = document.createElement('textarea');
		e.innerHTML = s;
		return e.value;
	},
	
	
	
	/**
	 * Patch DOM with new childs
	 */
	patchElemChilds(parent_elem, new_childs, driver)
	{
		if (new_childs == null) new_childs = [];
		
		var findElementPos = function (elem, e)
		{
			var childs = elem.childNodes;
			for (var i = 0; i < elem.childNodes.length; i++)
			{
				if (childs[i] == e)
				{
					return i;
				}
			}
			return -1;
		}
		
		var insertFirst = function (elem, e)
		{
			if (elem.childNodes.length == 0)
			{
				elem.appendChild(e);
			}
			else
			{
				elem.insertBefore(e, elem.firstChild);
			}
		}
		
		var insertAfter = function (elem, prev, e)
		{
			if (prev == null)
			{
				insertFirst(elem, e);
				return;
			}
			var next = prev.nextSibling;
			if (next == null)
			{
				elem.appendChild(e);
			}
			else
			{
				elem.insertBefore(e, next);
			}
		}
		
		
		/* Remove elems */
		var i = parent_elem.childNodes.length - 1;
		while (i >= 0)
		{
			var e = parent_elem.childNodes[i];
			if (new_childs.indexOf(e) == -1)
			{
				parent_elem.removeChild(e);
				driver.remove_keys.push(e._key);
				/* console.log('Remove child ', i); */
			}
			i--;
		}
		
		
		var prevElem = null;
		for (var i=0; i<new_childs.length; i++)
		{
			var new_e = new_childs[i];
			if (typeof new_e == "string")
			{
				new_e = document.createTextNode(new_e);
			}
			
			var pos = findElementPos(parent_elem, new_e);
			var flag = false;
			
			/* If new element */
			if (pos == -1)
			{
				if (prevElem == null)
				{
					insertFirst(parent_elem, new_e);
					flag = true;
					/* console.log('Insert first ', i); */
				}
				else
				{
					insertAfter(parent_elem, prevElem, new_e);
					flag = true;
					/* console.log('Insert after[1] ', i); */
				}
			}
			
			/* If existing element */
			else
			{
				if (pos - 1 < 0)
				{
					if (i != 0)
					{
						insertAfter(parent_elem, prevElem, new_e);
						flag = true;
						/* console.log('Insert after[2] ', i); */
					}
				}
				else
				{
					var prevSibling = parent_elem.childNodes[pos - 1];
					if (prevElem != prevSibling)
					{
						insertAfter(parent_elem, prevElem, new_e);
						flag = true;
						/* console.log('Insert after[3] ', i); */
					}
				}
			}
			
			if (flag)
			{
				var index = driver.remove_keys.indexOf(new_e._key);
				if (index != -1)
					driver.remove_keys.splice(index, 1);
			}
			
			prevElem = new_e;
		}
	},
	
	
	
	/**
	 * Normalize childs
	 */
	_normalizeChilds: function(res, childs)
	{
		for (var i=0; i<childs.length; i++)
		{
			var item = childs[i];
			if (item instanceof Array)
			{
				res = this._normalizeChilds(res, item);
			}
			else
			{
				res.push(item);
			}
		}
		return res;
	},
	
	
	
	/**
	 * Normalize childs
	 */
	normalizeChilds: function(childs)
	{
		var res = [];
		res = this._normalizeChilds(res, childs);
		return res;
	},
	
	
	
	/**
	 * Returns true if elements is different
	 */
	isElemDiff: function(e1, e2)
	{
		if (e1 instanceof Text && e2 instanceof Text)
		{
			if (e1.textContent != e2.textContent)
			{
				/* console.log("Change", e1.textContent, e2.textContent); */
				return true;
			}
		}
		else if (
			e1 instanceof Text && !(e2 instanceof Text) || 
			e2 instanceof Text && !(e1 instanceof Text)
		)
		{
			return true;
		}
		else if (e1 != e2)
		{
			return true;
		}
		
		return false;
	},
	
	
	
	/**
	 * isChildsDiff
	 */
	isChildsDiff: function(parent_elem, childs)
	{
		if (childs.length != parent_elem.childNodes.length) return true;
		for (var i=0; i<parent_elem.childNodes.length; i++)
		{
			var e1 = parent_elem.childNodes[i];
			var e2 = childs[i];
			if (this.isElemDiff(e1, e2))
			{
				return true;
			}
		}
		
		return false;
	},
	
	
	
	/**
	 * Returns elem by index
	 */
	getElemChild: function(parent_elem, index)
	{
		if (index < 0 || index >= parent_elem.childNodes.length) return null;
		return parent_elem.childNodes[index];
	},
	
	
	
	/**
	 * Find elem pos by virtual path
	 */
	findElemPosByPath: function(parent_elem, path)
	{
		for (var i = 0; i < parent_elem.childNodes.length; i++)
		{
			if (parent_elem.childNodes[i]._vpath == path)
			{
				return i;
			}
		}
		return -1;
	},
	
	
	
	/**
	 * Find elem by virtual path
	 */
	findElemByPath: function(parent_elem, vpath, kind)
	{
		var pos = this.findElemPosByPath(parent_elem, vpath);
		return this.getElemChild(parent_elem, pos);
	},
	
	
	
	/**
	 * Build Virtual Path
	 */
	buildPath: function(control, params, index)
	{
		var vkey = "";
		if (params != null)
		{
			if (params["@key"] != undefined) vkey = params["@key"];
		}
		if (vkey == "")
		{
			vkey = "" + control.index;
			control.index++;
		}
		var path = control.path;
		return path + ((path != "") ? "." : "") + vkey;
	},
	
	
	
	/**
	 * Update elem params
	 */
	updateElemParams: function(elem, params, control, is_new_elem)
	{
		var is_input = ["INPUT", "SELECT"].indexOf(elem.tagName) >= 0;
		var model = control.model;
		var driver = control.driver;
		var component = control.component;
		
		/* Set path */
		var path = control.path;
		elem.setAttribute("data-vpath", path);
		
		/* Set attrs */
		if (params != null)
		{		
			for (var key in params)
			{
				var value = params[key];
				if (is_input && (key == "value" || key == "@model"))
				{
					elem.value = value;
					continue;
				}
				if (is_input && key == "@bind")
				{
					elem.value = model[value];
					continue;
				}
				if (key[0] == "@") continue;
				elem.setAttribute(key, value);
			}
			
			/* Bind element events */
			if (is_new_elem)
			{
				for (var key in params)
				{
					var value = params[key];
					var is_event = key.substring(0, 7) == "@event:";
					var is_event_async = key.substring(0, 12) == "@eventAsync:";
					if (key == "@bind")
					{
						var f = function (driver, elem, value, component)
						{ 
							return function (e) 
							{
								d = {}; d[value] = elem.value;
								component.updateModel(driver.context, Runtime.Dict.from(d));
							}
						};
						elem.addEventListener
						(
							"change",
							f(driver, elem, value, component)
						);
					}
					else if (is_event || is_event_async)
					{
						var event_name = "";
						if (is_event) event_name = key.substring(7);
						if (is_event_async) event_name = key.substring(12);
						
						var event_class = use(event_name);
						if (event_class == undefined) continue
						
						var es6_name = event_class.ES6_EVENT_NAME;
						if (es6_name == undefined) continue;
						
						var is_async = is_event_async && !is_event;
						var f = function (driver, elem, value, component, is_async)
						{ 
							return function (e) 
							{
								var f = component[value];
								if (f == undefined)
								{
									driver.constructor.warning(value + " not found in ", component);
									return;
								}
								f = f.bind(component);
								var event = Runtime.Web.Events.User.UserEvent.fromEvent(driver.context, e);
								if (is_async)
								{
									Runtime.rtl.applyAwait(driver.context, f, [event]);
								}
								else
								{
									f(driver.context, event);
								}
							}
						};
						
						elem.addEventListener
						(
							es6_name,
							f(driver, elem, value, component, is_async)
						);
					}
				}
			}
		}
	},
	
	
	
	/**
	 * Update elem content
	 */	
	updateElemContent: function(elem, childs, control)
	{
		/* Component content */
		if (childs != null)
		{
			childs = this.normalizeChilds(childs);
		}
		
		/* Patch element */
		this.patchElemChilds(elem, childs, control.driver);
	},
	
	
	
	/**
	 * Render text
	 */
	text: function(layout, content, control)
	{
		var parent_elem = control.parent;
		
		/* Render content */
		if (typeof content == "function") content = content(control);
		if (this.isElem(content)) return content;
		if (content instanceof Array) return content;
		
		/* To string */
		content = Runtime.rtl.toStr(content);
		content = this.decodeHtmlEntities(content);
		
		/* Select element */
		var elem_path = this.buildPath(control, null);
		/*var new_control = control.copy({ "path": elem_path });*/
		var elem_new = this.findElemByPath(parent_elem, elem_path, "elem");		
		
		/* Check element */
		if (elem_new != null)
		{
			if (elem_new.tagName != undefined) elem_new = null;
		}
		
		/* Create new element */
		if (elem_new == null)
		{
			elem_new = document.createTextNode(content);
		}
		else
		{
			if (elem_new.nodeValue != content) elem_new.nodeValue = content;
		}
		
		/* Set elem path */
		elem_new._vpath = elem_path;
		
		return elem_new;
	},
	
	
	
	/**
	 * Render raw text
	 */
	raw: function(layout, content, control)
	{
		var parent_elem = control.parent;
		var elem_path = this.buildPath(control, null);
		
		/* Render content */
		if (typeof content == "function") content = content(control);
		if (this.isElem(content)) return content;
		if (content instanceof Array) return content;
		
		return this.createElementFromHTML( Runtime.rtl.toStr(content) );
	},
	
	
	
	/**
	 * Render elem
	 */
	elem: function(layout, name, params, content, control)
	{
		var parent_elem = control.parent;
		var elem_path = this.buildPath(control, params);
		var elem_new = this.findElemByPath(parent_elem, elem_path, "elem");
		var is_new_elem = false;
		
		/* Check element */
		if (elem_new != null)
		{
			if (elem_new.tagName == undefined) elem_new = null;
		}
		
		/* Create new element */
		if (elem_new == null)
		{
			elem_new = document.createElement(name);
			is_new_elem = true;
		}
		
		/* Set new control */
		var new_control = control.copy({"path": elem_path, "parent": elem_new, "index": 0});
		
		/* Render content */
		if (typeof content == "function") content = content(new_control);
		
		/* Update element params */
		this.updateElemParams(elem_new, params, new_control, is_new_elem);
		
		/* Update element params */
		this.updateElemContent(elem_new, content, new_control, is_new_elem);
		
		/* Set elem path */
		elem_new._vpath = elem_path;
		
		return elem_new;
	},
	
	
	
	/**
	 * Render component
	 */
	component: function(layout, name, params, content, control)
	{
		var e = null;
		var driver = control.driver;
		var parent_component = control.component;
		var model = null;
		var model_bind_name = "";
		
		if (params != null && params["@model"] != undefined)
		{
			model = params["@model"];
		}
		if (params != null && params["@bind"] != undefined)
		{
			/*if (model != null) model = control.model;*/
			model_bind_name = params["@bind"];
			if (model == null) model = model[model_bind_name];
		}
		
		var class_obj = use(name);
		if (class_obj == undefined)
		{
			throw new Error("Component " + name + " not found");
		}
		
		var component_path = this.buildPath(control, params);
		var component = driver.findComponent(component_path, name);
		if (component == null)
		{
			component = new class_obj();
			component.path = component_path;
			component.driver = driver;
			driver.saveComponent(component);
		}
		
		/* Set new model */
		component.driverSetParams(driver.context, params);
		component.driverSetNewModel(driver.context, model, model_bind_name);
		component.parent_component = parent_component;
		
		/* Set new control */
		var new_control = control.copy({
			"index": 0,
			"path": component_path,
			"component": component,
			"model": model,
		});
		
		/* Render component */
		var render = class_obj.render.bind(class_obj);
		var res = render(driver.context, layout, model, Runtime.Dict.from(params), content, new_control);
		
		/* Call result */
		if (res != null && typeof res == "function") res = res(new_control);
		
		/* Result */
		return res;
	},
	
	
	
	/**
	 * Run driver
	 */
	run: function(context, selector, layout_model)
	{
		var driver = new Runtime.Web.Drivers.RenderDriver();
		driver.context = context;
		driver.layout_model = layout_model;
		driver.root_elem = document.querySelector(selector);
		driver.repaint();
		return driver;
	}
});


try
{
	var layout_model = Runtime.RuntimeUtils.base64_decode_url
	(
		null, document.getElementById('layout_model').value
	);
	layout_model = Runtime.RuntimeUtils.json_decode(null, layout_model);
	window['layout_model'] = layout_model;
	global_context = Runtime.Context.create
	(
		null,
		layout_model.frontend_env,
		[
			new Runtime.Annotations.Provider
			(
				null,
				{
					"name": Runtime.RuntimeConstant.BUS_INTERFACE,
					"value": "Runtime.Web.Drivers.BusProvider",
				}
			)
		]
	);
	global_context = global_context.copy
	(
		null,
		Runtime.Dict.from({
			"modules": layout_model.frontend_modules,
			"settings": layout_model.frontend_settings,
		})
	);
	Runtime.RuntimeUtils.setContext(global_context);
	global_context = global_context.constructor.init(global_context, global_context);
	/* global_context = global_context.constructor.start(global_context, global_context); */
	window['global_context'] = global_context;	
	window['RenderDriver'] = Runtime.Web.Drivers.RenderDriver.run
	(
		global_context,
		'#frontend_root',
		layout_model
	);
}
catch (ex)
{
	console.log(ex.stack);
}