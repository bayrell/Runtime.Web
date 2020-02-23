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
	this.type = "";
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
		var res = this.constructor.insert
		(
			control, [],
			"component",
			{
				"name": this.layout_model.layout_class,
				"attrs": {"@model":this.layout_model,"@key":""},
			},
			0
		);		
		this.constructor.patch(control, res[1]);
		
		/* TODO this.remove_keys */
	},
	
	findComponent: function(path, class_name)
	{
		if (this.components[path] == undefined) return null;
		if (this.components[path].getClassName() != class_name) return null;
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
	 * Find elem by virtual path and check
	 */
	findElemByPathAndCheck: function(parent_elem, vpath, kind)
	{
		var pos = this.findElemPosByPath(parent_elem, vpath);
		var elem_new = this.getElemChild(parent_elem, pos);
		
		/* Check element */
		if (elem_new != null)
		{
			if (kind == "element")
			{
				if (elem_new.tagName == undefined) elem_new = null;
			}
		}
		
		return elem_new;
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
			vkey = "" + index;
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
		elem.params = Runtime.Dict.from(params);
		elem._attrs = params;
		elem._component = component;
		elem._vpath = path;			
		
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
			
			/* Set reference */
			if (params["@ref"] != undefined)
			{
				var ref = params["@ref"];
				component[ref] = elem;
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
						
						console.log
						(
							"addEventListener",
							elem, params
						);
						
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
	 * Normalize content
	 */
	normalizeContent: function(content, control)
	{
		if (content == null) return null;
		if (typeof content == "function" || content instanceof Function) content = content(control);
		if (this.isElem(content)) return content;
		if (content instanceof Array)
		{
			var new_content = [];
			for (var i=0; i<content.length; i++)
			{
				var item = this.normalizeContent(content[i], control);
				new_content.push(item);
			}
			
			var res = [];
			this._normalizeChilds(res, new_content);
			
			return res;
		}
		
		return content;
	},
	
	
	
	/**
	 * Insert element
	 */
	insert: function (control, childs, type, obj, index)
	{
		var new_control = null;
		var parent_elem = control.parent;
		var name = (obj != null) ? obj.name : "";
		var attrs = (obj != null && obj.attrs != null && obj.attrs != undefined) ? obj.attrs : null;
		var content = (obj != null && obj.content != null && obj.content != undefined) ? obj.content : null;
		var path = this.buildPath(control, attrs, index);
		var driver = control.driver;
		
		if (type == 'component')
		{
			var model = null;
			var model_bind_name = "";
			
			/* Find class */
			var class_obj = use(name);
			if (class_obj == undefined)
			{
				throw new Error("Component " + name + " not found");
			}
			
			/* Find component */
			var component = driver.findComponent(path, name);
			if (component == null)
			{
				/* Create component */
				component = new class_obj();
				component.path = path;
				component.driver = driver;
				driver.saveComponent(component);
			}
			
			/* Find model */
			if (attrs != null && attrs["@model"] != undefined)
			{
				model = attrs["@model"];
			}
			if (attrs != null && attrs["@bind"] != undefined)
			{
				model_bind_name = attrs["@bind"];
				if (model == null) model = model[model_bind_name];
			}
			
			/* Set new model */
			component.driverSetParams(driver.context, attrs);
			component.driverSetNewModel(driver.context, model, model_bind_name);
			component.parent_component = control.component;
			
			/* Set reference */
			if (attrs != null && attrs["@ref"] != undefined)
			{
				var ref = attrs["@ref"];
				component.parent_component[ref] = component;
			}
			
			/* Create new control */
			new_control = control.copy({
				"type": type,
				"index": index,
				"path": path,
				"component": component,
				"model": model,
			});
			
			/* Render component */
			var render = class_obj.render.bind(class_obj);
			var res = render(driver.context, obj.layout, model, Runtime.Dict.from(attrs), content);
			
			/* Call result */
			if (res != null && typeof res == "function") res = res(new_control);
			
			/* Normalize content */
			res = this.normalizeContent(res, new_control);
			
			/* Add childs */
			childs = childs.slice();
			childs.push(res);
		}
		
		else if (type == 'element')
		{
			var elem_new = this.findElemByPathAndCheck(parent_elem, path, type);
			var is_new_elem = false;
			
			/* Create new element */
			if (elem_new == null)
			{
				elem_new = document.createElement(name);
				is_new_elem = true;
			}
			
			/* Create new control */
			new_control = control.copy({
				"type": type,
				"index": index,
				"path": path,
				"parent": elem_new,
				"childs": [],
			});
			
			/* Update element params */
			this.updateElemParams(elem_new, attrs, new_control, is_new_elem);
			
			/* Add childs */
			childs = childs.slice();
			childs.push(elem_new);
		}
		
		else if (this.isElem(content))
		{
			childs = childs.slice();
			childs.push(content);
		}
		else if (content instanceof Array)
		{
			childs = childs.slice();
			childs.push(content);
		}
		else if (typeof content == "function" || content instanceof Function)
		{
			childs = childs.slice();
			childs.push(content);
		}
		
		else if (type == 'raw')
		{
			/* To string */
			content = Runtime.rtl.toStr(content);
			
			/* Create new element */
			var elem_new = this.createElementFromHTML(content);
			
			/* Add childs */
			childs = childs.slice();
			childs.push(elem_new);
		}
		
		else if (type == 'text')
		{
			/* To string */
			content = Runtime.rtl.toStr(content);
			content = this.decodeHtmlEntities(content);
			
			var elem_new = this.findElemByPathAndCheck(parent_elem, path, type);
			
			/* Create new element */
			if (elem_new == null)
			{
				elem_new = document.createTextNode(content);
			}
			else
			{
				if (elem_new.nodeValue != content)
				{
					elem_new.nodeValue = content;
				}
			}
			
			/* Set elem path */
			elem_new._vpath = path;
			
			/* Add childs */
			childs = childs.slice();
			childs.push(elem_new);
		}
		
		else if (type == 'html')
		{
			
		}
		
		return [new_control, childs];
	},
	
	
	
	/**
	 * Patch childs of the control
	 */
	patch: function (control, childs)
	{
		/* Normalize content */
		var childs = this.normalizeContent(childs, control);
		
		/* Patch element */
		this.patchElemChilds(control.parent, childs, control.driver);		
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
	window['RenderDriverInstance'] = Runtime.Web.Drivers.RenderDriver.run
	(
		global_context,
		'#frontend_root',
		layout_model
	);
	window['RenderDriver'] = Runtime.Web.Drivers.RenderDriver;
}
catch (ex)
{
	console.log(ex.stack);
}